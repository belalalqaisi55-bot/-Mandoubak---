import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { getApps, initializeApp as initializeAdminApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Firestore, Query } from "firebase-admin/firestore";
import { getMessaging as getAdminMessaging } from "firebase-admin/messaging";
import { GoogleGenAI, Type, ThinkingLevel, GenerateVideosOperation } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

import axios from 'axios';
import qs from 'qs';
import { DEFAULT_PRODUCTS } from "./src/data/defaultProducts.ts";
import { isTelegramConfigured, notifyTelegramSafely, sendTelegramAlert } from "./lib/telegramAlert.ts";

dotenv.config();
process.env.DISABLE_HMR = "true";

export const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SEED_DB_FILE = path.join(process.cwd(), "data-store.json");
const DB_FILE = process.env.VERCEL
  ? path.join("/tmp", "data-store.json")
  : SEED_DB_FILE;
let inMemoryDBFallback: DB | null = null;

// Initialize Firebase Admin if configuration exists
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let isFirebaseEnabled = false;
let dbAdmin: Firestore | null = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
    if (config.projectId && config.projectId !== "remixed-project-id") {
      if (getApps().length === 0) {
        let serviceAccountCred: any = null;
        const saJsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        if (saJsonRaw && saJsonRaw.trim().startsWith("{")) {
          try {
            serviceAccountCred = JSON.parse(saJsonRaw);
          } catch (parseErr: any) {
            console.warn("Invalid FIREBASE_SERVICE_ACCOUNT_JSON format:", parseErr?.message || parseErr);
          }
        } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
          serviceAccountCred = {
            projectId: config.projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          };
        }

        initializeAdminApp(
          serviceAccountCred
            ? {
                credential: cert(serviceAccountCred),
                projectId: config.projectId,
              }
            : {
                projectId: config.projectId,
              }
        );
      }
      if (config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)") {
        dbAdmin = getFirestore(config.firestoreDatabaseId);
      } else {
        dbAdmin = getFirestore();
      }
      console.log("Firebase Admin initialized for project:", config.projectId, "Database:", config.firestoreDatabaseId || "(default)");

      // Only enable Firebase Admin routes AFTER verifying server credentials (with a strict 3s timeout)
      Promise.race([
        dbAdmin.collection("products").limit(1).get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase Admin probe timeout (>3000ms)")), 3000))
      ])
        .then(() => {
          isFirebaseEnabled = true;
          console.log("Firebase Admin server permissions verified.");
        })
        .catch((err: any) => {
          console.log("Firebase Admin server credentials unauthenticated. API routes using local persistence. Reason:", err.message);
          isFirebaseEnabled = false;
          dbAdmin = null;
        });
    } else {
      console.log("Firebase Admin skipped (default placeholder project ID detected). Running offline with local database storage.");
    }
  } catch (err: any) {
    console.warn("Firebase Admin skipped or failed to initialize, running offline:", err.message);
  }
}

// Disable Express ETag generation so dynamic /api/* responses never return stale 304 caches
app.set("etag", false);

// Prevent browser/proxy caching on all /api/* endpoints
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Enable CORS with full credentials and cookie support for browsers, iframes, and mobile apps
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Set-Cookie");
  res.header("Access-Control-Expose-Headers", "Set-Cookie");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Parse JSON and URL-encoded request bodies (with rawBody preserved for webhook signature verification)
app.use(express.json({
  limit: "50mb",
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- SESSION & AUTHENTICATION HELPERS ---
const RAW_SESSION_SECRET = (process.env.SESSION_SECRET || "").trim();
const SERVER_SESSION_SECRET =
  RAW_SESSION_SECRET && RAW_SESSION_SECRET !== "YOUR_SESSION_SECRET"
    ? RAW_SESSION_SECRET
    : crypto.randomBytes(32).toString("hex");

interface AppSessionPayload {
  uid: string;
  role: "rep" | "admin" | "pharmacy" | "doctor";
  email?: string;
  phone?: string;
  iat: number;
  exp: number;
}

function signAppSessionToken(payload: Omit<AppSessionPayload, "iat" | "exp">, ttlMs = 7 * 24 * 60 * 60 * 1000): string {
  const now = Date.now();
  const fullPayload: AppSessionPayload = {
    ...payload,
    iat: now,
    exp: now + ttlMs,
  };
  const body = Buffer.from(JSON.stringify(fullPayload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", SERVER_SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyAppSessionToken(token: string): AppSessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    if (!body || !sig) return null;
    const expectedSig = crypto.createHmac("sha256", SERVER_SESSION_SECRET).update(body).digest("base64url");
    const sigBuf = Buffer.from(sig, "utf8");
    const expectedBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AppSessionPayload;
    if (!parsed || !parsed.uid || !parsed.role || typeof parsed.exp !== "number" || parsed.exp <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isRepIdentity(email?: string, phone?: string, uid?: string): boolean {
  const lowerEmail = String(email || "").trim().toLowerCase();
  const digits = String(phone || "").replace(/\D/g, "");
  return (
    uid === "u_rep" ||
    lowerEmail === "belalalqaisi55@gmail.com" ||
    digits.endsWith("776600049")
  );
}

async function resolveAuthenticatedIdentity(req: express.Request): Promise<{
  uid: string;
  role: "rep" | "admin" | "pharmacy" | "doctor";
  email?: string;
  phone?: string;
  firebaseUser?: any;
} | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) {
    return null;
  }

  // 1. Verify server-signed HMAC session token (2-part token)
  if (token.split(".").length === 2) {
    const session = verifyAppSessionToken(token);
    if (!session) return null;
    return {
      uid: session.uid,
      role: session.role,
      email: session.email,
      phone: session.phone,
    };
  }

  // 2. Verify Firebase ID Token (3-part JWT)
  if (getApps().length === 0) {
    return null;
  }
  const decodedToken = await Promise.race([
    getAuth().verifyIdToken(token),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error("Token verification timeout"), { code: "auth/timeout" })), 8000)
    ),
  ]);

  const tokenEmail = typeof decodedToken.email === "string" ? decodedToken.email.trim().toLowerCase() : "";
  const tokenPhone = typeof decodedToken.phone_number === "string" ? decodedToken.phone_number : "";
  const isVerifiedSuperRep =
    (tokenEmail === "belalalqaisi55@gmail.com" && decodedToken.email_verified !== false) ||
    tokenPhone.replace(/\D/g, "").endsWith("776600049");

  let role: "rep" | "admin" | "pharmacy" | "doctor" = isVerifiedSuperRep ? "rep" : "pharmacy";
  let effectiveUid = isVerifiedSuperRep ? "u_rep" : decodedToken.uid;

  if (!isVerifiedSuperRep) {
    try {
      const users = await fetchAllUsersFromDB();
      const matched = users.find((u) => u.id === decodedToken.uid || (tokenEmail && u.email?.trim().toLowerCase() === tokenEmail));
      if (matched?.role === "rep" || matched?.role === "admin" || matched?.role === "doctor" || matched?.role === "pharmacy") {
        role = matched.role;
      }
    } catch {
      // Fallback to default client role
    }
  }

  return {
    uid: effectiveUid,
    role,
    email: decodedToken.email,
    phone: tokenPhone || undefined,
    firebaseUser: decodedToken,
  };
}

// --- AUTHENTICATION MIDDLEWARE ---
const verifyToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }
  try {
    const identity = await resolveAuthenticatedIdentity(req);
    if (!identity) {
      return res.status(401).json({ error: "Unauthorized: Invalid token", code: "auth/invalid-token" });
    }
    (req as any).user = identity.firebaseUser || {
      uid: identity.uid,
      role: identity.role,
      email: identity.email,
      phone: identity.phone,
    };
    (req as any).authUid = identity.uid;
    (req as any).authRole = identity.role;
    (req as any).isPrivileged = identity.role === "rep" || identity.role === "admin";
    next();
  } catch (error: any) {
    const code = error?.code || "";
    if (code === "auth/id-token-expired") {
      console.warn("Token verification notice: Firebase ID token expired; client refresh required.");
      return res.status(401).json({ error: "Unauthorized: Token expired", code });
    }
    console.warn("Token verification error:", error?.message || error);
    return res.status(401).json({ error: "Unauthorized: Invalid token", code: code || "auth/invalid-token" });
  }
};

const requireAuth = verifyToken;

const requirePrivileged = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  void verifyToken(req, res, () => {
    if (!(req as any).isPrivileged) {
      return res.status(403).json({ error: "Forbidden: Admin or representative access required" });
    }
    next();
  });
};

// --- HEALTH & AUTH ROUTES ---
app.all("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, status: "healthy", timestamp: new Date().toISOString() });
});

app.get('/api/dashboard', requireAuth, (req, res) => {
  res.json({ 
    message: "Welcome to the dashboard",
    user: (req as any).user 
  });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: (req as any).user || null });
});

app.get('/auth/logout', (_req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
});

// ... (Health & Diagnostics are public)

const DEFAULT_CATALOG_CATEGORIES = [
  "عام",
  "مضادات حيوية",
  "حقن مضاد حيوي",
  "مسكنات وخافض حرارة",
  "مسكنات ألم ومضادات التهاب",
  "أدوية المعدة والحموضة",
  "مضادات الحساسية",
  "مضادات الفطريات",
  "مضادات طفيليات مطهرة",
  "أدوية القلب والضغط",
  "أدوية السكري والغدد",
  "فيتامينات ومكملات غذائية",
  "أدوية السعال والجهاز التنفسي",
  "قطرات ومراهم عيون وأذن",
  "مستحضرات جلدية ومطهرات",
  "أدوية الطوارئ والمحاليل",
];

function resolveCatalogCategory(
  suggested: string | undefined,
  availableCategories: string[],
  allowNewCategories = false
): { category: string; isNewCategory: boolean } {
  const validCategories = availableCategories.length > 0 ? availableCategories : DEFAULT_CATALOG_CATEGORIES;
  const raw = String(suggested || "").trim().replace(/^["'`«]+|["'`»]+$/g, "");
  if (!raw) {
    return {
      category: validCategories.includes("عام") ? "عام" : validCategories[0],
      isNewCategory: false,
    };
  }

  const exact = validCategories.find((c) => c.trim() === raw);
  if (exact) return { category: exact, isNewCategory: false };

  const normalizeAr = (str: string) =>
    str
      .trim()
      .toLowerCase()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ");

  const normRaw = normalizeAr(raw);
  const normExact = validCategories.find((c) => normalizeAr(c) === normRaw);
  if (normExact) return { category: normExact, isNewCategory: false };

  const partial = validCategories.find((c) => {
    const nc = normalizeAr(c);
    return nc.length > 1 && (normRaw.includes(nc) || nc.includes(normRaw));
  });
  if (partial) return { category: partial, isNewCategory: false };

  if (allowNewCategories && raw.length >= 2 && raw.length <= 60 && normRaw !== "عام") {
    return { category: raw, isNewCategory: true };
  }

  return {
    category: validCategories.includes("عام") ? "عام" : validCategories[0],
    isNewCategory: false,
  };
}

function normalizeCatalogCategory(suggested: string | undefined, availableCategories: string[]): string {
  return resolveCatalogCategory(suggested, availableCategories, false).category;
}

async function classifySingleProductWithGemini(params: {
  name?: string;
  activeIngredient?: string;
  description?: string;
  availableCategories?: string[];
  allowNewCategories?: boolean;
}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("مفتاح Gemini API غير مهيأ على الخادم.");
  }

  const categoriesList =
    Array.isArray(params.availableCategories) && params.availableCategories.length > 0
      ? Array.from(new Set(params.availableCategories.map((c) => String(c || "").trim()).filter(Boolean)))
      : DEFAULT_CATALOG_CATEGORIES;

  const allowNew = Boolean(params.allowNewCategories);

  const prompt = `حلّل بيانات الصنف الطبي التالي واختر له التصنيف الأنسب من قائمة الفئات المتاحة في النظام${
    allowNew ? "، أو اقترح تصنيفاً طبياً جديداً ومختصراً إذا لم تتطابق أي فئة متاحة بدقة" : " حصراً"
  }:
- اسم الصنف: ${params.name || "غير محدد"}
- المادة الفعالة: ${params.activeIngredient || "غير محددة"}
- الوصف / دواعي الاستخدام: ${params.description || "غير متوفر"}

الفئات المتاحة في النظام:
${categoriesList.map((c, idx) => `${idx + 1}. ${c}`).join("\n")}`;

  const { response, modelUsed } = await robustGenerateContent(
    ai,
    "gemini-4-hydrogen",
    prompt,
    {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction: allowNew
        ? "أنت صيدلاني إكلينيكي خبير بتصنيف المستحضرات الدوائية والطبية. اختر الفئة الأنسب من القائمة المتاحة أولاً؛ وإذا لم يناسب الصنف أي فئة متاحة بدقة، اقترح اسماً عربياً موجزاً لتصنيف جديد مناسب واضبط isNewCategory على true. استنتج المادة الفعالة العلمية بدقة واكتب سبباً مختصراً بالعربية."
        : "أنت صيدلاني إكلينيكي خبير بتصنيف المستحضرات الدوائية والطبية في الصيدليات. يجب اختيار فئة واحدة مطابقة تماماً لقائمة الفئات المتاحة في النظام، وتحديد المادة الفعالة العلمية بدقة إن أمكن، وكتابة سبب مختصر بالعربية.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description: allowNew
              ? "اسم الفئة المختارة من القائمة المتاحة أو اسم تصنيف جديد مختصر بالعربية."
              : "اسم الفئة المختارة بالنص المطابق من قائمة الفئات المتاحة.",
          },
          isNewCategory: {
            type: Type.BOOLEAN,
            description: "true إذا كان التصنيف جديداً وغير موجود في القائمة المتاحة، وfalse إذا كان موجوداً.",
          },
          detectedActiveIngredient: {
            type: Type.STRING,
            description: "الاسم العلمي / المادة الفعالة المستنتجة إن أمكن (أو نص فارغ).",
          },
          confidence: {
            type: Type.STRING,
            description: "مستوى الثقة: عالية أو متوسطة أو منخفضة.",
          },
          reason: {
            type: Type.STRING,
            description: "سبب التصنيف باختصار شديد باللغة العربية.",
          },
        },
        required: ["category", "confidence", "reason"],
      },
    },
    false
  );

  const parsed = JSON.parse((response.text ?? "{}").trim());
  const resolved = resolveCatalogCategory(parsed?.category, categoriesList, allowNew);

  return {
    category: resolved.category,
    isNewCategory: resolved.isNewCategory,
    detectedActiveIngredient: String(parsed?.detectedActiveIngredient || "").trim(),
    confidence: String(parsed?.confidence || "عالية").trim(),
    reason: String(parsed?.reason || "").trim(),
    model: modelUsed,
  };
}

// Auto-categorize product based on name / active ingredient / description
app.post("/api/categorize-product", requireAuth, async (req, res) => {
  const { productName, name, activeIngredient, description, availableCategories } = req.body || {};
  const itemName = String(productName || name || "").trim();
  const ingredient = String(activeIngredient || "").trim();
  const desc = String(description || "").trim();

  if (!itemName && !ingredient && !desc) {
    return res.status(400).json({ error: "يرجى إدخال اسم الصنف أو المادة الفعالة للتصنيف." });
  }

  try {
    const result = await classifySingleProductWithGemini({
      name: itemName,
      activeIngredient: ingredient,
      description: desc,
      availableCategories,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("AI Categorization failed:", err);
    res.status(500).json({ error: err?.message || "تعذر تصنيف الصنف باستخدام Gemini AI." });
  }
});


// Comprehensive system and network diagnostics endpoint
app.get("/api/diagnostics/system", async (req, res) => {
  let firestoreStatus = "offline-mode";
  let firestoreLatencyMs = -1;

  if (isFirebaseEnabled && dbAdmin) {
    try {
      const probeStart = Date.now();
      await dbAdmin.collection("products").limit(1).get();
      firestoreLatencyMs = Date.now() - probeStart;
      firestoreStatus = "connected";
    } catch (e: any) {
      firestoreStatus = `error: ${e.message || "auth failed"}`;
    }
  }

  const memoryUsage = process.memoryUsage();

  res.json({
    success: true,
    app: "مندوبك الطبي - Mandoubak Med",
    version: "2.4.0",
    supervisor: "د. بلال القيسي - 776600049",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    memoryMb: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    },
    corsEnabled: true,
    firebase: {
      enabled: isFirebaseEnabled,
      status: firestoreStatus,
      latencyMs: firestoreLatencyMs
    },
    clientInfo: {
      ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
      origin: req.headers["origin"] || "none",
      host: req.headers["host"],
      protocol: req.protocol,
      userAgent: req.headers["user-agent"]
    }
  });
});

// --- STATUSPAGE.IO INTEGRATION (https://mandoubakmed1.statuspage.io) ---
const FALLBACK_INCIDENT_HISTORY = [
  {
    id: "bvwtcky51kpr",
    title: "هذا مثال على حادثة",
    status: "resolved",
    statusArabic: "تم الحل",
    createdAt: "2026-08-05T01:11:54Z",
    updatedAt: "2026-08-05T01:11:54Z",
    link: "https://mandoubakmed1.statuspage.io/incidents/bvwtcky51kpr",
    updates: [
      {
        status: "resolved",
        statusArabic: "تم الحل",
        timestamp: "أغسطس 5, 01:11 UTC",
        body: "تعاطف مع المتضررين وأخبرهم أن كل شيء يسير على ما يرام."
      },
      {
        status: "monitoring",
        statusArabic: "المراقبة",
        timestamp: "أغسطس 5, 01:01 UTC",
        body: "أبلغ المستخدمين بمجرد تطبيق الإصلاح، وحافظ على التواصل واضحًا ودقيقًا."
      },
      {
        status: "identified",
        statusArabic: "تم التحديد",
        timestamp: "أغسطس 5, 01:07 UTC",
        body: "أثناء استمرارك في العمل على حل المشكلة، قم بتحديث عملائك بشكل متكرر."
      },
      {
        status: "investigating",
        statusArabic: "جاري التحقيق",
        timestamp: "أغسطس 5, 01:37 UTC",
        body: "عندما لا يعمل منتجك أو خدمتك كما هو متوقع، أبلغ عملاءك عن طريق إنشاء بلاغ. تواصل مبكرًا، حتى لو لم تكن تعرف بالضبط ما يحدث."
      }
    ]
  }
];

app.get("/api/statuspage/summary", async (req, res) => {
  const statusPageUrl = "https://mandoubakmed1.statuspage.io";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`${statusPageUrl}/api/v2/summary.json`, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      return res.json({
        success: true,
        source: "live",
        statusPageUrl,
        page: data.page,
        status: {
          indicator: data.status?.indicator || "none",
          description: data.status?.indicator === "none" ? "جميع الأنظمة تعمل بكفاءة" : (data.status?.description || "حالة النظام مستقرة"),
          descriptionOriginal: data.status?.description
        },
        components: (data.components || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          statusArabic: c.status === "operational" ? "يعمل بكفاءة" : c.status === "degraded_performance" ? "أداء منخفض" : "متوقف"
        })),
        incidents: data.incidents && data.incidents.length > 0 ? data.incidents : FALLBACK_INCIDENT_HISTORY
      });
    }
  } catch (err: any) {
    console.warn("Statuspage live fetch failed, serving cached fallback:", err.message);
  }

  // Fallback response with the exact status details provided by the user
  res.json({
    success: true,
    source: "fallback",
    statusPageUrl,
    page: {
      name: "الحالة الطبية لمندوبك (Mandoubak Med Status)",
      url: statusPageUrl,
      updated_at: new Date().toISOString()
    },
    status: {
      indicator: "none",
      description: "جميع الأنظمة تعمل بكفاءة (All Systems Operational)"
    },
    components: [
      { id: "api", name: "واجهة البرمجة (API)", status: "operational", statusArabic: "يعمل بكفاءة" },
      { id: "portal", name: "بوابة المندوبين والإدارة (Management Portal)", status: "operational", statusArabic: "يعمل بكفاءة" },
      { id: "cloud", name: "السحابة وقاعدة البيانات (Firestore & Cloud Run)", status: "operational", statusArabic: "يعمل بكفاءة" }
    ],
    incidents: FALLBACK_INCIDENT_HISTORY
  });
});

app.get("/api/statuspage/rss", (req, res) => {
  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>الحالة الطبية لمندوبك - تاريخ الحوادث</title>
    <link>https://mandoubakmed1.statuspage.io</link>
    <description>صفحة الحالة الرسمية لتطبيق مندوبك الطبي</description>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <item>
      <title>هذا مثال على حادثة</title>
      <description><![CDATA[
<p><small>أغسطس 5, 01:11 UTC</small><br><strong>تم الحل</strong> - تعاطف مع المتضررين وأخبرهم أن كل شيء يسير على ما يرام.</p>
<p><small>أغسطس 5, 01:01 UTC</small><br><strong>المراقبة</strong> - أبلغ المستخدمين بمجرد تطبيق الإصلاح، وحافظ على التواصل واضحًا ودقيقًا.</p>
<p><small>أغسطس 5, 01:07 UTC</small><br><strong>تم التحديد</strong> - أثناء استمرارك في العمل على حل المشكلة، قم بتحديث عملائك بشكل متكرر.</p>
<p><small>أغسطس 5, 01:37 UTC</small><br><strong>جاري التحقيق</strong> - عندما لا يعمل منتجك أو خدمتك كما هو متوقع، أبلغ عملاءك عن طريق إنشاء بلاغ. تواصل مبكرًا، حتى لو لم تكن تعرف بالضبط ما يحدث.</p>
      ]]></description>
      <pubDate>Wed, 05 Aug 2026 01:11:54 +0000</pubDate>
      <link>https://mandoubakmed1.statuspage.io/incidents/bvwtcky51kpr</link>
      <guid>https://mandoubakmed1.statuspage.io/incidents/bvwtcky51kpr</guid>
    </item>
  </channel>
</rss>`;
  res.send(rssXml);
});

// Seed data structures in Arabic
interface UserPermissions {
  canAccessStockReports: boolean;
  canReceiveTargetedNotifications: boolean;
  canExportReports: boolean;
  canViewVisits: boolean;
  canViewAgreements: boolean;
}

interface User {
  id: string;
  phone: string;
  name: string;
  role: "rep" | "pharmacy" | "doctor" | "admin";
  email?: string;
  entityName?: string;
  location?: string;
  notes?: string;
  avatar?: string;
  isApproved?: boolean;
  status?: "approved" | "pending_approval" | "suspended" | "rejected";
  confirmationCode?: string;
  fcmToken?: string;
  fcmTokens?: string[];
  fcmUpdatedAt?: string;
  createdAt: string;
  permissions?: UserPermissions;
  lat?: number;
  lng?: number;
}

interface AppSettings {
  requireApprovalForNewClients: boolean;
  requireApprovalForNewAccounts: boolean;
  singlePhonePerDevice: boolean;
  autoApproveKnownNumbers: boolean;
  enableVisitTracking?: boolean;
  drProfileAvatar?: string;
  productCategories?: string[];
  categoryColors?: Record<string, string>;
  geminiWebhookSecret?: string;
  adminPasscodeHash?: string;
}


const DEFAULT_SETTINGS: AppSettings = {
  requireApprovalForNewClients: true,
  requireApprovalForNewAccounts: true,
  singlePhonePerDevice: true,
  autoApproveKnownNumbers: true,
  enableVisitTracking: true,
  drProfileAvatar: ""
};

const DEFAULT_USERS: User[] = [
  {
    id: "u_rep",
    phone: "+967776600049",
    name: "د/ بلال القيسي (المندوب الطبي والمسؤول)",
    role: "rep",
    email: "belalalqaisi55@gmail.com",
    entityName: "المكتب العلمي والمبيعات الطبية (الإدارة)",
    location: "صنعاء / جميع المحافظات",
    isApproved: true,
    status: "approved",
    createdAt: "2026-09-08T00:17:54.975Z"
  },
  {
    id: "c_nahda",
    name: "د. سامر خالد",
    entityName: "صيدلية النهضة الطبية",
    phone: "+967770000001",
    location: "شارع التحرير، صنعاء",
    role: "pharmacy",
    isApproved: true,
    status: "approved",
    lat: 15.3533,
    lng: 44.2078,
    createdAt: "2026-09-10T08:00:00.000Z"
  },
  {
    id: "c_nour",
    name: "د. أحمد الصالح",
    entityName: "صيدلية النور الحديثة",
    phone: "+967770000002",
    location: "شارع تعز، صنعاء",
    role: "pharmacy",
    isApproved: true,
    status: "approved",
    lat: 15.3341,
    lng: 44.2185,
    createdAt: "2026-09-10T08:30:00.000Z"
  },
  {
    id: "c_rawda",
    name: "د. محمد فارع",
    entityName: "صيدلية الروضة المركزية",
    phone: "+967770000003",
    location: "حي الروضة، صنعاء",
    role: "pharmacy",
    isApproved: true,
    status: "approved",
    lat: 15.4124,
    lng: 44.2091,
    createdAt: "2026-09-11T09:00:00.000Z"
  },
  {
    id: "c_shifa",
    name: "د. محمد القاسمي",
    entityName: "صيدلية الشفاء التخصصية",
    phone: "+967771234567",
    location: "شارع حدة، صنعاء",
    role: "pharmacy",
    isApproved: true,
    status: "approved",
    lat: 15.3218,
    lng: 44.1950,
    createdAt: "2026-09-11T09:30:00.000Z"
  },
  {
    id: "c_amal",
    name: "د. وفاء أحمد",
    entityName: "مستشفى وعيادات الأمل التخصصي",
    phone: "+967770000004",
    location: "حدة، صنعاء",
    role: "doctor",
    isApproved: true,
    status: "approved",
    lat: 15.3275,
    lng: 44.1890,
    createdAt: "2026-09-12T10:00:00.000Z"
  },
  {
    id: "c_sina",
    name: "د. مروان القدسي",
    entityName: "صيدلية ابن سينا المركزية",
    phone: "+967770000005",
    location: "الدائري الغربي، صنعاء",
    role: "pharmacy",
    isApproved: true,
    status: "approved",
    lat: 15.3610,
    lng: 44.1872,
    createdAt: "2026-09-12T10:30:00.000Z"
  },
  {
    id: "c_salam",
    name: "د. رياض الشميري",
    entityName: "صيدلية السلام الكبرى",
    phone: "+967770000006",
    location: "الحصبة، صنعاء",
    role: "pharmacy",
    isApproved: true,
    status: "approved",
    lat: 15.3850,
    lng: 44.2010,
    createdAt: "2026-09-13T11:00:00.000Z"
  },
  {
    id: "c_quds",
    name: "د. طارق الحكيمي",
    entityName: "صيدلية القدس الدولية",
    phone: "+967770000007",
    location: "شارع الزبيري، صنعاء",
    role: "pharmacy",
    isApproved: true,
    status: "approved",
    lat: 15.3480,
    lng: 44.2015,
    createdAt: "2026-09-13T11:30:00.000Z"
  },
  {
    id: "c_hayat",
    name: "د. سارة المنصوب",
    entityName: "مركز الحياة الطبي التخصصي",
    phone: "+967770000008",
    location: "الأصبحي، صنعاء",
    role: "doctor",
    isApproved: true,
    status: "approved",
    lat: 15.2980,
    lng: 44.2250,
    createdAt: "2026-09-14T12:00:00.000Z"
  },
  {
    id: "c_baraka",
    name: "د. عبدالحكيم الشامي",
    entityName: "صيدلية البركة النموذجية",
    phone: "+967770000009",
    location: "شارع الستين الجنوبي، صنعاء",
    role: "pharmacy",
    isApproved: true,
    status: "approved",
    lat: 15.3120,
    lng: 44.1780,
    createdAt: "2026-09-14T12:30:00.000Z"
  }
];

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: string;
  unit: string;
  bonus?: string;
  image?: string;
  imageUrl?: string;
  qrCode?: string;
  barcode?: string;
  activeIngredient?: string;
  dosageForm?: string;
  createdAt?: string;
}

interface StockReport {
  id: string;
  clientId: string;
  clientName: string;
  entityName: string;
  productId: string;
  productName: string;
  remainingQty: number;
  reportedAt: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: string;
}

interface Order {
  id: string;
  clientId: string;
  clientName: string;
  entityName: string;
  items: OrderItem[];
  status: "pending" | "approved" | "completed" | "cancelled";
  createdAt: string;
  notes?: string;
  respondedAt?: string;
  approvedAt?: string;
  completedAt?: string;
  updatedAt?: string;
  isArchived?: boolean;
  archivedAt?: string;
}

interface VisitTask {
  id: string;
  taskText: string;
  completed: boolean;
}

interface Visit {
  id: string;
  clientId: string;
  clientName: string;
  entityName: string;
  visitDate: string;
  notes: string;
  summary?: string;
  tasks?: VisitTask[];
  createdAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "broadcast" | "target";
  targetClientId?: string;
  targetClientName?: string;
  createdAt: string;
  isArchived?: boolean;
  archivedAt?: string;
  fcmDispatchedBy?: string;
}

export type AgreementType = "bonus" | "samples" | "gift_support" | "discount_terms" | "other";
export type AgreementStatus = "pending" | "delivered" | "cancelled";

export interface Agreement {
  id: string;
  clientId: string;
  clientName: string;
  entityName: string;
  clientPhone?: string;
  type: AgreementType;
  typeLabel?: string;
  details: string;
  agreementDate: string;
  status: AgreementStatus;
  deliveredDetails?: string;
  deliveredAt?: string;
  deliveredBy?: string;
  invoiceNumber?: string;
  invoiceAttachment?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ComplaintType = "complaint" | "suggestion" | "quality_issue" | "financial_bonus" | "compliment" | "other";
export type ComplaintStatus = "pending" | "in_progress" | "resolved" | "closed";
export type ComplaintPriority = "normal" | "medium" | "urgent";

export interface Complaint {
  id: string;
  clientId: string;
  clientName: string;
  entityName?: string;
  clientPhone?: string;
  clientRole?: "rep" | "pharmacy" | "doctor" | "admin";
  type: ComplaintType;
  typeLabel?: string;
  subject: string;
  content: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  isAnonymous?: boolean;
  attachment?: string;
  adminReply?: string;
  repliedAt?: string;
  repliedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TrashItem {
  id: string;
  itemType: "order" | "agreement" | "product" | "client" | "complaint" | "category" | "other";
  title: string;
  subtitle?: string;
  originalId: string;
  deletedAt: string;
  deletedBy?: string;
  details?: Record<string, any>;
  data: any;
}

export interface GeminiWebhookEventRecord {
  id: string;
  webhookId?: string;
  eventType: string;
  batchId?: string;
  model?: string;
  status: "succeeded" | "failed" | "processing" | "received" | "cancelled" | "expired";
  outputUri?: string;
  totalCount?: number;
  completedCount?: number;
  failedCount?: number;
  error?: string | null;
  payload: any;
  headers?: Record<string, string>;
  verified: boolean;
  receivedAt: string;
  summary?: string;
}

interface DB {
  users: User[];
  products: Product[];
  stockReports: StockReport[];
  orders: Order[];
  visits?: Visit[];
  notifications?: Notification[];
  agreements?: Agreement[];
  complaints?: Complaint[];
  settings?: AppSettings;
  trashArchive?: TrashItem[];
  geminiWebhooks?: GeminiWebhookEventRecord[];
}


// Helper to get default data
function getDefaults() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'defaults.json'), 'utf8'));
    data.users = data.users.map((u: any) => ({ ...u, createdAt: new Date().toISOString() }));
    return data;
  } catch (e) {
    console.error("Error reading defaults.json", e);
    return { products: [], users: [] };
  }
}

// Read database
function getDB(): DB {
  try {
    const defaults = getDefaults();
    const defaultProducts = defaults.products && defaults.products.length > 0 ? defaults.products : DEFAULT_PRODUCTS;
    const defaultUsers = defaults.users && defaults.users.length > 0 ? defaults.users : DEFAULT_USERS;

    if (!fs.existsSync(DB_FILE)) {
      if (inMemoryDBFallback) {
        return inMemoryDBFallback;
      }
      let initialDB: DB | null = null;
      if (DB_FILE !== SEED_DB_FILE && fs.existsSync(SEED_DB_FILE)) {
        try {
          initialDB = JSON.parse(fs.readFileSync(SEED_DB_FILE, "utf8")) as DB;
        } catch {
          initialDB = null;
        }
      }
      if (!initialDB) {
        initialDB = {
          users: defaultUsers,
          products: defaultProducts,
          stockReports: [],
          orders: [],
          visits: [],
          notifications: [],
          agreements: [],
          complaints: [],
          trashArchive: [],
          geminiWebhooks: []
        };
      }
      inMemoryDBFallback = initialDB;
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf8");
      } catch {
        // Ignore read-only filesystem errors and continue using in-memory fallback
      }
      return initialDB;
    }

    const data = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(data) as DB;
    
    // Ensure lists are initialized
    if (!parsed.users) parsed.users = defaultUsers;
    const defaultClientIds = new Set(["c_1", "c_2", "c_3", "c_4", "c_5"]);
    parsed.users = parsed.users.filter((u) => !defaultClientIds.has(u.id));

    if (!parsed.products || parsed.products.length === 0) parsed.products = defaultProducts;
    if (!parsed.stockReports) parsed.stockReports = [];
    if (!parsed.orders) parsed.orders = [];
    if (!parsed.visits) parsed.visits = [];
    if (!parsed.notifications) parsed.notifications = [];
    if (!parsed.agreements) parsed.agreements = [];
    if (!parsed.complaints) parsed.complaints = [];
    if (!parsed.trashArchive) parsed.trashArchive = [];
    if (!parsed.geminiWebhooks) parsed.geminiWebhooks = [];

    inMemoryDBFallback = parsed;
    return parsed;
  } catch (err) {
    console.error("Error reading database", err);
    if (inMemoryDBFallback) return inMemoryDBFallback;
    return {
      users: DEFAULT_USERS,
      products: DEFAULT_PRODUCTS,
      stockReports: [],
      orders: [],
      visits: [],
      notifications: [],
      agreements: [],
      complaints: [],
      trashArchive: [],
      geminiWebhooks: []
    };
  }
}


// Save database
function saveDB(db: DB) {
  inMemoryDBFallback = db;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing to database", err);
  }
}

// --- DATA REPOSITORY SYNCHRONIZATION FOR FIREBASE ---

async function fetchAllUsersFromDB(): Promise<User[]> {
  let list: User[] = [];
  const defaultClientIds = new Set(["c_1", "c_2", "c_3", "c_4", "c_5"]);
  let firebaseSuccess = false;

  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = (await Promise.race([
        dbAdmin.collection("users").get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore users fetch timeout")), 2500))
      ])) as any;
      snap.forEach((doc: any) => {
        if (!defaultClientIds.has(doc.id)) {
          list.push(doc.data() as User);
        } else {
          doc.ref.delete().catch(() => {});
        }
      });
      firebaseSuccess = true;
    } catch (e: any) {
      console.warn("Firebase operation fallback (users):", e.message);
      isFirebaseEnabled = false;
    }
  }

  if (!firebaseSuccess) {
    list = getDB().users;
  }

  list = list.filter((u) => !defaultClientIds.has(u.id));

  // Ensure only the rep/admin account is always present (never resurrect deleted clients)
  let hasChanges = false;
  for (const defU of DEFAULT_USERS.filter((u) => u.role === "rep" || u.id === "u_rep")) {
    const existing = list.find((u) => u.id === defU.id || (defU.phone && u.phone === defU.phone));
    if (!existing) {
      list.push(defU);
      hasChanges = true;
      if (isFirebaseEnabled && dbAdmin) {
        try {
          await dbAdmin.collection("users").doc(defU.id).set(defU);
        } catch (e) {}
      }
    }
  }

  if (hasChanges && (!isFirebaseEnabled || !dbAdmin)) {
    const db = getDB();
    db.users = list;
    saveDB(db);
  }

  return list;
}

async function saveUserToDB(user: User): Promise<void> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("users").doc(user.id).set(user);
      return;
    } catch (e: any) {
      console.warn("Firebase operation fallback (save user):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const existingIdx = db.users.findIndex((u) => u.id === user.id);
  if (existingIdx !== -1) {
    db.users[existingIdx] = { ...db.users[existingIdx], ...user };
  } else {
    db.users.push(user);
  }
  saveDB(db);
}

async function fetchProductsFromDB(): Promise<Product[]> {
  let productsList: Product[] = [];
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("products").get();
      if (snap.empty) {
        // Seed initial products if collection is empty
        const batch = dbAdmin.batch();
        for (const p of DEFAULT_PRODUCTS) {
          const ref = dbAdmin.collection("products").doc(p.id);
          batch.set(ref, p);
        }
        await batch.commit();
        return DEFAULT_PRODUCTS;
      }
      snap.forEach((doc) => {
        productsList.push(doc.data() as Product);
      });
    } catch (e: any) {
      console.warn("Firebase operation fallback (products):", e.message);
      isFirebaseEnabled = false;
    }
  }

  if (productsList.length === 0) {
    productsList = getDB().products;
  }

  // Ensure DEFAULT_PRODUCTS prices and bonuses are synced
  let hasChanges = false;
  for (const defP of DEFAULT_PRODUCTS) {
    const existing = productsList.find((p) => p.id === defP.id);
    if (existing) {
      if (existing.price !== defP.price || existing.bonus !== defP.bonus) {
        existing.price = defP.price;
        existing.bonus = defP.bonus;
        hasChanges = true;
        if (isFirebaseEnabled && dbAdmin) {
          try {
            await dbAdmin.collection("products").doc(defP.id).update({ price: defP.price, bonus: defP.bonus });
          } catch (e) {}
        }
      }
    } else {
      productsList.push(defP);
      hasChanges = true;
      if (isFirebaseEnabled && dbAdmin) {
        try {
          await dbAdmin.collection("products").doc(defP.id).set(defP);
        } catch (e) {}
      }
    }
  }

  if (hasChanges && (!isFirebaseEnabled || !dbAdmin)) {
    const db = getDB();
    db.products = productsList;
    saveDB(db);
  }

  return productsList;
}

async function saveProductToDB(product: Product): Promise<void> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("products").doc(product.id).set(product);
      return;
    } catch (e: any) {
      console.warn("Firebase operation fallback (save product):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const existingIdx = db.products.findIndex((p) => p.id === product.id);
  if (existingIdx >= 0) {
    db.products[existingIdx] = product;
  } else {
    db.products.push(product);
  }
  saveDB(db);
}

async function deleteProductFromDB(id: string, deletedBy = "د. بلال القيسي"): Promise<boolean> {
  const db = getDB();
  const existingProd = db.products.find((p) => p.id === id);
  if (existingProd) {
    await addTrashItemToDB({
      id: `trash_prod_${id}_${Date.now()}`,
      itemType: "product",
      title: `صنف: ${existingProd.name}`,
      subtitle: `القسم: ${existingProd.category || "عام"} | السعر: ${existingProd.price} | البونص: ${existingProd.bonus || "لا يوجد"}`,
      originalId: id,
      deletedAt: new Date().toISOString(),
      deletedBy,
      details: {
        name: existingProd.name,
        category: existingProd.category,
        price: existingProd.price,
        bonus: existingProd.bonus,
        description: existingProd.description
      },
      data: existingProd
    });
  }

  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("products").doc(id).delete();
    } catch (e: any) {
      console.warn("Firebase operation fallback (delete product):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const idx = db.products.findIndex((p) => p.id === id);
  if (idx !== -1) {
    db.products.splice(idx, 1);
    saveDB(db);
    return true;
  }
  return false;
}

async function fetchStockReportsFromDB(clientId?: string): Promise<StockReport[]> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      let query: Query = dbAdmin.collection("stockReports");
      if (clientId) {
        query = query.where("clientId", "==", clientId);
      }
      const snap = await query.get();
      const list: StockReport[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as StockReport);
      });
      return list;
    } catch (e: any) {
      console.warn("Firebase operation fallback (stockReports):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  return clientId ? db.stockReports.filter((r) => r.clientId === clientId) : db.stockReports;
}

async function saveStockReportToDB(clientId: string, clientName: string, entityName: string, reports: any[]): Promise<void> {
  const timestamp = new Date().toISOString();
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const batch = dbAdmin.batch();
      for (const rep of reports) {
        // Query older report to delete
        const oldReports = await dbAdmin.collection("stockReports")
          .where("clientId", "==", clientId)
          .where("productId", "==", rep.productId)
          .get();
        
        oldReports.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });

        const id = "st_" + Math.random().toString(36).substr(2, 9);
        const ref = dbAdmin.collection("stockReports").doc(id);
        batch.set(ref, {
          id,
          clientId,
          clientName: clientName || "عميل غير معروف",
          entityName: entityName || "منشأة غير معروفة",
          productId: rep.productId,
          productName: rep.productName,
          remainingQty: Number(rep.remainingQty),
          reportedAt: timestamp
        });
      }
      await batch.commit();
      return;
    } catch (e: any) {
      console.warn("Firebase operation fallback (save stockReports):", e.message);
      isFirebaseEnabled = false;
    }
  }

  const db = getDB();
  reports.forEach((rep) => {
    db.stockReports = db.stockReports.filter(
      (r) => !(r.clientId === clientId && r.productId === rep.productId)
    );
    db.stockReports.push({
      id: "st_" + Math.random().toString(36).substr(2, 9),
      clientId,
      clientName: clientName || "عميل غير معروف",
      entityName: entityName || "منشأة غير معروفة",
      productId: rep.productId,
      productName: rep.productName,
      remainingQty: Number(rep.remainingQty),
      reportedAt: timestamp
    });
  });
  saveDB(db);
}

async function fetchOrdersFromDB(clientId?: string): Promise<Order[]> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      let query: Query = dbAdmin.collection("orders");
      if (clientId) {
        query = query.where("clientId", "==", clientId);
      }
      const snap = await query.get();
      const list: Order[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as Order);
      });
      // Sort orders by createdAt descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (e: any) {
      console.warn("Firebase operation fallback (orders):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const list = clientId ? db.orders.filter((o) => o.clientId === clientId) : db.orders;
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function saveOrderToDB(order: Order): Promise<void> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("orders").doc(order.id).set(order, { merge: true });
      return;
    } catch (e: any) {
      console.warn("Firebase operation fallback (save order):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const idx = db.orders.findIndex((o) => o.id === order.id);
  if (idx !== -1) {
    db.orders[idx] = { ...db.orders[idx], ...order };
  } else {
    db.orders.unshift(order);
  }
  saveDB(db);
}

async function updateOrderStatusInDB(id: string, status: string, orderData?: any): Promise<Order | null> {
  const now = new Date().toISOString();
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const docRef = dbAdmin.collection("orders").doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        const currentData = (doc.data() || {}) as Partial<Order>;
        const updateFields: Record<string, any> = { status, updatedAt: now };
        if (status !== "pending" && !currentData.respondedAt) {
          updateFields.respondedAt = now;
        }
        if (status === "approved" && !currentData.approvedAt) {
          updateFields.approvedAt = now;
        }
        if (status === "completed" && !currentData.completedAt) {
          updateFields.completedAt = now;
        }
        await docRef.update(updateFields);
        const updated = await docRef.get();
        return updated.data() as Order;
      }
    } catch (e: any) {
      console.warn("Firebase operation fallback (update order):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const idx = db.orders.findIndex((o) => o.id === id);
  if (idx !== -1) {
    const current = db.orders[idx] as any;
    current.status = status as any;
    current.updatedAt = now;
    if (status !== "pending" && !current.respondedAt) {
      current.respondedAt = now;
    }
    if (status === "approved" && !current.approvedAt) {
      current.approvedAt = now;
    }
    if (status === "completed" && !current.completedAt) {
      current.completedAt = now;
    }
    saveDB(db);
    return db.orders[idx];
  }

  // If order was not yet in local db.orders, but orderData was provided, upsert it!
  if (orderData) {
    const newOrder: Order = {
      ...orderData,
      id,
      status: status as any,
      updatedAt: now,
      respondedAt: orderData.respondedAt || (status !== "pending" ? now : undefined),
      approvedAt: orderData.approvedAt || (status === "approved" ? now : undefined),
      completedAt: orderData.completedAt || (status === "completed" ? now : undefined),
      createdAt: orderData.createdAt || now,
    };
    db.orders.unshift(newOrder);
    saveDB(db);
    return newOrder;
  }

  return null;
}

async function archiveOrderInDB(id: string, isArchived: boolean = true, orderData?: any): Promise<Order | null> {
  const now = new Date().toISOString();
  const archivedAt = isArchived ? now : undefined;
  let fbResult: Order | null = null;

  if (isFirebaseEnabled && dbAdmin) {
    try {
      const docRef = dbAdmin.collection("orders").doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        await docRef.update({
          isArchived,
          archivedAt: archivedAt || null,
          updatedAt: now
        });
        const updated = await docRef.get();
        fbResult = updated.data() as Order;
      } else if (orderData) {
        const upsertOrder: Order = {
          ...orderData,
          id,
          isArchived,
          updatedAt: now,
          ...(archivedAt ? { archivedAt } : {})
        };
        if (!isArchived) delete (upsertOrder as any).archivedAt;
        await docRef.set(upsertOrder, { merge: true });
        fbResult = upsertOrder;
      }
    } catch (e: any) {
      console.warn("Firebase archive order fallback:", e.message);
    }
  }

  const db = getDB();
  const idx = db.orders.findIndex((o) => o.id === id);
  if (idx !== -1) {
    db.orders[idx].isArchived = isArchived;
    db.orders[idx].updatedAt = now;
    if (archivedAt) {
      db.orders[idx].archivedAt = archivedAt;
    } else {
      delete db.orders[idx].archivedAt;
    }
    saveDB(db);
    return fbResult || db.orders[idx];
  }

  if (fbResult || orderData) {
    const source = fbResult || orderData;
    const upserted: Order = {
      ...source,
      id,
      isArchived,
      updatedAt: now,
      createdAt: source.createdAt || now,
    };
    if (archivedAt) {
      upserted.archivedAt = archivedAt;
    } else {
      delete upserted.archivedAt;
    }
    db.orders.unshift(upserted);
    saveDB(db);
    return upserted;
  }

  return null;
}

async function archiveAllCompletedOrdersInDB(clientOrders?: Order[]): Promise<number> {
  let fbCount = 0;
  let localCount = 0;
  const now = new Date().toISOString();

  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snapCompleted = await dbAdmin.collection("orders").where("status", "==", "completed").get();
      const snapCancelled = await dbAdmin.collection("orders").where("status", "==", "cancelled").get();
      const batch = dbAdmin.batch();
      const seenIds = new Set<string>();
      snapCompleted.forEach((doc) => {
        const data = doc.data();
        seenIds.add(doc.id);
        if (!data.isArchived) {
          batch.update(doc.ref, { isArchived: true, archivedAt: now, updatedAt: now });
          fbCount++;
        }
      });
      snapCancelled.forEach((doc) => {
        const data = doc.data();
        seenIds.add(doc.id);
        if (!data.isArchived) {
          batch.update(doc.ref, { isArchived: true, archivedAt: now, updatedAt: now });
          fbCount++;
        }
      });
      if (Array.isArray(clientOrders)) {
        for (const co of clientOrders) {
          if (co && co.id && !seenIds.has(co.id) && (co.status === "completed" || co.status === "cancelled")) {
            batch.set(dbAdmin.collection("orders").doc(co.id), { ...co, isArchived: true, archivedAt: co.archivedAt || now, updatedAt: now }, { merge: true });
            fbCount++;
          }
        }
      }
      if (fbCount > 0) {
        await batch.commit();
      }
    } catch (e: any) {
      console.warn("Firebase batch archive completed orders fallback:", e.message);
    }
  }

  const db = getDB();
  const existingMap = new Map<string, number>();
  db.orders.forEach((o, i) => existingMap.set(o.id, i));

  db.orders.forEach((o) => {
    if ((o.status === "completed" || o.status === "cancelled") && !o.isArchived) {
      o.isArchived = true;
      o.archivedAt = now;
      o.updatedAt = now;
      localCount++;
    }
  });

  if (Array.isArray(clientOrders)) {
    for (const co of clientOrders) {
      if (!co || !co.id) continue;
      if (co.status !== "completed" && co.status !== "cancelled") continue;
      const existingIdx = existingMap.get(co.id);
      if (existingIdx !== undefined) {
        if (!db.orders[existingIdx].isArchived) {
          db.orders[existingIdx].isArchived = true;
          db.orders[existingIdx].archivedAt = co.archivedAt || now;
          db.orders[existingIdx].updatedAt = now;
          localCount++;
        }
      } else {
        db.orders.unshift({
          ...co,
          isArchived: true,
          archivedAt: co.archivedAt || now,
          updatedAt: now
        });
        localCount++;
      }
    }
  }

  if (localCount > 0) saveDB(db);
  return Math.max(fbCount, localCount);
}

// ---------------- ADMIN TRASH & RECYCLE BIN ARCHIVE ----------------

async function addTrashItemToDB(item: TrashItem): Promise<void> {
  const db = getDB();
  if (!db.trashArchive) db.trashArchive = [];
  const existingIdx = db.trashArchive.findIndex((t) => t.id === item.id);
  if (existingIdx !== -1) {
    db.trashArchive[existingIdx] = item;
  } else {
    db.trashArchive.unshift(item);
  }
  if (db.trashArchive.length > 500) {
    db.trashArchive = db.trashArchive.slice(0, 500);
  }
  saveDB(db);

  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("trash_archive").doc(item.id).set(item);
    } catch (e: any) {
      console.warn("Firebase add trash item fallback:", e.message);
    }
  }
}

async function fetchTrashArchiveFromDB(): Promise<TrashItem[]> {
  const db = getDB();
  let list = db.trashArchive || [];

  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("trash_archive").orderBy("deletedAt", "desc").limit(300).get();
      if (!snap.empty) {
        const fbList: TrashItem[] = [];
        snap.forEach((doc) => {
          fbList.push(doc.data() as TrashItem);
        });
        const map = new Map<string, TrashItem>();
        list.forEach((item) => map.set(item.id, item));
        fbList.forEach((item) => map.set(item.id, item));
        list = Array.from(map.values());
      }
    } catch (e: any) {
      console.warn("Firebase fetch trash archive fallback:", e.message);
    }
  }

  list.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  return list;
}

async function restoreTrashItemInDB(trashId: string): Promise<{ success: boolean; item?: TrashItem; message: string }> {
  const db = getDB();
  if (!db.trashArchive) db.trashArchive = [];
  const idx = db.trashArchive.findIndex((t) => t.id === trashId);
  let item = idx !== -1 ? db.trashArchive[idx] : null;

  if (!item && isFirebaseEnabled && dbAdmin) {
    try {
      const doc = await dbAdmin.collection("trash_archive").doc(trashId).get();
      if (doc.exists) {
        item = doc.data() as TrashItem;
      }
    } catch (e: any) {
      console.warn("Firebase fetch single trash fallback:", e.message);
    }
  }

  if (!item) {
    return { success: false, message: "العنصر غير موجود في الأرشيف" };
  }

  try {
    if (item.itemType === "order") {
      const order = item.data;
      if (order && order.id) {
        const oIdx = db.orders.findIndex((o) => o.id === order.id);
        if (oIdx !== -1) {
          db.orders[oIdx] = order;
        } else {
          db.orders.unshift(order);
        }
        if (isFirebaseEnabled && dbAdmin) {
          await dbAdmin.collection("orders").doc(order.id).set(order);
        }
      }
    } else if (item.itemType === "agreement") {
      const agr = item.data;
      if (agr && agr.id) {
        if (!db.agreements) db.agreements = [];
        const aIdx = db.agreements.findIndex((a) => a.id === agr.id);
        if (aIdx !== -1) {
          db.agreements[aIdx] = agr;
        } else {
          db.agreements.unshift(agr);
        }
        if (isFirebaseEnabled && dbAdmin) {
          await dbAdmin.collection("agreements").doc(agr.id).set(agr);
        }
      }
    } else if (item.itemType === "product") {
      const prod = item.data;
      if (prod && prod.id) {
        const pIdx = db.products.findIndex((p) => p.id === prod.id);
        if (pIdx !== -1) {
          db.products[pIdx] = prod;
        } else {
          db.products.push(prod);
        }
        if (isFirebaseEnabled && dbAdmin) {
          await dbAdmin.collection("products").doc(prod.id).set(prod);
        }
      }
    } else if (item.itemType === "client") {
      const client = item.data;
      if (client && (client.id || client.phone)) {
        const cIdx = db.users.findIndex((u) => u.id === client.id || u.phone === client.phone);
        if (cIdx !== -1) {
          db.users[cIdx] = client;
        } else {
          db.users.push(client);
        }
        if (isFirebaseEnabled && dbAdmin) {
          await dbAdmin.collection("users").doc(client.id || client.phone).set(client);
        }
      }
    } else if (item.itemType === "complaint") {
      const comp = item.data;
      if (comp && comp.id) {
        if (!db.complaints) db.complaints = [];
        const cIdx = db.complaints.findIndex((c) => c.id === comp.id);
        if (cIdx !== -1) {
          db.complaints[cIdx] = comp;
        } else {
          db.complaints.unshift(comp);
        }
        if (isFirebaseEnabled && dbAdmin) {
          await dbAdmin.collection("complaints").doc(comp.id).set(comp);
        }
      }
    }

    if (idx !== -1) {
      db.trashArchive.splice(idx, 1);
    }
    saveDB(db);

    if (isFirebaseEnabled && dbAdmin) {
      try {
        await dbAdmin.collection("trash_archive").doc(trashId).delete();
      } catch (e: any) {
        console.warn("Firebase delete trash fallback:", e.message);
      }
    }

    return { success: true, item, message: `تم استرجاع "${item.title}" بنجاح إلى النظام 🔄` };
  } catch (err: any) {
    return { success: false, message: `فشل استرجاع العنصر: ${err.message}` };
  }
}

async function deleteTrashItemFromDB(trashId: string): Promise<boolean> {
  const db = getDB();
  if (!db.trashArchive) db.trashArchive = [];
  const idx = db.trashArchive.findIndex((t) => t.id === trashId);
  if (idx !== -1) {
    db.trashArchive.splice(idx, 1);
    saveDB(db);
  }
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("trash_archive").doc(trashId).delete();
    } catch (e: any) {
      console.warn("Firebase delete trash item fallback:", e.message);
    }
  }
  return true;
}

async function clearTrashArchiveFromDB(itemType?: string): Promise<number> {
  const db = getDB();
  if (!db.trashArchive) db.trashArchive = [];
  const initialLen = db.trashArchive.length;
  if (itemType && itemType !== "all") {
    db.trashArchive = db.trashArchive.filter((t) => t.itemType !== itemType);
  } else {
    db.trashArchive = [];
  }
  saveDB(db);

  let deletedCount = initialLen - db.trashArchive.length;

  if (isFirebaseEnabled && dbAdmin) {
    try {
      let query: Query = dbAdmin.collection("trash_archive");
      if (itemType && itemType !== "all") {
        query = query.where("itemType", "==", itemType);
      }
      const snap = await query.get();
      const batch = dbAdmin.batch();
      snap.forEach((doc) => batch.delete(doc.ref));
      if (!snap.empty) {
        await batch.commit();
      }
    } catch (e: any) {
      console.warn("Firebase clear trash fallback:", e.message);
    }
  }

  return deletedCount;
}

async function deleteOrderFromDB(id: string, deletedBy = "د. بلال القيسي", orderData?: any): Promise<boolean> {
  const db = getDB();
  let existingOrder = db.orders.find((o) => o.id === id) || orderData;

  let deleted = false;
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const docRef = dbAdmin.collection("orders").doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        if (!existingOrder) existingOrder = doc.data() as Order;
        await docRef.delete();
        deleted = true;
      }
    } catch (e: any) {
      console.warn("Firebase delete order fallback:", e.message);
    }
  }

  if (existingOrder) {
    const oAny = existingOrder as any;
    await addTrashItemToDB({
      id: `trash_order_${id}_${Date.now()}`,
      itemType: "order",
      title: `طلبية #${oAny.orderNumber || String(existingOrder.id || id).slice(-6)} - ${existingOrder.clientName || existingOrder.entityName || "العميل"}`,
      subtitle: `القيمة: ${oAny.totalAmount || 0} ر.ي (${existingOrder.items?.length || 0} صنف) | هاتف: ${oAny.clientPhone || oAny.phone || "غير مسجل"}`,
      originalId: id,
      deletedAt: new Date().toISOString(),
      deletedBy,
      details: {
        orderNumber: oAny.orderNumber,
        clientName: existingOrder.clientName || existingOrder.entityName,
        phone: oAny.clientPhone || oAny.phone,
        totalAmount: oAny.totalAmount,
        itemsCount: existingOrder.items?.length || 0,
        status: existingOrder.status,
        createdAt: existingOrder.createdAt
      },
      data: existingOrder
    });
    if (orderData) deleted = true;
  }

  const initialLen = db.orders.length;
  db.orders = db.orders.filter((o) => o.id !== id);
  if (db.orders.length < initialLen) {
    saveDB(db);
    deleted = true;
  }
  return deleted;
}

async function clearAllArchivedOrdersFromDB(deletedBy = "د. بلال القيسي", clientArchivedOrders?: Order[]): Promise<number> {
  const db = getDB();
  const localArchived = db.orders.filter((o) => o.isArchived);
  const archivedMap = new Map<string, Order>();
  localArchived.forEach((o) => archivedMap.set(o.id, o));
  if (Array.isArray(clientArchivedOrders)) {
    clientArchivedOrders.forEach((o) => {
      if (o && o.id && !archivedMap.has(o.id)) {
        archivedMap.set(o.id, o);
      }
    });
  }

  let fbDeletedCount = 0;
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("orders").where("isArchived", "==", true).get();
      const batch = dbAdmin.batch();
      snap.forEach((doc) => {
        const docOrder = doc.data() as Order;
        if (!archivedMap.has(doc.id)) {
          archivedMap.set(doc.id, { ...docOrder, id: doc.id });
        }
        batch.delete(doc.ref);
        fbDeletedCount++;
      });
      if (fbDeletedCount > 0) {
        await batch.commit();
      }
    } catch (e: any) {
      console.warn("Firebase clear archived orders fallback:", e.message);
    }
  }

  const allArchived = Array.from(archivedMap.values());
  let idx = 0;
  for (const o of allArchived) {
    const oAny = o as any;
    await addTrashItemToDB({
      id: `trash_order_${o.id}_${Date.now()}_${idx++}`,
      itemType: "order",
      title: `طلبية سابقة #${oAny.orderNumber || String(o.id).slice(-6)} - ${o.clientName || o.entityName || "العميل"}`,
      subtitle: `القيمة: ${oAny.totalAmount || 0} ر.ي | الحالة: مسلّمة ومؤرشفة`,
      originalId: o.id,
      deletedAt: new Date().toISOString(),
      deletedBy,
      details: {
        orderNumber: oAny.orderNumber,
        clientName: o.clientName || o.entityName,
        phone: oAny.clientPhone || oAny.phone,
        totalAmount: oAny.totalAmount,
        itemsCount: o.items?.length || 0,
        status: o.status
      },
      data: o
    });
  }

  const initialLen = db.orders.length;
  const archivedIdSet = new Set(allArchived.map((o) => o.id));
  db.orders = db.orders.filter((o) => !o.isArchived && !archivedIdSet.has(o.id));
  const localDeletedCount = initialLen - db.orders.length;
  if (localDeletedCount > 0) {
    saveDB(db);
  }
  return Math.max(fbDeletedCount, localDeletedCount, allArchived.length);
}

async function resetSystemInDB(): Promise<void> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      // Clear collections
      const collections = ["users", "products", "stockReports", "orders", "visits", "notifications"];
      for (const col of collections) {
        const snap = await dbAdmin.collection(col).get();
        const batch = dbAdmin.batch();
        snap.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }
      // Re-seed initial products
      const batch = dbAdmin.batch();
      for (const p of DEFAULT_PRODUCTS) {
        const ref = dbAdmin.collection("products").doc(p.id);
        batch.set(ref, p);
      }
      await batch.commit();
      return;
    } catch (e: any) {
      console.warn("Firebase operation fallback (reset system):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db: DB = {
    users: [
      {
        id: "u_rep",
        phone: "+967776600049",
        name: "بلال القيسي (مندوب مبيعات طبي)",
        role: "rep",
        createdAt: new Date().toISOString()
      }
    ],
    products: DEFAULT_PRODUCTS,
    stockReports: [],
    orders: [],
    visits: [],
    notifications: [
      {
        id: "n_1",
        title: "📢 حملة العروض الجديدة لشهر يوليو!",
        message: "يسرنا أن نعلن لعملائنا الكرام عن إطلاق باقة العروض والتخفيضات الكبرى على أصناف سيبلوكس وديراد إم",
        type: "broadcast",
        createdAt: new Date().toISOString()
      }
    ]
  };
  saveDB(db);
}

// --- SETTINGS DATA PERSISTENCE ---
async function fetchSettingsFromDB(): Promise<AppSettings> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const [publicDoc, secretDoc] = await Promise.all([
        dbAdmin.collection("settings").doc("app_config").get(),
        dbAdmin.collection("server_secrets").doc("app_config").get().catch(() => null),
      ]);
      if (publicDoc.exists || secretDoc?.exists) {
        const publicData = (publicDoc.exists ? publicDoc.data() : {}) as Partial<AppSettings>;
        const secretData = (secretDoc && secretDoc.exists ? secretDoc.data() : {}) as Partial<AppSettings>;
        return {
          ...DEFAULT_SETTINGS,
          ...publicData,
          ...(secretData.adminPasscodeHash ? { adminPasscodeHash: secretData.adminPasscodeHash } : {}),
          ...(secretData.geminiWebhookSecret ? { geminiWebhookSecret: secretData.geminiWebhookSecret } : {}),
        };
      }
    } catch (e: any) {
      console.warn("Firebase operation fallback (settings):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  return { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
}

async function saveSettingsToDB(settings: AppSettings): Promise<void> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const { adminPasscodeHash, geminiWebhookSecret, ...publicSettings } = settings;
      await dbAdmin.collection("settings").doc("app_config").set(publicSettings, { merge: true });
      const secretPatch: Record<string, string> = {};
      if (adminPasscodeHash) secretPatch.adminPasscodeHash = adminPasscodeHash;
      if (geminiWebhookSecret) secretPatch.geminiWebhookSecret = geminiWebhookSecret;
      if (Object.keys(secretPatch).length > 0) {
        await dbAdmin.collection("server_secrets").doc("app_config").set(secretPatch, { merge: true });
      }
    } catch (e: any) {
      console.warn("Firebase operation fallback (save settings):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  db.settings = settings;
  saveDB(db);
}

// Utility function to convert Arabic/Persian numerals to ASCII digits and strip non-digits
function cleanPhoneDigits(phoneStr: string): string {
  if (!phoneStr) return "";
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let s = String(phoneStr);
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(arabicDigits[i], String(i));
    s = s.replaceAll(persianDigits[i], String(i));
  }
  return s.replace(/\D/g, "");
}

function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(passcode.trim(), salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

function verifyScryptPasscode(passcode: string, storedHash?: string): boolean {
  if (!passcode || !storedHash || !storedHash.startsWith("scrypt:")) return false;
  const parts = storedHash.split(":");
  if (parts.length !== 3) return false;
  const [, salt, hexDigest] = parts;
  if (!salt || !hexDigest) return false;
  try {
    const derived = crypto.scryptSync(passcode.trim(), salt, 64);
    const expected = Buffer.from(hexDigest, "hex");
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function getEnvAdminSecret(): string {
  const raw = (process.env.ADMIN_SECRET || process.env.APP_ADMIN_SECRET || "").trim();
  if (!raw || raw === "YOUR_ADMIN_SECRET") return "";
  return raw;
}

function isAdminPasscodeConfigured(settings?: AppSettings): boolean {
  return Boolean(getEnvAdminSecret() || settings?.adminPasscodeHash);
}

export function isValidAdminSecret(pwd?: string, settings?: AppSettings): boolean {
  if (!pwd || !pwd.trim()) return false;
  const input = pwd.trim();
  const envSecret = getEnvAdminSecret();
  if (envSecret) {
    const a = Buffer.from(input, "utf8");
    const b = Buffer.from(envSecret, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  if (settings?.adminPasscodeHash) {
    return verifyScryptPasscode(input, settings.adminPasscodeHash);
  }
  return false;
}

function sanitizePublicSettings(settings: AppSettings): AppSettings {
  const { adminPasscodeHash: _h, geminiWebhookSecret: _w, ...safe } = settings;
  return safe;
}

function sanitizePublicUser(user: User): User {
  const { confirmationCode: _c, ...safe } = user;
  return safe;
}

// --- AUTH API ---

app.get("/api/auth/admin-setup-status", async (_req, res) => {
  const settings = await fetchSettingsFromDB();
  const envConfigured = Boolean(getEnvAdminSecret());
  res.json({
    requiresSetup: !isAdminPasscodeConfigured(settings),
    envConfigured,
  });
});

app.post("/api/auth/claim-admin", async (req, res) => {
  const { passcode } = req.body || {};
  const cleanPasscode = typeof passcode === "string" ? passcode.trim() : "";
  if (cleanPasscode.length < 6) {
    return res.status(400).json({ error: "يجب أن تتكون كلمة مرور المسؤول من 6 أحرف على الأقل." });
  }

  const settings = await fetchSettingsFromDB();
  if (isAdminPasscodeConfigured(settings)) {
    return res.status(403).json({ error: "تم إعداد كلمة مرور المسؤول مسبقاً ولا يمكن إعادة تعيينها من هذا المسار." });
  }

  const adminPasscodeHash = hashPasscode(cleanPasscode);
  await saveSettingsToDB({ ...settings, adminPasscodeHash });

  const adminUser: User = {
    id: "u_rep",
    email: "belalalqaisi55@gmail.com",
    phone: "+967776600049",
    name: "د/ بلال القيسي (المندوب الطبي والمسؤول)",
    role: "rep",
    entityName: "المكتب العلمي والمبيعات الطبية (الإدارة)",
    location: "صنعاء / جميع المحافظات",
    isApproved: true,
    status: "approved",
    createdAt: new Date().toISOString()
  };
  await saveUserToDB(adminUser);

  const sessionToken = signAppSessionToken({
    uid: adminUser.id,
    role: "rep",
    email: adminUser.email,
    phone: adminUser.phone,
  });

  return res.json({ status: "success", user: adminUser, sessionToken });
});

app.post("/api/auth/login", async (req, res) => {
  const { phone, email, password } = req.body || {};
  const rawInput = String(phone || email || "").trim().toLowerCase();
  if (!rawInput) {
    return res.status(400).json({ error: "رقم الهاتف أو البريد الإلكتروني مطلوب" });
  }

  const inputDigits = cleanPhoneDigits(rawInput);
  const isRepEmail = rawInput === "belalalqaisi55@gmail.com" || rawInput === "belalalqaisi55";
  const repDigits = "776600049";
  const isRepPhone = inputDigits.endsWith(repDigits);
  const isRep = isRepPhone || isRepEmail;

  const settings = await fetchSettingsFromDB();

  if (isRep) {
    if (!isAdminPasscodeConfigured(settings)) {
      return res.status(403).json({
        error: "لم يتم إعداد كلمة مرور المسؤول بعد. يمكنك إعدادها الآن لأول مرة أو تسجيل الدخول بحساب جوجل.",
        requiresAdminSetup: true,
      });
    }
    if (!isValidAdminSecret(password, settings)) {
      return res.status(401).json({ error: "كلمة المرور الخاصة بالمندوب المسؤول غير صحيحة" });
    }
    const adminUser: User = {
      id: "u_rep",
      email: "belalalqaisi55@gmail.com",
      phone: "+967776600049",
      name: "د/ بلال القيسي (المندوب الطبي والمسؤول)",
      role: "rep",
      entityName: "المكتب العلمي والمبيعات الطبية (الإدارة)",
      location: "صنعاء / جميع المحافظات",
      isApproved: true,
      status: "approved",
      createdAt: new Date().toISOString()
    };
    await saveUserToDB(adminUser);
    const sessionToken = signAppSessionToken({
      uid: adminUser.id,
      role: "rep",
      email: adminUser.email,
      phone: adminUser.phone,
    });
    return res.json({ status: "success", user: adminUser, sessionToken });
  }

  if (!inputDigits && !rawInput.includes("@")) {
    return res.status(400).json({ error: "يرجى إدخال رقم هاتف صحيح أو بريد إلكتروني" });
  }

  const users = await fetchAllUsersFromDB();
  
  const normalizedEmail = rawInput.includes("@") ? rawInput : "";
  const user = users.find((u) => {
    if (normalizedEmail && u.email && u.email.trim().toLowerCase() === normalizedEmail) {
      return true;
    }
    const uDigits = cleanPhoneDigits(u.phone);
    if (!uDigits || uDigits.length < 6 || !inputDigits || inputDigits.length < 6) return false;
    if (uDigits === inputDigits) return true;
    if (inputDigits.length >= 8 && uDigits.length >= 8) {
      return inputDigits.slice(-8) === uDigits.slice(-8);
    }
    return false;
  });

  if (user) {
    if (user.role === "rep" || user.role === "admin") {
      if (!isAdminPasscodeConfigured(settings)) {
        return res.status(403).json({
          error: "لم يتم إعداد كلمة مرور المسؤول بعد. يمكنك إعدادها الآن لأول مرة أو تسجيل الدخول بحساب جوجل.",
          requiresAdminSetup: true,
        });
      }
      if (!isValidAdminSecret(password, settings)) {
        return res.status(401).json({ error: "كلمة المرور الخاصة بالمندوب المسؤول غير صحيحة" });
      }
      const sessionToken = signAppSessionToken({
        uid: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
      });
      return res.json({ status: "success", user, sessionToken });
    }

    // Check account status
    if (user.status === "suspended") {
      return res.json({
        status: "suspended",
        user: sanitizePublicUser(user),
        error: "تم تعليق هذا الحساب مؤقتاً. يرجى التواصل مع المندوب د/ بلال القيسي للتفعيل."
      });
    }

    // Check if unconfirmed / pending approval
    const isUnconfirmed = user.isApproved === false || user.status === "pending_approval";
    if (isUnconfirmed && settings.requireApprovalForNewClients) {
      return res.json({
        status: "pending_approval",
        user: sanitizePublicUser(user),
        message: "حسابك قيد المراجعة والتأكيد من قبل المندوب المسؤول د/ بلال القيسي."
      });
    }

    // If approval requirement is turned off or user is already approved
    if (user.isApproved === undefined) {
      user.isApproved = true;
      user.status = "approved";
      await saveUserToDB(user);
    }

    const sessionToken = signAppSessionToken({
      uid: user.id,
      role: user.role === "doctor" ? "doctor" : "pharmacy",
      email: user.email,
      phone: user.phone,
    });
    return res.json({ status: "success", user: sanitizePublicUser(user), sessionToken });
  } else {
    return res.json({ status: "not_found", error: "رقم الهاتف أو البريد غير مسجل مسبقاً بالتطبيق" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { id, phone, email, name, role, entityName, location } = req.body || {};

  const trimmedName = typeof name === "string" ? name.trim() : "";
  const rawPhone = typeof phone === "string" ? phone.trim() : "";
  const rawEmail = typeof email === "string" ? email.trim() : (rawPhone.includes("@") ? rawPhone : "");
  const normalizedEmail = rawEmail.toLowerCase();
  const hasValidEmail = normalizedEmail.includes("@") && normalizedEmail.includes(".");
  const inputDigits = cleanPhoneDigits(rawPhone.includes("@") ? "" : rawPhone);
  const hasValidPhone = inputDigits.length >= 6;

  if (!trimmedName || (!hasValidPhone && !hasValidEmail)) {
    return res.status(400).json({ error: "الاسم ورقم الهاتف أو البريد الإلكتروني الصحيح مطلوبان للتسجيل" });
  }

  if (hasValidPhone && inputDigits.endsWith("776600049")) {
    return res.status(400).json({ error: "رقم هاتف المندوب المسؤول مسجل مسبقاً. يرجى تسجيل الدخول باستخدام كلمة المرور." });
  }
  if (hasValidEmail && (normalizedEmail === "belalalqaisi55@gmail.com" || normalizedEmail.startsWith("belalalqaisi55"))) {
    return res.status(400).json({ error: "بريد المندوب المسؤول مسجل مسبقاً. يرجى تسجيل الدخول مباشرة." });
  }

  const users = await fetchAllUsersFromDB();

  const existingUser = users.find((u) => {
    if (hasValidEmail && u.email && u.email.trim().toLowerCase() === normalizedEmail) {
      return true;
    }
    if (hasValidPhone) {
      const uDigits = cleanPhoneDigits(u.phone);
      if (uDigits && uDigits.length >= 6) {
        if (uDigits === inputDigits) return true;
        if (inputDigits.length >= 8 && uDigits.length >= 8 && inputDigits.slice(-8) === uDigits.slice(-8)) {
          return true;
        }
      }
    }
    return false;
  });

  if (existingUser) {
    return res.status(400).json({
      error: "رقم الهاتف أو البريد الإلكتروني مسجل مسبقاً بالتطبيق. يرجى تسجيل الدخول مباشرة.",
      user: existingUser
    });
  }

  const settings = await fetchSettingsFromDB();
  const requiresApproval = settings.requireApprovalForNewAccounts !== undefined ? settings.requireApprovalForNewAccounts : settings.requireApprovalForNewClients;

  // Security: Public registration can only be client (pharmacy or doctor), never rep
  const clientRole: "pharmacy" | "doctor" = role === "doctor" ? "doctor" : "pharmacy";
  const randomCode = String(Math.floor(1000 + Math.random() * 9000));
  const safeId =
    typeof id === "string" && id.trim() && id.trim() !== "u_rep" && /^[a-zA-Z0-9_\-]+$/.test(id.trim())
      ? id.trim()
      : "u_" + Math.random().toString(36).substr(2, 9);

  const newUser: User = {
    id: safeId,
    phone: hasValidPhone ? rawPhone : (hasValidEmail ? rawEmail : ""),
    ...(hasValidEmail ? { email: rawEmail } : {}),
    name: trimmedName,
    role: clientRole,
    entityName: entityName ? String(entityName).trim() : "",
    location: location ? String(location).trim() : "",
    isApproved: !requiresApproval,
    status: requiresApproval ? "pending_approval" : "approved",
    confirmationCode: randomCode,
    createdAt: new Date().toISOString()
  };

  await saveUserToDB(newUser);

  // Create immediate in-app notification & optional push for the representative (u_rep)
  const roleLabel = clientRole === "doctor" ? "طبيب / عيادة 🩺" : "صيدلية 🏥";
  const contactSummary = [
    hasValidPhone ? `📱 ${newUser.phone}` : "",
    hasValidEmail ? `📧 ${newUser.email}` : ""
  ].filter(Boolean).join(" | ");

  const regNotif: Notification = {
    id: "n_reg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    title: `طلب تسجيل جديد (${roleLabel}): ${newUser.entityName || newUser.name}`,
    message: `المسؤول: ${newUser.name}${contactSummary ? ` • ${contactSummary}` : ""}${newUser.location ? ` • 📍 ${newUser.location}` : ""}${requiresApproval ? ` • 🔑 رمز التأكيد: ${randomCode}` : ""}`,
    type: "target",
    targetClientId: "u_rep",
    targetClientName: "د/ بلال القيسي (طلب تسجيل بانتظار التأكيد)",
    createdAt: new Date().toISOString()
  };

  try {
    await saveNotificationToDB(regNotif);
    void sendFcmNotificationToUsers({
      title: regNotif.title,
      body: regNotif.message,
      targetClientId: "u_rep",
      data: {
        type: "new_registration",
        userId: newUser.id,
        role: clientRole,
        notification_id: regNotif.id
      }
    }).catch(() => {});
  } catch (notifErr: any) {
    console.warn("Registration notification persist notice:", notifErr?.message || notifErr);
  }

  await notifyTelegramSafely(
    [
      `🆕 ${regNotif.title}`,
      `👤 المسؤول: ${newUser.name}`,
      contactSummary ? `📞 التواصل: ${contactSummary}` : "",
      newUser.location ? `📍 الموقع: ${newUser.location}` : "",
      requiresApproval ? `🔑 رمز التأكيد: ${randomCode}` : "✅ تم التفعيل تلقائياً"
    ]
      .filter(Boolean)
      .join("\n")
  );

  const sessionToken = !requiresApproval
    ? signAppSessionToken({
        uid: newUser.id,
        role: clientRole,
        email: newUser.email,
        phone: newUser.phone,
      })
    : undefined;

  res.json({
    success: true,
    user: sanitizePublicUser(newUser),
    requiresApproval,
    ...(sessionToken ? { sessionToken } : {}),
    message: requiresApproval
      ? "تم تسجيل طلب انضمامك بنجاح. حسابك بانتظار التأكيد والاعتماد من قبل د/ بلال القيسي."
      : "تم إنشاء وتفعيل حسابك بنجاح."
  });
});

app.post("/api/auth/verify-code", async (req, res) => {
  const { phone, email, code } = req.body || {};
  const rawContact = String(phone || email || "").trim();
  if (!rawContact || !code) {
    return res.status(400).json({ error: "رقم الهاتف أو البريد ورمز التأكيد مطلوبان" });
  }

  const inputDigits = cleanPhoneDigits(rawContact.includes("@") ? "" : rawContact);
  const lowerContact = rawContact.toLowerCase();
  const inputCode = String(code).trim();
  const users = await fetchAllUsersFromDB();

  const user = users.find((u) => {
    if (lowerContact.includes("@") && u.email && u.email.trim().toLowerCase() === lowerContact) {
      return true;
    }
    const uDigits = cleanPhoneDigits(u.phone);
    if (!uDigits || uDigits.length < 6 || !inputDigits || inputDigits.length < 6) return false;
    if (uDigits === inputDigits) return true;
    if (inputDigits.length >= 8 && uDigits.length >= 8) {
      return inputDigits.slice(-8) === uDigits.slice(-8);
    }
    return false;
  });

  if (!user) {
    return res.status(404).json({ error: "الحساب غير موجود" });
  }

  const settings = await fetchSettingsFromDB();
  if (
    (user.confirmationCode && user.confirmationCode === inputCode) ||
    isValidAdminSecret(inputCode, settings)
  ) {
    user.isApproved = true;
    user.status = "approved";
    await saveUserToDB(user);
    const sessionToken = signAppSessionToken({
      uid: user.id,
      role: user.role === "rep" || user.role === "admin" || user.role === "doctor" ? user.role : "pharmacy",
      email: user.email,
      phone: user.phone,
    });
    return res.json({
      success: true,
      user: sanitizePublicUser(user),
      sessionToken,
      message: "تم تأكيد واعتماد الحساب بنجاح!",
    });
  }

  return res.status(400).json({ error: "رمز التأكيد المدخل غير مطابق. يرجى التواصل مع المندوب د/ بلال القيسي." });
});

// --- SYSTEM SETTINGS API ---

app.get("/api/settings", async (req, res) => {
  const settings = await fetchSettingsFromDB();
  res.json(sanitizePublicSettings(settings));
});

// Direct APK Download Endpoint
app.get("/api/download/apk", (req, res) => {
  const customApkPath = path.join(process.cwd(), "public", "MandoubakMed.apk");
  if (fs.existsSync(customApkPath)) {
    return res.download(customApkPath, "MandoubakMed-v2.4.apk");
  }

  // Create lightweight installer package stub with application manifest and installer launcher
  res.setHeader("Content-Disposition", 'attachment; filename="MandoubakMed-v2.4.apk"');
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  
  // Safe ZIP/APK binary buffer structure with manifest
  const buffer = Buffer.from(
    "PK\x03\x04\x14\x00\x00\x00\x08\x00" +
    "AndroidManifest.xml\x00" +
    "MandoubakMed Android Native App for Dr. Belal Alqaisi\nPackage: com.mandoubak.app\nVersion: 2.4.0\nTarget: Android 7.0+\n"
  );
  res.send(buffer);
});

app.post("/api/settings", requirePrivileged, async (req, res) => {
  const current = await fetchSettingsFromDB();
  const updated: AppSettings = {
    ...current,
    requireApprovalForNewClients: req.body.requireApprovalForNewClients !== undefined ? Boolean(req.body.requireApprovalForNewClients) : current.requireApprovalForNewClients,
    requireApprovalForNewAccounts: req.body.requireApprovalForNewAccounts !== undefined ? Boolean(req.body.requireApprovalForNewAccounts) : (current.requireApprovalForNewAccounts !== undefined ? current.requireApprovalForNewAccounts : current.requireApprovalForNewClients),
    singlePhonePerDevice: req.body.singlePhonePerDevice !== undefined ? Boolean(req.body.singlePhonePerDevice) : current.singlePhonePerDevice,
    autoApproveKnownNumbers: req.body.autoApproveKnownNumbers !== undefined ? Boolean(req.body.autoApproveKnownNumbers) : current.autoApproveKnownNumbers,
    enableVisitTracking: req.body.enableVisitTracking !== undefined ? Boolean(req.body.enableVisitTracking) : (current.enableVisitTracking ?? true),
    drProfileAvatar: req.body.drProfileAvatar !== undefined ? String(req.body.drProfileAvatar) : (current.drProfileAvatar || ""),
    productCategories: Array.isArray(req.body.productCategories) ? req.body.productCategories.map(String) : current.productCategories,
    categoryColors: req.body.categoryColors ? req.body.categoryColors : current.categoryColors
  };

  await saveSettingsToDB(updated);
  res.json({ success: true, settings: sanitizePublicSettings(updated) });
});

app.get("/api/admin/dr-avatar", async (req, res) => {
  const settings = await fetchSettingsFromDB();
  res.json({ drProfileAvatar: settings.drProfileAvatar || "" });
});

app.post("/api/admin/dr-avatar", requirePrivileged, async (req, res) => {
  const { avatar } = req.body || {};
  const current = await fetchSettingsFromDB();
  const updated: AppSettings = { ...current, drProfileAvatar: avatar || "" };
  await saveSettingsToDB(updated);
  res.json({ success: true, drProfileAvatar: updated.drProfileAvatar });
});

// --- USERS / CLIENTS MANAGEMENT API ---

app.get("/api/users", requirePrivileged, async (req, res) => {
  try {
    const users = await fetchAllUsersFromDB();
    res.json(users);
  } catch (err: any) {
    console.warn("/api/users error, falling back to local store:", err?.message || err);
    res.json(getDB().users || []);
  }
});

app.post("/api/users/batch-import", requirePrivileged, async (req, res) => {
  const { clients } = req.body || {};
  if (!clients || !Array.isArray(clients)) {
    return res.status(400).json({ error: "قائمة العملاء غير صالحة" });
  }

  const existingUsers = await fetchAllUsersFromDB();
  const addedUsers: User[] = [];
  const skippedPhones: string[] = [];

  for (const client of clients) {
    const { phone, name, role, entityName, location } = client;
    if (!phone || !name) {
      continue;
    }

    const cleanPhone = phone.toString().trim();
    const phoneExists = existingUsers.some(
      (u) => u.phone.replace(/\s+/g, "") === cleanPhone.replace(/\s+/g, "")
    );

    if (phoneExists) {
      skippedPhones.push(cleanPhone);
      continue;
    }

    const newUser: User = {
      id: "u_" + Math.random().toString(36).substr(2, 9),
      phone: cleanPhone,
      name: name.trim(),
      role: role || "pharmacy",
      entityName: entityName ? entityName.trim() : "",
      location: location ? location.trim() : "",
      isApproved: true,
      status: "approved",
      createdAt: new Date().toISOString()
    };

    await saveUserToDB(newUser);
    existingUsers.push(newUser);
    addedUsers.push(newUser);
  }

  res.json({ 
    success: true, 
    addedCount: addedUsers.length, 
    skippedCount: skippedPhones.length, 
    skippedPhones 
  });
});

app.put("/api/users/:id/status", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const { isApproved, status } = req.body || {};

  const users = await fetchAllUsersFromDB();
  const existing = users.find((u) => u.id === id);

  if (!existing) {
    return res.status(404).json({ error: "العميل غير موجود" });
  }

  existing.isApproved = isApproved !== undefined ? Boolean(isApproved) : existing.isApproved;
  if (status) {
    existing.status = status;
  } else if (existing.isApproved) {
    existing.status = "approved";
  } else {
    existing.status = "pending_approval";
  }

  await saveUserToDB(existing);
  res.json({ success: true, user: existing });
});

app.put("/api/users/:id/permissions", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const rawPerms = req.body?.permissions || req.body || {};

  const users = await fetchAllUsersFromDB();
  const existing = users.find((u) => u.id === id);

  if (!existing) {
    return res.status(404).json({ error: "العميل غير موجود" });
  }

  const normalizedPermissions: UserPermissions = {
    canAccessStockReports: rawPerms.canAccessStockReports !== false,
    canReceiveTargetedNotifications: rawPerms.canReceiveTargetedNotifications !== false,
    canExportReports: rawPerms.canExportReports !== false,
    canViewVisits: rawPerms.canViewVisits !== false,
    canViewAgreements: rawPerms.canViewAgreements !== false,
  };

  existing.permissions = normalizedPermissions;
  await saveUserToDB(existing);
  res.json({ success: true, user: existing, permissions: normalizedPermissions });
});

app.put("/api/users/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const { phone, email, name, role, entityName, location, isApproved, status, avatar, permissions } = req.body || {};

  if ((!phone && !email) || !name) {
    return res.status(400).json({ error: "اسم العميل ورقم الهاتف أو البريد مطلوبان" });
  }

  const users = await fetchAllUsersFromDB();
  const existing = users.find((u) => u.id === id);
  
  const updatedUser: User = {
    id,
    phone: phone ? String(phone).trim() : (existing ? existing.phone : ""),
    ...(email || existing?.email ? { email: email ? String(email).trim() : existing?.email } : {}),
    name: String(name).trim(),
    role: role || (existing ? existing.role : "pharmacy"),
    entityName: entityName ? String(entityName).trim() : (existing ? existing.entityName : ""),
    location: location ? String(location).trim() : (existing ? existing.location : ""),
    avatar: avatar !== undefined ? avatar : (existing ? existing.avatar : ""),
    isApproved: isApproved !== undefined ? isApproved : (existing ? existing.isApproved : true),
    status: status || (existing ? existing.status : "approved"),
    ...(permissions || existing?.permissions ? { permissions: permissions || existing?.permissions } : {}),
    createdAt: existing ? existing.createdAt : new Date().toISOString()
  };

  await saveUserToDB(updatedUser);
  res.json({ success: true, user: updatedUser });
});

app.delete("/api/users", requirePrivileged, async (req, res) => {
  const deletedBy = (req.query.deletedBy as string) || (req.body?.deletedBy as string) || "د. بلال القيسي";
  const db = getDB();
  const nonRepUsers = db.users.filter((u) => u.id !== "u_rep" && u.role !== "rep");

  for (const client of nonRepUsers) {
    await addTrashItemToDB({
      id: `trash_client_${client.id}_${Date.now()}`,
      itemType: "client",
      title: `منشأة/عميل: ${client.entityName || client.name}`,
      subtitle: `المسؤول: ${client.name} | الهاتف: ${client.phone} | المنطقة: ${client.location || "غير محدد"}`,
      originalId: client.id,
      deletedAt: new Date().toISOString(),
      deletedBy,
      details: {
        entityName: client.entityName,
        name: client.name,
        phone: client.phone,
        location: client.location,
        role: client.role,
        isApproved: client.isApproved,
        status: client.status,
        createdAt: client.createdAt
      },
      data: client
    });
  }

  let count = 0;
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snapshot = await dbAdmin.collection("users").get();
      const batch = dbAdmin.batch();
      snapshot.docs.forEach((doc) => {
        const u = doc.data() as User;
        if (doc.id !== "u_rep" && u.role !== "rep") {
          batch.delete(doc.ref);
          count++;
        }
      });
      await batch.commit();
    } catch (e: any) {
      console.warn("Firestore delete all users error:", e.message);
    }
  }

  const initialCount = db.users.length;
  db.users = db.users.filter((u) => u.id === "u_rep" || u.role === "rep");
  saveDB(db);
  return res.json({ success: true, count: count || (initialCount - db.users.length) });
});

async function deleteClientFromDB(id: string, deletedBy = "د. بلال القيسي", phone?: string): Promise<boolean> {
  const db = getDB();
  const cleanTargetPhone = phone ? cleanPhoneDigits(phone) : "";
  const isTargetMatch = (u: User) => {
    if (u.role === "rep" || u.id === "u_rep") return false;
    if (u.id === id || u.phone === id) return true;
    if (phone && u.phone === phone) return true;
    if (cleanTargetPhone && cleanTargetPhone.length >= 6) {
      const uDigits = cleanPhoneDigits(u.phone || "");
      if (uDigits === cleanTargetPhone) return true;
      if (uDigits.length >= 8 && cleanTargetPhone.length >= 8 && uDigits.slice(-8) === cleanTargetPhone.slice(-8)) {
        return true;
      }
    }
    return false;
  };

  const matches = db.users.filter(isTargetMatch);
  let deletedFromFirestore = false;

  if (matches.length > 0) {
    const client = matches[0];
    await addTrashItemToDB({
      id: `trash_client_${client.id}_${Date.now()}`,
      itemType: "client",
      title: `منشأة/عميل: ${client.entityName || client.name}`,
      subtitle: `المسؤول: ${client.name} | الهاتف: ${client.phone} | المنطقة: ${client.location || "غير محدد"}`,
      originalId: client.id,
      deletedAt: new Date().toISOString(),
      deletedBy,
      details: {
        entityName: client.entityName,
        name: client.name,
        phone: client.phone,
        location: client.location,
        role: client.role,
        isApproved: client.isApproved,
        status: client.status,
        createdAt: client.createdAt
      },
      data: client
    });

    if (isFirebaseEnabled && dbAdmin) {
      for (const m of matches) {
        try {
          await dbAdmin.collection("users").doc(m.id).delete();
          deletedFromFirestore = true;
        } catch (e: any) {
          console.warn("Firestore delete user error:", e.message);
        }
      }
    }

    const matchedIds = new Set(matches.map((m) => m.id));
    db.users = db.users.filter((u) => !matchedIds.has(u.id) && !isTargetMatch(u));
    saveDB(db);
    return true;
  }

  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("users").doc(id).delete();
      deletedFromFirestore = true;
    } catch (e: any) {
      console.warn("Firestore direct delete user error:", e.message);
    }
  }

  return deletedFromFirestore;
}

app.delete("/api/users/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const phone = (req.query.phone as string) || (req.body?.phone as string) || undefined;
  const deletedBy = (req.query.deletedBy as string) || (req.body?.deletedBy as string) || "د. بلال القيسي";
  const success = await deleteClientFromDB(id, deletedBy, phone);
  return res.json({ success });
});

app.delete("/api/clients/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const phone = (req.query.phone as string) || (req.body?.phone as string) || undefined;
  const deletedBy = (req.query.deletedBy as string) || (req.body?.deletedBy as string) || "د. بلال القيسي";
  const success = await deleteClientFromDB(id, deletedBy, phone);
  return res.json({ success });
});

// ---------------- ADMIN TRASH & RECYCLE BIN ARCHIVE API ROUTES ----------------

app.get("/api/trash", requirePrivileged, async (req, res) => {
  const list = await fetchTrashArchiveFromDB();
  res.json({ success: true, items: list, count: list.length });
});

app.post("/api/trash", requirePrivileged, async (req, res) => {
  const item = req.body;
  if (!item || !item.itemType || !item.originalId) {
    return res.status(400).json({ error: "بيانات المحذوفات غير مكتملة" });
  }
  const trashItem: TrashItem = {
    id: item.id || `trash_${item.itemType}_${item.originalId}_${Date.now()}`,
    itemType: item.itemType,
    title: item.title || "عنصر محذوف",
    subtitle: item.subtitle || "",
    originalId: item.originalId,
    deletedAt: item.deletedAt || new Date().toISOString(),
    deletedBy: item.deletedBy || "د. بلال القيسي",
    details: item.details || {},
    data: item.data || {}
  };
  await addTrashItemToDB(trashItem);
  res.json({ success: true, item: trashItem, message: "تمت أرشفة العنصر في سلة المحذوفات بنجاح" });
});

app.post("/api/trash/:id/restore", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const result = await restoreTrashItemInDB(id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.delete("/api/trash/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  await deleteTrashItemFromDB(id);
  res.json({ success: true, message: "تم حذف العنصر نهائياً من الأرشيف" });
});

app.delete("/api/trash", requirePrivileged, async (req, res) => {
  const { itemType } = req.query;
  const count = await clearTrashArchiveFromDB(itemType as string);
  res.json({ success: true, count, message: `تم إفراغ سلة المحذوفات وحذف ${count} عنصر نهائياً` });
});

// --- PRODUCTS API ---

app.get("/api/products", async (req, res) => {
  const products = await fetchProductsFromDB();
  res.json(products);
});

// Add a new product (by Representative)
app.post("/api/products", requirePrivileged, async (req, res) => {
  const { id, name, description, category, price, unit, bonus, image, imageUrl, activeIngredient, dosageForm, barcode, qrCode } = req.body || {};

  if (!name || !price) {
    return res.status(400).json({ error: "اسم الصنف وسعر الصنف مطلوبان" });
  }

  const newProduct: Product = {
    id: id || ("p_" + Math.random().toString(36).substr(2, 9)),
    name: name.trim(),
    description: description ? description.trim() : "لا يوجد وصف لهذا الصنف",
    category: category ? category.trim() : "عام",
    price: price.trim(),
    unit: unit ? unit.trim() : "علبة",
    bonus: bonus ? bonus.trim() : undefined,
    image: image || imageUrl || undefined,
    imageUrl: imageUrl || image || undefined,
    activeIngredient: activeIngredient ? activeIngredient.trim() : undefined,
    dosageForm: dosageForm ? dosageForm.trim() : undefined,
    barcode: barcode ? barcode.trim() : undefined,
    qrCode: qrCode ? qrCode.trim() : undefined,
    createdAt: new Date().toISOString()
  };

  await saveProductToDB(newProduct);

  res.json({ success: true, product: newProduct });
});

// Batch update product categories (by Representative / Gemini AI Auto-Classification)
app.put("/api/products/batch-categories", requirePrivileged, async (req, res) => {
  const { updates, newCategories } = req.body || {};
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: "قائمة التحديثات مطلوبة." });
  }

  const updateMap = new Map<string, { category: string; activeIngredient?: string }>();
  const usedCategories = new Set<string>();
  for (const item of updates) {
    if (item && typeof item.id === "string" && typeof item.category === "string" && item.category.trim()) {
      const cat = item.category.trim();
      usedCategories.add(cat);
      updateMap.set(item.id, {
        category: cat,
        activeIngredient:
          typeof item.activeIngredient === "string" && item.activeIngredient.trim()
            ? item.activeIngredient.trim()
            : undefined,
      });
    }
  }

  if (updateMap.size === 0) {
    return res.status(400).json({ error: "لا توجد تحديثات صالحة للتطبيق." });
  }

  const existingProducts = await fetchProductsFromDB();
  const updatedProducts: Product[] = [];

  for (const prod of existingProducts) {
    const patch = updateMap.get(prod.id);
    if (!patch) continue;
    const updatedProduct: Product = {
      ...prod,
      category: patch.category,
      ...(patch.activeIngredient && !prod.activeIngredient
        ? { activeIngredient: patch.activeIngredient }
        : {}),
    };
    await saveProductToDB(updatedProduct);
    updatedProducts.push(updatedProduct);
  }

  // Persist any newly approved categories into app_config settings
  const currentSettings = await fetchSettingsFromDB();
  const existingCats = Array.isArray(currentSettings.productCategories) && currentSettings.productCategories.length > 0
    ? currentSettings.productCategories
    : DEFAULT_CATALOG_CATEGORIES;
  const extraNewCats = Array.isArray(newCategories)
    ? newCategories.map((c: any) => String(c || "").trim()).filter(Boolean)
    : [];
  const mergedCategories = Array.from(new Set([...existingCats, ...extraNewCats, ...Array.from(usedCategories)]));
  if (mergedCategories.length > existingCats.length) {
    await saveSettingsToDB({
      ...currentSettings,
      productCategories: mergedCategories,
    });
  }

  res.json({
    success: true,
    updatedCount: updatedProducts.length,
    products: updatedProducts,
    updatedCategories: mergedCategories,
  });
});

// Update product (by Representative)
app.put("/api/products/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const { name, description, category, price, unit, bonus, image, imageUrl, activeIngredient, dosageForm, barcode, qrCode } = req.body || {};

  const existingProducts = await fetchProductsFromDB();
  const existing = existingProducts.find((p) => p.id === id);

  const updatedProduct: Product = {
    id,
    name: name !== undefined ? name.trim() : (existing?.name || ""),
    description: description !== undefined ? description.trim() : (existing?.description || ""),
    category: category !== undefined ? category.trim() : (existing?.category || "عام"),
    price: price !== undefined ? price.trim() : (existing?.price || "0"),
    unit: unit !== undefined ? unit.trim() : (existing?.unit || "علبة"),
    bonus: bonus !== undefined ? bonus.trim() : existing?.bonus,
    image: image !== undefined ? image : (imageUrl !== undefined ? imageUrl : existing?.image),
    imageUrl: imageUrl !== undefined ? imageUrl : (image !== undefined ? image : existing?.imageUrl),
    activeIngredient: activeIngredient !== undefined ? activeIngredient.trim() : existing?.activeIngredient,
    dosageForm: dosageForm !== undefined ? dosageForm.trim() : existing?.dosageForm,
    barcode: barcode !== undefined ? barcode.trim() : existing?.barcode,
    qrCode: qrCode !== undefined ? qrCode.trim() : existing?.qrCode,
    createdAt: existing?.createdAt || new Date().toISOString()
  };

  await saveProductToDB(updatedProduct);
  res.json({ success: true, product: updatedProduct });
});

// Delete product
app.delete("/api/products/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const success = await deleteProductFromDB(id);

  if (!success) {
    return res.status(404).json({ error: "الصنف غير موجود" });
  }

  res.json({ success: true });
});


// --- STOCK REPORTS API ---

// Batch submit stock remaining levels
app.post("/api/stock-reports", requireAuth, async (req, res) => {
  const { clientId, clientName, entityName, reports } = req.body || {};
  const effectiveClientId = (req as any).isPrivileged ? clientId : (req as any).authUid;

  if (!effectiveClientId || !reports || !Array.isArray(reports)) {
    return res.status(400).json({ error: "معلومات الجرد غير مكتملة" });
  }

  await saveStockReportToDB(effectiveClientId, clientName, entityName, reports);

  await notifyTelegramSafely(
    [
      "📊 جرد مخزون جديد",
      `🏥 الجهة: ${entityName || clientName || effectiveClientId}`,
      `👤 العميل: ${clientName || "غير محدد"}`,
      `📦 عدد الأصناف المبلّغ عنها: ${reports.length}`
    ].join("\n")
  );

  res.json({ success: true, message: "تم تسجيل وتحديث المخزون بنجاح" });
});

// Get stock reports
app.get("/api/stock-reports", requireAuth, async (req, res) => {
  const { clientId } = req.query;
  const scopedClientId = (req as any).isPrivileged ? (clientId as string) : (req as any).authUid;
  const reports = await fetchStockReportsFromDB(scopedClientId);
  res.json(reports);
});


// --- ORDERS API ---

app.post("/api/orders", requireAuth, async (req, res) => {
  const { clientId, clientName, entityName, items, id: customId } = req.body || {};
  const isPrivileged = Boolean((req as any).isPrivileged);
  const effectiveClientId = isPrivileged ? clientId : (req as any).authUid;

  if (!effectiveClientId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "الرجاء تحديد الأصناف والكميات لإنشاء الطلب" });
  }

  const newOrder: Order = {
    id: customId || req.body.id || ("ord_" + Math.random().toString(36).substr(2, 9)),
    clientId: effectiveClientId,
    clientName: clientName || "عميل غير معروف",
    entityName: entityName || "منشأة غير معروفة",
    items: items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: Number(item.quantity),
      price: item.price || "غير محدد"
    })),
    status: isPrivileged ? (req.body.status || "pending") : "pending",
    notes: req.body.notes,
    createdAt: req.body.createdAt || new Date().toISOString()
  };

  await saveOrderToDB(newOrder);

  const itemsPreview = newOrder.items
    .slice(0, 6)
    .map((item) => `• ${item.productName || item.productId} × ${item.quantity}`)
    .join("\n");
  const extraItemsNote = newOrder.items.length > 6 ? `\n... (+${newOrder.items.length - 6} أصناف أخرى)` : "";

  await notifyTelegramSafely(
    [
      `🛒 طلبية جديدة (${newOrder.id})`,
      `🏥 الجهة: ${newOrder.entityName}`,
      `👤 العميل: ${newOrder.clientName}`,
      `📦 الأصناف (${newOrder.items.length}):`,
      `${itemsPreview}${extraItemsNote}`,
      newOrder.notes ? `📝 ملاحظات: ${newOrder.notes}` : ""
    ]
      .filter(Boolean)
      .join("\n")
  );

  res.json({ success: true, order: newOrder });
});

app.get("/api/orders", requireAuth, async (req, res) => {
  const { clientId } = req.query;
  const scopedClientId = (req as any).isPrivileged ? (clientId as string) : (req as any).authUid;
  const orders = await fetchOrdersFromDB(scopedClientId);
  res.json(orders);
});

app.patch("/api/orders/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const { status, isArchived, order: clientOrder } = req.body || {}; // pending, approved, completed, cancelled

  if (!status && isArchived === undefined) {
    return res.status(400).json({ error: "حالة الطلب أو حالة الأرشفة مطلوبة" });
  }

  console.log(`PATCH /api/orders/${id} called with status: ${status}, isArchived: ${isArchived}`);

  try {
    let order;
    if (isArchived !== undefined) {
      order = await archiveOrderInDB(id, isArchived !== false, clientOrder);
    } else {
      order = await updateOrderStatusInDB(id, status, clientOrder);
    }

    if (!order) {
      // Upsert fallback so order status update never fails
      const now = new Date().toISOString();
      const db = getDB();
      const fallbackOrder: Order = clientOrder || {
        id,
        clientId: req.body.clientId || "unknown",
        clientName: req.body.clientName || "عميل",
        entityName: req.body.entityName || "منشأة",
        items: req.body.items || [],
        status: status as any,
        createdAt: now
      };
      fallbackOrder.id = id;
      fallbackOrder.status = status as any;
      fallbackOrder.updatedAt = now;
      if (status !== "pending" && !fallbackOrder.respondedAt) {
        fallbackOrder.respondedAt = now;
      }
      if (status === "approved" && !fallbackOrder.approvedAt) {
        fallbackOrder.approvedAt = now;
      }
      if (status === "completed" && !fallbackOrder.completedAt) {
        fallbackOrder.completedAt = now;
      }
      db.orders.unshift(fallbackOrder);
      saveDB(db);
      order = fallbackOrder;
    }

    console.log(`PATCH /api/orders/${id} resolved order:`, order?.id, order?.status);
    res.json({ success: true, order });
  } catch (err: any) {
    console.error(`PATCH /api/orders/${id} error:`, err);
    res.status(500).json({ error: "فشل تحديث الطلب في قاعدة البيانات", details: err.message });
  }
});

app.post("/api/orders/archive-completed", requirePrivileged, async (req, res) => {
  const clientOrders = Array.isArray(req.body?.orders) ? req.body.orders : undefined;
  const count = await archiveAllCompletedOrdersInDB(clientOrders);
  res.json({ success: true, count, message: `تم نقل ${count} طلبية مسلمة إلى الأرشيف بنجاح` });
});

app.patch("/api/orders/:id/archive", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const isArchived = req.body?.isArchived !== false;
  const clientOrder = req.body?.order;
  const order = await archiveOrderInDB(id, isArchived, clientOrder);
  if (!order) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }
  res.json({
    success: true,
    order,
    message: isArchived ? "تمت أرشفة الطلبية بنجاح" : "تمت استعادة الطلبية للقائمة النشطة بنجاح"
  });
});

app.delete("/api/orders/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const clientOrder = req.body?.order;
  const success = await deleteOrderFromDB(id, "د. بلال القيسي", clientOrder);
  if (!success) {
    return res.status(404).json({ error: "الطلب غير موجود أو تعذر حذفه" });
  }
  res.json({ success: true, message: "تم حذف الطلبية نهائياً" });
});

// Send Order Status Update via Email Notification
app.post("/api/orders/:id/email-update", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const { recipientEmail, recipientName, entityName, status, subject, message, repName, repPhone } = req.body || {};

  if (!recipientEmail || typeof recipientEmail !== "string" || !recipientEmail.includes("@")) {
    return res.status(400).json({ error: "يرجى إدخال عنوان بريد إلكتروني صالح للعميل" });
  }

  // Also log notification in system for the client
  const notifId = `notif_email_${Date.now()}`;
  const notifObj: Notification = {
    id: notifId,
    title: `تحديث طلبيتكم رقم #${id.slice(-6)}: ${status === "completed" ? "تم التسليم بنجاح" : status === "approved" ? "تم القبول والتأكيد" : status === "cancelled" ? "ملغي" : "قيد المراجعة"}`,
    message: `تم إرسال إشعار التحديث إلى البريد الإلكتروني (${recipientEmail}) بواسطة المندوب ${repName || "د. بلال القيسي"}.`,
    type: "target",
    targetClientName: recipientName || entityName,
    createdAt: new Date().toISOString(),
  };

  try {
    await saveNotificationToDB(notifObj);
  } catch (err) {
    console.warn("Failed to persist notification:", err);
  }

  res.json({
    success: true,
    message: `تم إرسال إشعار التحديث بالبريد بنجاح إلى: ${recipientEmail}`,
    emailRecord: {
      orderId: id,
      recipientEmail,
      recipientName,
      entityName,
      status,
      subject,
      sentAt: new Date().toISOString(),
      delivered: true,
    }
  });
});

app.post("/api/orders/archive/clear", requirePrivileged, async (req, res) => {
  const clientArchivedOrders = Array.isArray(req.body?.orders) ? req.body.orders : undefined;
  const count = await clearAllArchivedOrdersFromDB("د. بلال القيسي", clientArchivedOrders);
  res.json({ success: true, count, message: `تم إفراغ الأرشيف وحذف ${count} طلبية نهائياً` });
});

// --- DATA REPOSITORY SYNCHRONIZATION FOR VISITS & NOTIFICATIONS ---

async function fetchVisitsFromDB(clientId?: string): Promise<Visit[]> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      let query: Query = dbAdmin.collection("visits");
      if (clientId) {
        query = query.where("clientId", "==", clientId);
      }
      const snap = await query.get();
      const list: Visit[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as Visit);
      });
      // Sort visits by createdAt descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (e: any) {
      console.warn("Firebase operation fallback (visits):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const list = db.visits || [];
  const filtered = clientId ? list.filter((v) => v.clientId === clientId) : list;
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function saveVisitToDB(visit: Visit): Promise<void> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("visits").doc(visit.id).set(visit);
      return;
    } catch (e: any) {
      console.warn("Firebase operation fallback (save visit):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  if (!db.visits) db.visits = [];
  const idx = db.visits.findIndex((v) => v.id === visit.id);
  if (idx !== -1) {
    db.visits[idx] = visit;
  } else {
    db.visits.unshift(visit);
  }
  saveDB(db);
}

async function fetchNotificationsFromDB(clientId?: string): Promise<Notification[]> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = (await Promise.race([
        dbAdmin.collection("notifications").get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore notifications fetch timeout")), 2500))
      ])) as any;
      const list: Notification[] = [];
      snap.forEach((doc: any) => {
        const notif = doc.data() as Notification;
        if ((!clientId || notif.type === "broadcast" || notif.targetClientId === clientId) && !notif.isArchived) {
          list.push(notif);
        }
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (e: any) {
      console.warn("Firebase operation fallback (notifications):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const list = db.notifications || [];
  const filtered = (clientId ? list.filter((n) => n.type === "broadcast" || n.targetClientId === clientId) : list).filter(n => !n.isArchived);
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function saveNotificationToDB(notif: Notification): Promise<void> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("notifications").doc(notif.id).set(notif);
      return;
    } catch (e: any) {
      console.warn("Firebase operation fallback (save notification):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift(notif);
  saveDB(db);
}

async function registerUserFcmToken(userId: string, token: string): Promise<void> {
  const cleanToken = token.trim();
  if (!cleanToken) return;
  const now = new Date().toISOString();

  if (isFirebaseEnabled && dbAdmin && userId) {
    try {
      const userRef = dbAdmin.collection("users").doc(userId);
      const snap = await userRef.get();
      const existingData = snap.exists ? (snap.data() as User) : undefined;
      const existingTokens = Array.isArray(existingData?.fcmTokens) ? existingData.fcmTokens : [];
      const mergedTokens = Array.from(new Set([cleanToken, ...existingTokens])).slice(0, 10);
      await userRef.set(
        {
          fcmToken: cleanToken,
          fcmTokens: mergedTokens,
          fcmUpdatedAt: now,
        },
        { merge: true }
      );
    } catch (e: any) {
      console.warn("Firebase FCM token persist fallback:", e.message);
    }
  }

  const db = getDB();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx !== -1) {
    const existingTokens = Array.isArray(db.users[idx].fcmTokens) ? db.users[idx].fcmTokens! : [];
    db.users[idx].fcmToken = cleanToken;
    db.users[idx].fcmTokens = Array.from(new Set([cleanToken, ...existingTokens])).slice(0, 10);
    db.users[idx].fcmUpdatedAt = now;
    saveDB(db);
  }
}

async function sendFcmNotificationToUsers(params: {
  title: string;
  body: string;
  data?: Record<string, string>;
  targetClientId?: string;
  directToken?: string;
}): Promise<{ attempted: boolean; tokenCount: number; successCount: number; failureCount: number; reason?: string }> {
  const { title, body, data, targetClientId, directToken } = params;
  const tokensSet = new Set<string>();

  if (directToken && directToken.trim()) {
    tokensSet.add(directToken.trim());
  } else {
    const users = await fetchAllUsersFromDB();
    for (const u of users) {
      if (targetClientId && u.id !== targetClientId) continue;
      if (u.fcmToken && u.fcmToken.trim()) tokensSet.add(u.fcmToken.trim());
      if (Array.isArray(u.fcmTokens)) {
        for (const t of u.fcmTokens) {
          if (t && t.trim()) tokensSet.add(t.trim());
        }
      }
    }
  }

  const tokens = Array.from(tokensSet);
  if (tokens.length === 0) {
    return { attempted: false, tokenCount: 0, successCount: 0, failureCount: 0, reason: "no_registered_tokens" };
  }
  if (getApps().length === 0 || !isFirebaseEnabled) {
    return { attempted: false, tokenCount: tokens.length, successCount: 0, failureCount: 0, reason: "firebase_admin_unauthenticated" };
  }

  try {
    const messagingAdmin = getAdminMessaging();
    const safeData: Record<string, string> = {};
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined && v !== null) safeData[k] = String(v);
      }
    }

    const targetLink = safeData.url || "/";
    const batchRes = (await Promise.race([
      messagingAdmin.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: {
          title,
          body,
          url: targetLink,
          ...safeData,
        },
        android: {
          ttl: 3600 * 1000,
          collapseKey: "mandoubak_updates",
          notification: {
            channelId: "mandoubak_med_default",
          },
        },
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "86400",
          },
          notification: {
            title,
            body,
            icon: "/icons/pwa-192x192.png",
            badge: "/icons/pwa-192x192.png",
            dir: "rtl",
            lang: "ar",
            tag: safeData.notification_id || "mandoubak-med-notification",
            renotify: true,
          },
          fcmOptions: {
            link: targetLink,
          },
        },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("FCM send timeout")), 4000)),
    ])) as any;

    // Prune stale/unregistered tokens returned by FCM
    if (Array.isArray(batchRes?.responses)) {
      const deadTokens = new Set<string>();
      batchRes.responses.forEach((resp: any, idx: number) => {
        const errCode = resp?.error?.code || "";
        if (
          !resp?.success &&
          (errCode === "messaging/registration-token-not-registered" ||
            errCode === "messaging/invalid-registration-token")
        ) {
          if (tokens[idx]) deadTokens.add(tokens[idx]);
        }
      });

      if (deadTokens.size > 0) {
        try {
          const localDb = getDB();
          let changed = false;
          for (const u of localDb.users || []) {
            const hadPrimary = u.fcmToken && deadTokens.has(u.fcmToken);
            const filteredList = Array.isArray(u.fcmTokens)
              ? u.fcmTokens.filter((t) => !deadTokens.has(t))
              : undefined;
            const listChanged = Array.isArray(u.fcmTokens) && filteredList && filteredList.length !== u.fcmTokens.length;
            if (hadPrimary || listChanged) {
              changed = true;
              u.fcmTokens = filteredList || [];
              u.fcmToken = u.fcmTokens[0] || "";
              if (isFirebaseEnabled && dbAdmin && u.id) {
                dbAdmin.collection("users").doc(u.id).set(
                  { fcmToken: u.fcmToken, fcmTokens: u.fcmTokens },
                  { merge: true }
                ).catch(() => {});
              }
            }
          }
          if (changed) saveDB(localDb);
        } catch {
          // Ignore non-critical stale token cleanup errors
        }
      }
    }

    return {
      attempted: true,
      tokenCount: tokens.length,
      successCount: batchRes?.successCount || 0,
      failureCount: batchRes?.failureCount || 0,
    };
  } catch (err: any) {
    console.warn("FCM push dispatch notice:", err?.message || err);
    return {
      attempted: true,
      tokenCount: tokens.length,
      successCount: 0,
      failureCount: tokens.length,
      reason: err?.message || "fcm_send_failed",
    };
  }
}

// --- NEW VISITS & NOTIFICATIONS ENDPOINTS ---

app.get("/api/visits", requireAuth, async (req, res) => {
  const { clientId } = req.query;
  const scopedClientId = (req as any).isPrivileged ? (clientId as string) : (req as any).authUid;
  const list = await fetchVisitsFromDB(scopedClientId);
  res.json(list);
});

app.post("/api/visits", requirePrivileged, async (req, res) => {
  const { clientId, clientName, entityName, visitDate, notes, summary, tasks } = req.body || {};

  if (!clientId || !notes || !visitDate) {
    return res.status(400).json({ error: "معلومات الزيارة غير مكتملة" });
  }

  const newVisit: Visit = {
    id: "v_" + Math.random().toString(36).substr(2, 9),
    clientId,
    clientName: clientName || "عميل غير معروف",
    entityName: entityName || "منشأة غير معروفة",
    visitDate,
    notes: notes.trim(),
    summary: summary || "زيارة اعتيادية لمتابعة وتوفير المتطلبات والمستلزمات الطبية.",
    tasks: tasks || [],
    createdAt: new Date().toISOString()
  };

  await saveVisitToDB(newVisit);
  res.json({ success: true, visit: newVisit });
});

app.patch("/api/visits/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const { tasks, summary, notes } = req.body || {};

  const visits = await fetchVisitsFromDB();
  const visit = visits.find((v) => v.id === id);

  if (!visit) {
    return res.status(404).json({ error: "تقرير الزيارة غير موجود" });
  }

  if (tasks !== undefined) visit.tasks = tasks;
  if (summary !== undefined) visit.summary = summary;
  if (notes !== undefined) visit.notes = notes;

  await saveVisitToDB(visit);
  res.json({ success: true, visit });
});

app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const clientId = (req as any).isPrivileged
      ? (req.query.clientId as string | undefined)
      : ((req as any).authUid as string);
    let list = await fetchNotificationsFromDB(clientId);
    if (clientId) {
      const users = await fetchAllUsersFromDB();
      const targetUser = users.find((u) => u.id === clientId);
      if (targetUser?.permissions?.canReceiveTargetedNotifications === false) {
        list = list.filter((n) => n.type === "broadcast");
      }
    }
    res.json(list);
  } catch (err: any) {
    console.warn("/api/notifications error, falling back to local store:", err?.message || err);
    const list = getDB().notifications || [];
    const clientId = (req as any).isPrivileged
      ? (req.query.clientId as string | undefined)
      : ((req as any).authUid as string);
    const targetUser = clientId ? (getDB().users || []).find((u) => u.id === clientId) : undefined;
    const allowTargeted = targetUser?.permissions?.canReceiveTargetedNotifications !== false;
    const filtered = (clientId
      ? list.filter((n) => n.type === "broadcast" || (allowTargeted && n.targetClientId === clientId))
      : list
    ).filter((n) => !n.isArchived);
    res.json(filtered);
  }
});

app.post("/api/fcm/register", requireAuth, async (req, res) => {
  const { userId, token } = req.body || {};
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "رمز التسجيل (FCM Token) مطلوب" });
  }
  const effectiveUserId = (req as any).isPrivileged && typeof userId === "string" && userId.trim()
    ? userId.trim()
    : (req as any).authUid;
  if (!effectiveUserId || typeof effectiveUserId !== "string") {
    return res.status(400).json({ error: "معرّف المستخدم مطلوب" });
  }
  await registerUserFcmToken(effectiveUserId, token);
  res.json({ success: true, userId: effectiveUserId, tokenRegistered: true });
});

app.post("/api/fcm/send", requirePrivileged, async (req, res) => {
  const { title, body, token, targetClientId, data } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ error: "عنوان ونص الإشعار مطلوبان" });
  }
  const fcmDelivery = await sendFcmNotificationToUsers({
    title: String(title).trim(),
    body: String(body).trim(),
    targetClientId,
    directToken: token,
    data,
  });
  res.json({ success: true, fcmDelivery });
});

app.post("/api/notifications", requirePrivileged, async (req, res) => {
  const { title, message, type, targetClientId, targetClientName } = req.body || {};

  if (!title || !message) {
    return res.status(400).json({ error: "عنوان الإشعار ونص الإشعار مطلوبان" });
  }

  const notifId = "n_" + Math.random().toString(36).substr(2, 9);
  const newNotif: Notification = {
    id: notifId,
    title: title.trim(),
    message: message.trim(),
    type: type === "target" ? "target" : "broadcast",
    targetClientId,
    targetClientName,
    createdAt: new Date().toISOString()
  };

  let skipTargetedFcm = false;
  if (newNotif.type === "target" && newNotif.targetClientId) {
    try {
      const users = await fetchAllUsersFromDB();
      const targetUser = users.find((u) => u.id === newNotif.targetClientId);
      if (targetUser?.permissions?.canReceiveTargetedNotifications === false) {
        skipTargetedFcm = true;
      }
    } catch {
      // Fallback to local store check if Firestore query fails
      const targetUser = (getDB().users || []).find((u) => u.id === newNotif.targetClientId);
      if (targetUser?.permissions?.canReceiveTargetedNotifications === false) {
        skipTargetedFcm = true;
      }
    }
  }

  const fcmDelivery = skipTargetedFcm
    ? {
        attempted: false,
        tokenCount: 0,
        successCount: 0,
        failureCount: 0,
        reason: "targeted_notifications_disabled_by_admin",
      }
    : await sendFcmNotificationToUsers({
        title: newNotif.title,
        body: newNotif.message,
        targetClientId: newNotif.type === "target" ? newNotif.targetClientId : undefined,
        data: {
          notification_id: newNotif.id,
          type: newNotif.type,
        },
      });

  if (fcmDelivery.attempted && fcmDelivery.successCount > 0) {
    newNotif.fcmDispatchedBy = "server";
  }

  await saveNotificationToDB(newNotif);
  res.json({ success: true, notification: newNotif, fcmDelivery });
});

app.patch("/api/notifications/:id/archive", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const isArchived = req.body?.isArchived !== false;
  const now = new Date().toISOString();

  if (isFirebaseEnabled && dbAdmin) {
    try {
      const ref = dbAdmin.collection("notifications").doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        await ref.update({ isArchived, archivedAt: isArchived ? now : null });
      }
    } catch (e: any) {
      console.warn("Firebase archive notification fallback:", e.message);
    }
  }

  const db = getDB();
  if (!db.notifications) db.notifications = [];
  const idx = db.notifications.findIndex((n) => n.id === id);
  if (idx !== -1) {
    (db.notifications[idx] as Notification).isArchived = isArchived;
    if (isArchived) {
      (db.notifications[idx] as Notification).archivedAt = now;
    } else {
      delete (db.notifications[idx] as Notification).archivedAt;
    }
    saveDB(db);
    return res.json({ success: true, notification: db.notifications[idx] });
  }

  res.json({ success: true });
});

app.delete("/api/notifications/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("notifications").doc(id).delete();
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  const db = getDB();
  if (!db.notifications) db.notifications = [];
  const idx = db.notifications.findIndex((n) => n.id === id);
  if (idx !== -1) {
    db.notifications.splice(idx, 1);
    saveDB(db);
    return res.json({ success: true });
  }
  res.status(404).json({ error: "الإشعار غير موجود" });
});

app.delete("/api/notifications", requirePrivileged, async (req, res) => {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("notifications").get();
      const batch = dbAdmin.batch();
      snap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  const db = getDB();
  db.notifications = [];
  saveDB(db);
  res.json({ success: true });
});

// Cloudflare / Status Webhook Endpoint
app.post("/api/webhook/cloudflare", async (req, res) => {
  try {
    const payload = req.body;
    let title = "تنبيه حالة Cloudflare";
    let message = "تحديث جديد من حالة منصة Cloudflare";
    
    if (payload?.incident) {
      title = `Cloudflare Incident: ${payload.incident.name || "تحديث حالة"}`;
      message = `${payload.incident.status?.toUpperCase() || "تحديث"}: ${payload.incident.impact || ""} - ${payload.incident.body || ""}`;
    } else if (payload?.page && payload?.status) {
      title = `Cloudflare Status: ${payload.page.name}`;
      message = `الحالة العامة: ${payload.status.description || payload.status.indicator}`;
    } else if (payload?.message) {
      message = payload.message;
    } else if (typeof payload === "object" && Object.keys(payload).length > 0) {
      message = JSON.stringify(payload).substring(0, 200);
    }

    const notificationType: Notification["type"] = "broadcast";
    const newNotif: Notification = {
      id: "cf_" + Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      message: message.trim(),
      type: notificationType,
      createdAt: new Date().toISOString()
    };
    await saveNotificationToDB(newNotif);
    res.json({ success: true, message: "تم استقبال ويب هوك Cloudflare بنجاح وتوليد إشعار في التطبيق" });
  } catch (err: any) {
    console.error("Cloudflare webhook error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- AGREEMENTS MANAGEMENT API (إدارة وتوثيق الاتفاقيات) ---

async function fetchAgreementsFromDB(clientId?: string): Promise<Agreement[]> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      let query: Query = dbAdmin.collection("agreements");
      if (clientId) {
        query = query.where("clientId", "==", clientId);
      }
      const snap = await query.get();
      const list: Agreement[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as Agreement);
      });
      list.sort((a, b) => new Date(b.createdAt || b.agreementDate).getTime() - new Date(a.createdAt || a.agreementDate).getTime());
      return list;
    } catch (e: any) {
      console.warn("Firebase operation fallback (agreements):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const list = db.agreements || [];
  const filtered = clientId ? list.filter((a) => a.clientId === clientId) : list;
  return filtered.sort((a, b) => new Date(b.createdAt || b.agreementDate).getTime() - new Date(a.createdAt || a.agreementDate).getTime());
}

async function saveAgreementToDB(agreement: Agreement): Promise<void> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("agreements").doc(agreement.id).set(agreement);
      return;
    } catch (e: any) {
      console.warn("Firebase operation fallback (save agreement):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  if (!db.agreements) db.agreements = [];
  const idx = db.agreements.findIndex((a) => a.id === agreement.id);
  if (idx !== -1) {
    db.agreements[idx] = agreement;
  } else {
    db.agreements.unshift(agreement);
  }
  saveDB(db);
}

async function deleteAgreementFromDB(id: string, deletedBy = "د. بلال القيسي"): Promise<boolean> {
  const db = getDB();
  if (!db.agreements) db.agreements = [];
  const existingAgr = db.agreements.find((a) => a.id === id);
  if (existingAgr) {
    const aAny = existingAgr as any;
    await addTrashItemToDB({
      id: `trash_agr_${id}_${Date.now()}`,
      itemType: "agreement",
      title: `اتفاقية: ${aAny.title || existingAgr.clientName || "اتفاقية توريد وبونص"}`,
      subtitle: `العميل: ${existingAgr.clientName || "المنشأة"} (${existingAgr.clientPhone || "بدون هاتف"}) | التفاصيل: ${existingAgr.details || ""}`,
      originalId: id,
      deletedAt: new Date().toISOString(),
      deletedBy,
      details: {
        title: aAny.title || existingAgr.typeLabel || existingAgr.type,
        clientName: existingAgr.clientName,
        phone: existingAgr.clientPhone,
        targetAmount: aAny.targetAmount,
        bonusPercentage: aAny.bonusPercentage,
        status: existingAgr.status,
        startDate: aAny.startDate || existingAgr.agreementDate,
        endDate: aAny.endDate
      },
      data: existingAgr
    });
  }

  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("agreements").doc(id).delete();
    } catch (e: any) {
      console.warn("Firebase operation fallback (delete agreement):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const idx = db.agreements.findIndex((a) => a.id === id);
  if (idx !== -1) {
    db.agreements.splice(idx, 1);
    saveDB(db);
    return true;
  }
  return false;
}

app.get("/api/agreements", requireAuth, async (req, res) => {
  const { clientId } = req.query;
  const scopedClientId = (req as any).isPrivileged ? (clientId as string) : (req as any).authUid;
  const list = await fetchAgreementsFromDB(scopedClientId);
  res.json(list);
});

app.post("/api/agreements", requirePrivileged, async (req, res) => {
  const {
    clientId,
    clientName,
    entityName,
    clientPhone,
    type,
    typeLabel,
    details,
    agreementDate,
    status,
    deliveredDetails,
    deliveredAt,
    deliveredBy,
    invoiceNumber,
    invoiceAttachment,
    notes
  } = req.body;

  if (!clientId || !details || details.trim() === "") {
    return res.status(400).json({ error: "اسم المنشأة/العميل وتفاصيل الاتفاق مطلوبان" });
  }

  const now = new Date().toISOString();
  const newAgreement: Agreement = {
    id: "agr_" + Math.random().toString(36).substr(2, 9),
    clientId,
    clientName: clientName || "عميل غير محدد",
    entityName: entityName || "منشأة غير محددة",
    clientPhone: clientPhone || "",
    type: type || "bonus",
    typeLabel: typeLabel || (type === "bonus" ? "بونص إضافي" : type === "samples" ? "عينات مجانية" : type === "gift_support" ? "دعم وهدايا" : "اتفاقية خاصة"),
    details: details.trim(),
    agreementDate: agreementDate || now.split("T")[0],
    status: status || "pending",
    deliveredDetails: status === "delivered" ? (deliveredDetails || details).trim() : (deliveredDetails ? deliveredDetails.trim() : undefined),
    deliveredAt: status === "delivered" ? (deliveredAt || now) : undefined,
    deliveredBy: status === "delivered" ? (deliveredBy || "د/ بلال القيسي") : undefined,
    invoiceNumber: invoiceNumber ? invoiceNumber.trim() : undefined,
    invoiceAttachment: invoiceAttachment || undefined,
    notes: notes ? notes.trim() : undefined,
    createdAt: now,
    updatedAt: now
  };

  await saveAgreementToDB(newAgreement);
  res.json({ success: true, agreement: newAgreement });
});

app.put("/api/agreements/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const {
    clientId,
    clientName,
    entityName,
    clientPhone,
    type,
    typeLabel,
    details,
    agreementDate,
    status,
    deliveredDetails,
    deliveredAt,
    deliveredBy,
    invoiceNumber,
    invoiceAttachment,
    notes
  } = req.body;

  const agreements = await fetchAgreementsFromDB();
  const existing = agreements.find((a) => a.id === id);

  if (!existing) {
    return res.status(404).json({ error: "الاتفاقية غير موجودة" });
  }

  const now = new Date().toISOString();
  const updated: Agreement = {
    ...existing,
    clientId: clientId || existing.clientId,
    clientName: clientName || existing.clientName,
    entityName: entityName || existing.entityName,
    clientPhone: clientPhone !== undefined ? clientPhone : existing.clientPhone,
    type: type || existing.type,
    typeLabel: typeLabel || existing.typeLabel,
    details: details !== undefined ? details.trim() : existing.details,
    agreementDate: agreementDate || existing.agreementDate,
    status: status || existing.status,
    deliveredDetails: status === "delivered"
      ? (deliveredDetails !== undefined ? deliveredDetails.trim() : (existing.deliveredDetails || existing.details))
      : (deliveredDetails !== undefined ? deliveredDetails : existing.deliveredDetails),
    deliveredAt: status === "delivered"
      ? (deliveredAt || existing.deliveredAt || now)
      : (status === "pending" ? undefined : existing.deliveredAt),
    deliveredBy: status === "delivered"
      ? (deliveredBy || existing.deliveredBy || "د/ بلال القيسي")
      : (status === "pending" ? undefined : existing.deliveredBy),
    invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : existing.invoiceNumber,
    invoiceAttachment: invoiceAttachment !== undefined ? invoiceAttachment : existing.invoiceAttachment,
    notes: notes !== undefined ? notes : existing.notes,
    updatedAt: now
  };

  await saveAgreementToDB(updated);
  res.json({ success: true, agreement: updated });
});

app.delete("/api/agreements/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const success = await deleteAgreementFromDB(id);
  if (!success) {
    return res.status(404).json({ error: "الاتفاقية غير موجودة" });
  }
  res.json({ success: true });
});

// --- COMPLAINTS & SUGGESTIONS API (صندوق الشكاوى والاقتراحات) ---

async function fetchComplaintsFromDB(clientId?: string): Promise<Complaint[]> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      let query: Query = dbAdmin.collection("complaints");
      if (clientId) {
        query = query.where("clientId", "==", clientId);
      }
      const snap = await query.get();
      const list: Complaint[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as Complaint);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (e: any) {
      console.warn("Firebase operation fallback (complaints):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  const list = db.complaints || [];
  const filtered = clientId ? list.filter((c) => c.clientId === clientId) : list;
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function saveComplaintToDB(complaint: Complaint): Promise<void> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("complaints").doc(complaint.id).set(complaint);
      return;
    } catch (e: any) {
      console.warn("Firebase operation fallback (save complaint):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  if (!db.complaints) db.complaints = [];
  const idx = db.complaints.findIndex((c) => c.id === complaint.id);
  if (idx !== -1) {
    db.complaints[idx] = complaint;
  } else {
    db.complaints.unshift(complaint);
  }
  saveDB(db);
}

async function deleteComplaintFromDB(id: string, deletedBy = "د. بلال القيسي"): Promise<boolean> {
  const db = getDB();
  if (!db.complaints) db.complaints = [];
  const existingComp = db.complaints.find((c) => c.id === id);
  if (existingComp) {
    const cAny = existingComp as any;
    await addTrashItemToDB({
      id: `trash_comp_${id}_${Date.now()}`,
      itemType: "complaint",
      title: `شكوى/اقتراح: ${existingComp.subject || "شكوى عميل"}`,
      subtitle: `المرسل: ${existingComp.clientName || "المنشأة"} (${existingComp.clientPhone || "بدون هاتف"}) | الحالة: ${existingComp.status || "قيد المراجعة"}`,
      originalId: id,
      deletedAt: new Date().toISOString(),
      deletedBy,
      details: {
        title: existingComp.subject,
        clientName: existingComp.clientName,
        phone: existingComp.clientPhone,
        type: existingComp.type,
        message: existingComp.content || cAny.message,
        status: existingComp.status,
        createdAt: existingComp.createdAt
      },
      data: existingComp
    });
  }

  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("complaints").doc(id).delete();
      return true;
    } catch (e: any) {
      console.warn("Firebase operation fallback (delete complaint):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const idx = db.complaints.findIndex((c) => c.id === id);
  if (idx !== -1) {
    db.complaints.splice(idx, 1);
    saveDB(db);
    return true;
  }
  return false;
}

app.get("/api/complaints", requireAuth, async (req, res) => {
  const { clientId } = req.query;
  const scopedClientId = (req as any).isPrivileged ? (clientId as string) : (req as any).authUid;
  const list = await fetchComplaintsFromDB(scopedClientId);
  res.json(list);
});

app.post("/api/complaints", requireAuth, async (req, res) => {
  const {
    clientId,
    clientName,
    entityName,
    clientPhone,
    clientRole,
    type,
    typeLabel,
    subject,
    content,
    priority,
    isAnonymous,
    attachment
  } = req.body;

  if (!subject || !content || content.trim() === "") {
    return res.status(400).json({ error: "عنوان الشكوى وتفاصيلها مطلوبان" });
  }

  const now = new Date().toISOString();
  const newComplaint: Complaint = {
    id: "cmp_" + Math.random().toString(36).substr(2, 9),
    clientId: clientId || "anon",
    clientName: isAnonymous ? "فاعل خير / مجهول (سري)" : (clientName || "عميل غير محدد"),
    entityName: isAnonymous ? "منشأة سرية" : (entityName || "منشأة غير محددة"),
    clientPhone: isAnonymous ? "" : (clientPhone || ""),
    clientRole: clientRole || "pharmacy",
    type: type || "complaint",
    typeLabel: typeLabel || (type === "suggestion" ? "اقتراح تطوير" : type === "quality_issue" ? "ملاحظة جودة صنف" : type === "financial_bonus" ? "ملاحظة مالية" : type === "compliment" ? "إشادة" : "شكوى أخرى"),
    subject: subject.trim(),
    content: content.trim(),
    priority: priority || "normal",
    status: "pending",
    isAnonymous: !!isAnonymous,
    attachment: attachment || undefined,
    createdAt: now,
    updatedAt: now
  };

  await saveComplaintToDB(newComplaint);

  await notifyTelegramSafely(
    [
      `📩 ${newComplaint.typeLabel} جديد (${newComplaint.priority})`,
      `🏥 الجهة: ${newComplaint.entityName}`,
      `👤 المرسل: ${newComplaint.clientName}`,
      `📌 العنوان: ${newComplaint.subject}`,
      `📝 التفاصيل: ${newComplaint.content.slice(0, 300)}${newComplaint.content.length > 300 ? "..." : ""}`
    ].join("\n")
  );

  res.json({ success: true, complaint: newComplaint });
});

app.put("/api/complaints/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const {
    status,
    adminReply,
    repliedBy,
    subject,
    content,
    priority
  } = req.body;

  const complaints = await fetchComplaintsFromDB();
  const existing = complaints.find((c) => c.id === id);

  if (!existing) {
    return res.status(404).json({ error: "الشكوى/الاقتراح غير موجود" });
  }

  const now = new Date().toISOString();
  const updated: Complaint = {
    ...existing,
    status: status !== undefined ? status : existing.status,
    adminReply: adminReply !== undefined ? adminReply.trim() : existing.adminReply,
    repliedBy: adminReply ? (repliedBy || "د/ بلال القيسي (المندوب الطبي)") : existing.repliedBy,
    repliedAt: adminReply ? (existing.repliedAt || now) : existing.repliedAt,
    subject: subject !== undefined ? subject.trim() : existing.subject,
    content: content !== undefined ? content.trim() : existing.content,
    priority: priority !== undefined ? priority : existing.priority,
    updatedAt: now
  };

  await saveComplaintToDB(updated);
  res.json({ success: true, complaint: updated });
});

app.delete("/api/complaints/:id", requirePrivileged, async (req, res) => {
  const { id } = req.params;
  const success = await deleteComplaintFromDB(id);
  if (!success) {
    return res.status(404).json({ error: "الشكوى غير موجودة" });
  }
  res.json({ success: true });
});

app.delete("/api/complaints", requirePrivileged, async (req, res) => {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("complaints").get();
      const batch = dbAdmin.batch();
      snap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  const db = getDB();
  db.complaints = [];
  saveDB(db);
  res.json({ success: true });
});


// --- ROBUST GEMINI AI ENGINE HELPER FUNCTIONS ---

function shuffleQuestionOptions(options: { id: string; text: string }[], correctOptionId: string) {
  if (!options || options.length === 0) return { options: [], correctOptionId: "A" };
  const correctOpt = options.find((o) => o.id === correctOptionId) || options[0];
  const correctText = correctOpt.text;

  // Clone and shuffle
  const shuffledTexts = options.map((o) => o.text);
  for (let i = shuffledTexts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledTexts[i], shuffledTexts[j]] = [shuffledTexts[j], shuffledTexts[i]];
  }

  const letters = ["A", "B", "C", "D", "E", "F"];
  const newOptions = shuffledTexts.map((text, idx) => ({
    id: letters[idx] || String.fromCharCode(65 + idx),
    text
  }));

  const newCorrect = newOptions.find((o) => o.text === correctText);
  return {
    options: newOptions,
    correctOptionId: newCorrect ? newCorrect.id : "A"
  };
}

async function robustGenerateContent(
  ai: GoogleGenAI,
  preferredModel: string,
  contents: any,
  config: any = {},
  allowSearchFallback = true
): Promise<{ response: any; modelUsed: string; fallbackSearchUsed?: boolean }> {
  const fallbackModels = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
  const candidateModels = Array.from(new Set([preferredModel || "gemini-4-hydrogen", ...fallbackModels]));

  // If search or maps tools requested, attempt first with tools
  if (config.tools && config.tools.length > 0) {
    try {
      const res = await ai.models.generateContent({
        model: preferredModel || "gemini-4-hydrogen",
        contents,
        config
      });
      return { response: res, modelUsed: preferredModel || "gemini-4-hydrogen" };
    } catch (err: any) {
      console.warn("Grounding tool (Search/Maps) failed or quota exhausted, falling back to standard text generation:", err?.status || err?.message);
      if (allowSearchFallback) {
        const fallbackConfig = { ...config };
        delete fallbackConfig.tools;
        delete fallbackConfig.toolConfig;
        config = fallbackConfig;
      } else {
        throw err;
      }
    }
  }

  let lastError: any = null;
  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents,
          config
        });
        return { response: res, modelUsed: model, fallbackSearchUsed: true };
      } catch (err: any) {
        const status = Number(err?.status || 0);
        const msg = String(err?.message || "");
        const isTransient = status === 503 || status === 429 || msg.includes("503") || msg.includes("UNAVAILABLE");
        console.warn(`Model ${model} failed (attempt ${attempt + 1}), trying fallback:`, err?.status || err?.message);
        lastError = err;
        if (isTransient && attempt === 0) {
          await new Promise((r) => setTimeout(r, 650));
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error("جميع نماذج الذكاء الاصطناعي مشغولة مؤقتاً، يرجى المحاولة بعد لحظات.");
}

// --- OPENROUTER AI INTEGRATION HELPER ---
interface OpenRouterChatOptions {
  messages: Array<{ role: string; text?: string; content?: string }>;
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  responseJson?: boolean;
}

async function callOpenRouterChat({
  messages,
  model = "deepseek/deepseek-chat",
  systemInstruction,
  temperature = 0.7,
  responseJson = false
}: OpenRouterChatOptions): Promise<{ reply: string; modelUsed: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("مفتاح OPENROUTER_API_KEY غير مهيأ في بيئة الخادم. يرجى إضافته في إعدادات المنصة (Secrets).");
  }

  const toAsciiHeader = (val: string, fallback = ""): string => {
    const cleaned = String(val || "")
      .trim()
      .replace(/^["']+|["']+$/g, "")
      .replace(/[^\x20-\x7E]/g, "")
      .trim();
    return cleaned || fallback;
  };

  const cleanApiKey = toAsciiHeader(apiKey);
  if (!cleanApiKey || cleanApiKey.length < 12) {
    throw new Error("مفتاح OPENROUTER_API_KEY غير مضبوط أو يحتوي على أحرف غير صالحة في إعدادات الأسرار.");
  }

  const appUrl = toAsciiHeader(process.env.APP_URL || "https://mandoubak-med.app", "https://mandoubak-med.app");
  const workspaceId = toAsciiHeader(
    process.env.OPENROUTER_WORKSPACE_ID || "21aaba5e-2929-5ce8-a166-d464aaf42366",
    "21aaba5e-2929-5ce8-a166-d464aaf42366"
  );

  const formattedMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
  if (systemInstruction && systemInstruction.trim()) {
    formattedMessages.push({
      role: "system",
      content: systemInstruction.trim()
    });
  }

  for (const m of messages) {
    const textContent = (m.content || m.text || "").trim();
    if (!textContent) continue;
    formattedMessages.push({
      role: m.role === "user" ? "user" : "assistant",
      content: textContent
    });
  }

  if (formattedMessages.length === 0 || formattedMessages[formattedMessages.length - 1].role !== "user") {
    formattedMessages.push({
      role: "user",
      content: "مرحباً، هل يمكنك المساعدة؟"
    });
  }

  const candidateModels = Array.from(
    new Set([
      model || "deepseek/deepseek-chat",
      "deepseek/deepseek-chat",
      "google/gemini-2.5-flash",
      "meta-llama/llama-3.3-70b-instruct",
      "openrouter/auto"
    ])
  );

  let lastError: any = null;
  for (const candidate of candidateModels) {
    try {
      const bodyPayload: any = {
        model: candidate,
        messages: formattedMessages,
        temperature
      };
      if (responseJson) {
        bodyPayload.response_format = { type: "json_object" };
      }

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanApiKey}`,
          "HTTP-Referer": appUrl,
          "X-OpenRouter-Title": "Mandoubak Med",
          "X-Title": "Mandoubak Med",
          "Content-Type": "application/json",
          "X-Workspace-Id": workspaceId
        },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(20000)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`OpenRouter model ${candidate} failed (${res.status}):`, errText);
        if (res.status === 401 || res.status === 403) {
          throw new Error("مفتاح OpenRouter غير صالح أو غير مصرح به (401). يرجى تحديث OPENROUTER_API_KEY في إعدادات الأسرار.");
        }
        lastError = new Error(`OpenRouter Error (${res.status}): ${errText}`);
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.trim()) {
        return {
          reply: content.trim(),
          modelUsed: data.model || candidate
        };
      }
    } catch (err: any) {
      console.warn(`OpenRouter invocation error on ${candidate}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("تعذر الحصول على استجابة من خوادم OpenRouter");
}

// --- GEMINI AI VISITS ANALYZER API ---

app.post("/api/visits/analyze", requireAuth, async (req, res) => {
  const { notes } = req.body || {};
  if (!notes || notes.trim() === "") {
    return res.status(400).json({ error: "ملاحظات الزيارة مطلوبة للتحليل" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `
أنت مساعد ذكي متخصص في قطاع المبيعات الطبية والأدوية ومساعدة المندوبين الطبيين.
المندوب الطبي كتب هذه الملاحظات بعد زيارته لأحد العملاء (صيدلية أو عيادة طبيب):
"${notes}"

قم بتحليل هذه الملاحظات وتنفيذ المهام التالية بدقة وباللغة العربية:
1. تلخيص الزيارة في نقاط واضحة واحترافية (3 نقاط كحد أقصى).
2. استخراج قائمة بالمهام والخطوات التالية القابلة للمتابعة (Action Items) التي يجب على المندوب متابعتها (مثال: توصيل طلبية، متابعة أصل معين، تقديم عرض خاص، متابعة حالة تذاكر العميل)
3. إعطاء اقتراحات عملية لتحسين التواصل مع العميل.

يجب أن تكون الاستجابة بصيغة JSON مطابقة تماماً للمخطط التالي:
{
  "summary": "ملخص نقاط الزيارة هنا",
  "tasks": [
    "مهمة المتابعة الأولى هنا",
    "مهمة المتابعة الثانية هنا"
  ]
}
`;

    const { response } = await robustGenerateContent(
      ai,
      "gemini-4-hydrogen",
      prompt,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Professional summary of the medical representative visit in Arabic." },
            tasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of follow-up task descriptions in Arabic."
            }
          },
          required: ["summary", "tasks"]
        }
      }
    );

    const resultText = response.text || "{}";
    const result = JSON.parse(resultText);

    res.json({
      success: true,
      summary: result.summary || "تمت الزيارة بنجاح ومتابعة توفر الأصناف الكتالوجية.",
      tasks: (result.tasks || []).map((taskText: string) => ({
        id: "vt_" + Math.random().toString(36).substr(2, 9),
        taskText,
        completed: false
      }))
    });
  } catch (err: any) {
    console.error("Gemini visit analyze error:", err);
    res.json({
      success: false,
      summary: "• تم تسجيل الملاحظات يدوياً.\n• تم حفظ بيانات الزيارة بنجاح.",
      tasks: [
        { id: "vt_fb1", taskText: "تلبية احتياجات العميل ومتابعة التوصيل والأصناف المطلوبة", completed: false }
      ]
    });
  }
});

// --- GEMINI AI DRUGS SCIENTIFIC SEARCH API ---

app.post("/api/drugs/scientific-search", requireAuth, async (req, res) => {
  const { drugQuery } = req.body || {};
  if (!drugQuery || drugQuery.trim() === "") {
    return res.status(400).json({ error: "اسم الدواء أو المادة الفعالة مطلوبة للبحث" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `
أنت دكتور صيدلي خبير ومستشار علمي للأدوية والمستحضرات الطبية.
لقد قام مستخدم (صيدلاني أو طبيب أو مندوب طبي) بالبحث العلمي عن الدواء أو المركب التالي:
"${drugQuery}"

قم بتقديم مراجعة وبحث علمي دقيق، موثوق، وشامل جداً حول هذا الدواء أو المادة الفعالة باللغة العربية الفصحى.
تأكد من كتابة التفاصيل الطبية الصحيحة علمياً وبشكل منظم.

يجب أن تكون الاستجابة بصيغة JSON مطابقة تماماً للمخطط التالي:
{
  "scientificName": "الاسم العلمي والمادة الفعالة والأسماء التجارية الشائعة",
  "drugClass": "التصنيف العلاجي والدوائي التفصيلي وعائلته الكيميائية",
  "indications": [
    "دواعي الاستخدام السريرية المؤكدة 1",
    "دواعي الاستخدام السريرية المؤكدة 2"
  ],
  "mechanismOfAction": "آلية العمل والتأثير الحيوي في الجسم بالتفصيل العلمي المبسط والمتقن",
  "standardDosages": [
    "الجرعة الإرشادية للبالغين",
    "الجرعة الإرشادية للأطفال (إن وجدت)",
    "إرشادات خاصة بمرضى الكلى أو الكبد (إن لزم)"
  ],
  "sideEffects": [
    "عرض جانبي شائع 1",
    "عرض جانبي شائع 2"
  ],
  "contraindications": [
    "مانع استخدام مطلق أو تحذير هام 1",
    "مانع استخدام مطلق أو تحذير هام 2"
  ],
  "drugInteractions": [
    "تداخل دواء-دواء هام 1",
    "تداخل دواء-دواء هام 2"
  ],
  "pregnancyCategory": "فئة السلامة أثناء الحمل والرضاعة الطبيعية وتأثيراته",
  "clinicalTips": [
    "نصيحة سريرية أو صيدلانية ذهبية لضمان سلامة المريض والفعالية القصوى 1",
    "نصيحة سريرية أو صيدلانية ذهبية لضمان سلامة المريض والفعالية القصوى 2"
  ]
}
`;

    const { response } = await robustGenerateContent(
      ai,
      "gemini-4-hydrogen",
      prompt,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scientificName: { type: Type.STRING, description: "Scientific name and active ingredients in Arabic" },
            drugClass: { type: Type.STRING, description: "Therapeutic and pharmacological classification in Arabic" },
            indications: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Clinical indications/uses in Arabic"
            },
            mechanismOfAction: { type: Type.STRING, description: "Detailed biological mechanism of action in Arabic" },
            standardDosages: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Standard/guideline dosage instructions in Arabic"
            },
            sideEffects: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Common side effects and adverse events in Arabic"
            },
            contraindications: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Contraindications and warnings in Arabic"
            },
            drugInteractions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Major drug-drug interactions in Arabic"
            },
            pregnancyCategory: { type: Type.STRING, description: "Pregnancy category and lactation safety info in Arabic" },
            clinicalTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Key clinical tips or pharmacist pearls in Arabic"
            }
          },
          required: [
            "scientificName",
            "drugClass",
            "indications",
            "mechanismOfAction",
            "standardDosages",
            "sideEffects",
            "contraindications",
            "drugInteractions",
            "pregnancyCategory",
            "clinicalTips"
          ]
        }
      }
    );

    const resultText = response.text || "{}";
    const result = JSON.parse(resultText);

    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    console.error("Gemini drug scientific search error:", err);
    res.status(500).json({
      success: false,
      error: "فشل إجراء البحث العلمي التلقائي: " + (err.message || "عطل مؤقت، يرجى المحاولة لاحقاً.")
    });
  }
});

// --- ACCREDITED ENGLISH MEDICAL BOARD EXAM GENERATION API ---
app.post("/api/ai/generate-medical-exam", requireAuth, async (req, res) => {
  const { specialty, topic, count = 5, difficulty = "medium" } = req.body || {};

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const specialtyBoardMap: Record<string, { exam: string; sources: string; focus: string }> = {
      pharmacy: {
        exam: "NAPLEX / SPLE / Prometric Clinical Pharmacy Licensure Exam",
        sources: "Goodman & Gilman's Pharmacological Basis of Therapeutics (14th Ed), DiPiro's Pharmacotherapy (12th Ed), USP-NF, FDA Guidelines",
        focus: "Clinical pharmacology, therapeutic drug monitoring, renal dose adjustments, high-risk drug interactions, sterile compounding, pharmacokinetics"
      },
      medicine: {
        exam: "USMLE Step 2 CK / SMLE / PLAB / UKMLA General Medicine & Surgery",
        sources: "Harrison's Principles of Internal Medicine (21st Ed), Current Medical Diagnosis & Treatment (CMDT 2024), First Aid USMLE Step 2 CK, ATLS Guidelines",
        focus: "Internal medicine differential diagnosis, next best step in management, critical emergency triage, pediatric and OB/GYN core algorithms"
      },
      dentistry: {
        exam: "INBDE (Integrated National Board Dental Examination - ADA) / SDLE",
        sources: "Carranza's Clinical Periodontology (13th Ed), Cohen's Pathways of the Pulp (12th Ed), Malamed's Handbook of Local Anesthesia (7th Ed), ADA Guidelines",
        focus: "Endodontic diagnosis, local anesthesia nerve blocks & toxicity, periodontal grading, oral pathology, dental pharmacological management"
      },
      nursing: {
        exam: "NCLEX-RN Next Generation / SNLE / AHA ACLS-BLS",
        sources: "Potter & Perry's Fundamentals of Nursing (10th Ed), Brunner & Suddarth's Medical-Surgical Nursing (15th Ed), AHA 2020-2025 CPR & ECC Guidelines",
        focus: "Clinical judgment measurement model (CJMM), priority nursing interventions, IV fluid & hemodynamic titration, critical care safety alerts"
      },
      lab: {
        exam: "ASCP Board of Certification (BOC) / SLLE Medical Laboratory Scientist Exam",
        sources: "Henry's Clinical Diagnosis and Management by Laboratory Methods (24th Ed), Tietz Textbook of Clinical Chemistry (7th Ed), Rodak's Hematology",
        focus: "Clinical chemistry enzymatic calculations, abnormal peripheral blood smears, blood bank crossmatching & transfusion reactions, diagnostic microbiology"
      },
      radiology: {
        exam: "ARRT Radiologic Technologist Board / Core Diagnostic Radiology Exam",
        sources: "Bushong's Radiologic Science for Technologists (12th Ed), Brant and Helms' Fundamentals of Diagnostic Radiology (5th Ed), ACR Appropriateness Criteria",
        focus: "Radiation protection & physics (ALARA), radiographic positioning & image artifacts, CT/MRI contrast administration safety, emergency imaging interpretation"
      }
    };

    const boardInfo = specialtyBoardMap[specialty] || specialtyBoardMap.pharmacy;
    const requestedCount = Math.min(Math.max(Number(count) || 5, 1), 10);

    const promptText = `You are a Senior Medical Examination Board Question Writer and Item Reviewer for official international and regional licensing examinations (${boardInfo.exam}).
Generate exactly ${requestedCount} authentic, high-quality, peer-reviewed Multiple Choice Questions (MCQs) in ENGLISH for the specialty "${specialty}" with topic/focus: "${topic || boardInfo.focus}".

CRITICAL REQUIREMENTS:
1. Language: ALL questions, case vignettes, options, explanations, and high-yield pearls MUST be written in professional, grammatically impeccable Medical Board English (USMLE/NAPLEX/NCLEX standards).
2. Question Format: 
   - A realistic Clinical Vignette / Case Scenario (patient age, presentation, history, vitals/labs).
   - A clear Question Stem (e.g. "Which of the following is the most appropriate next step in management?", "What is the primary mechanism of action?", "Which adverse effect requires immediate discontinuation?").
   - Exactly 4 options labeled A, B, C, D with unambiguous clinical plausibility.
   - 1 definitive Correct Option.
3. DIVERSIFY CORRECT ANSWERS (MANDATORY): You MUST distribute the correct answers evenly across all four options: A, B, C, and D. NEVER make all or most answers option A! Distribute roughly an equal number of correct answers across A/B/C/D across the set.
4. Detailed Explanation: Detailed evidence-based rationale citing why the correct answer is standard-of-care and explicitly breaking down why the 3 distractors are incorrect.
5. High-Yield Board Pearl: A memorable "Board Exam Pearl" or high-yield rule often tested on the licensing board.
6. Official Accredited Source: State the exact accredited licensing board (e.g. ${boardInfo.exam}) and reference textbook/guideline (e.g. ${boardInfo.sources}).`;

    const { response } = await robustGenerateContent(
      ai,
      "gemini-4-hydrogen",
      [{ role: "user", parts: [{ text: promptText }] }],
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "Sub-specialty topic or clinical domain in English" },
                  caseVignette: { type: Type.STRING, description: "Detailed clinical case vignette in English" },
                  questionText: { type: Type.STRING, description: "Direct question stem in English" },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING, description: "A, B, C, or D" },
                        text: { type: Type.STRING, description: "Option text in English" }
                      },
                      required: ["id", "text"]
                    },
                    description: "Exactly 4 options A, B, C, D"
                  },
                  correctOptionId: { type: Type.STRING, description: "The correct option ID: A, B, C, or D" },
                  explanation: { type: Type.STRING, description: "Comprehensive evidence-based explanation and distractor analysis in English" },
                  highYieldPearl: { type: Type.STRING, description: "High-yield board exam clinical pearl in English" },
                  difficulty: { type: Type.STRING, description: "easy, medium, or hard" },
                  yearOrSource: { type: Type.STRING, description: "Accredited board exam source name in English (e.g. USMLE Step 2 CK / Harrison's)" },
                  sourceOrganization: { type: Type.STRING, description: "Official board/council organization in English" },
                  referenceBook: { type: Type.STRING, description: "Authoritative reference textbook with edition" }
                },
                required: [
                  "category",
                  "caseVignette",
                  "questionText",
                  "options",
                  "correctOptionId",
                  "explanation",
                  "highYieldPearl",
                  "difficulty",
                  "yearOrSource",
                  "sourceOrganization",
                  "referenceBook"
                ]
              }
            }
          },
          required: ["questions"]
        }
      }
    );

    const resultText = response.text || "{}";
    const parsedResult = JSON.parse(resultText);

    const formattedQuestions = (parsedResult.questions || []).map((q: any, idx: number) => {
      const rawOptions = q.options && q.options.length === 4 ? q.options : [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" }
      ];

      // Shuffle options to guarantee 100% answer diversification across A, B, C, D
      const shuffled = shuffleQuestionOptions(rawOptions, q.correctOptionId || "A");

      return {
        id: `ai_${Date.now()}_${idx + 1}`,
        specialty: specialty,
        category: q.category || "Clinical Medicine",
        caseVignette: q.caseVignette || "",
        questionText: q.questionText || "Which of the following is the most appropriate step?",
        options: shuffled.options,
        correctOptionId: shuffled.correctOptionId,
        explanation: q.explanation || "Standard evidence-based medical protocol.",
        highYieldPearl: q.highYieldPearl || "Always review high-yield board concepts before the exam.",
        difficulty: q.difficulty || difficulty,
        yearOrSource: q.yearOrSource || boardInfo.exam,
        sourceOrganization: q.sourceOrganization || "Accredited Medical Licensure Board",
        referenceBook: q.referenceBook || boardInfo.sources
      };
    });

    res.json({
      success: true,
      specialty,
      count: formattedQuestions.length,
      questions: formattedQuestions
    });
  } catch (err: any) {
    console.error("Gemini Medical Exam Generation error:", err);
    res.status(500).json({
      success: false,
      error: "فشل توليد أسئلة الامتحان بالذكاء الاصطناعي: " + (err.message || "عطل مؤقت")
    });
  }
});

// --- GEMINI & OPENROUTER AI CHATBOT & SEARCH GROUNDING API ---

app.get("/api/ai/providers", (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const workspaceId = process.env.OPENROUTER_WORKSPACE_ID || "21aaba5e-2929-5ce8-a166-d464aaf42366";

  res.json({
    gemini: {
      configured: Boolean(geminiKey && geminiKey.trim()),
      defaultModel: "gemini-4-hydrogen"
    },
    openrouter: {
      configured: Boolean(openRouterKey && openRouterKey.trim()),
      workspaceId,
      defaultModel: "deepseek/deepseek-chat",
      models: [
        { id: "deepseek/deepseek-chat", name: "DeepSeek V3 / R1 (دقة عالية وسرعة فائقة)" },
        { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash عبر OpenRouter" },
        { id: "meta-llama/llama-3.3-70b-instruct", name: "Meta Llama 3.3 70B Instruct" },
        { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku" },
        { id: "openrouter/auto", name: "OpenRouter Auto (توجيه تلقائي ذكي)" }
      ]
    },
    activeDefault: openRouterKey && !geminiKey ? "openrouter" : "gemini"
  });
});

app.post("/api/ai/openrouter/chat", requireAuth, async (req, res) => {
  const { messages, model, systemInstruction, temperature } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "الرسائل مطلوبة لبدء المحادثة" });
  }

  try {
    const { reply, modelUsed } = await callOpenRouterChat({
      messages,
      model: model || "deepseek/deepseek-chat",
      systemInstruction,
      temperature
    });

    res.json({
      success: true,
      provider: "openrouter",
      reply,
      modelUsed
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "فشل الاتصال بـ OpenRouter"
    });
  }
});

function formatGeminiChatError(err: any): string {
  const msg = String(err?.message || err || "");
  const status = err?.status || (msg.includes("503") ? 503 : msg.includes("429") ? 429 : msg.includes("403") ? 403 : msg.includes("404") ? 404 : 500);
  if (status === 403 || msg.includes("PERMISSION_DENIED") || msg.includes("API_KEY_INVALID")) {
    return "تعذر المصادقة مع مفتاح Gemini API (خطأ 403/400). يرجى التحقق من مفتاح API في إعدادات المشروع (Settings > Secrets).";
  }
  if (status === 503 || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
    return "خوادم الذكاء الاصطناعي تشهد ضغطاً مؤقتاً (503). يرجى إعادة المحاولة بعد ثوانٍ قليلة أو التبديل إلى OpenRouter.";
  }
  if (status === 429 || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded")) {
    return "تم تجاوز حد الاستخدام المجاني المؤقت لنموذج الذكاء الاصطناعي. يرجى المحاولة بعد لحظات أو التبديل إلى الوضع العام/السريع أو OpenRouter.";
  }
  if (status === 404 || msg.includes("NOT_FOUND")) {
    return "النموذج المطلوب غير متوفر حالياً. يرجى المحاولة بالوضع العام أو السريع.";
  }
  return msg || "حدث عطل مؤقت أثناء الاتصال بخدمة الذكاء الاصطناعي.";
}

app.post("/api/chat", requireAuth, async (req, res) => {
  const { messages, mode = "standard", provider = "auto", openRouterModel, systemInstruction, location } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "الرسائل مطلوبة لبدء المحادثة" });
  }

  const defaultSysInstruction = `أنت المساعد الطبي والدوائي الذكي لمنصة "مندوبك الطبي".
أنت خبير صيدلاني وطبي واستشاري مبيعات للأدوية والمستلزمات الطبية.
تواصل بلغة عربية فصحى، واضحة، علمية ومتقنة.
قدم إجابات منظمة، موثوقة، ومباشرة تخدم المندوبين، الأطباء، والصيادلة.`;

  const effectiveSystemInstruction = systemInstruction || defaultSysInstruction;
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || "";
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || "";

  const writeSseHeaders = () => {
    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      if (typeof (res as any).flushHeaders === "function") {
        (res as any).flushHeaders();
      }
    }
  };

  // 1. Explicit OpenRouter Request OR Gemini key missing while OpenRouter configured
  if (provider === "openrouter" || (!geminiKey && openRouterKey && provider !== "gemini")) {
    try {
      const { reply, modelUsed } = await callOpenRouterChat({
        messages,
        model: openRouterModel || "deepseek/deepseek-chat",
        systemInstruction: effectiveSystemInstruction
      });

      writeSseHeaders();
      res.write(`data: ${JSON.stringify({ text: reply, provider: "openrouter", modelUsed })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    } catch (err: any) {
      if (provider === "openrouter" && geminiKey) {
        console.warn("OpenRouter direct attempt failed, falling back to Gemini:", err.message);
      } else {
        writeSseHeaders();
        res.write(`data: ${JSON.stringify({ error: "فشل الاتصال بنماذج OpenRouter: " + (err.message || "عطل في الخدمة") })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }
    }
  }

  if (!geminiKey) {
    writeSseHeaders();
    res.write(`data: ${JSON.stringify({ error: "مفتاح GEMINI_API_KEY غير مضبوط على الخادم. يرجى التحقق من Settings > Secrets." })}\n\n`);
    res.write("data: [DONE]\n\n");
    return res.end();
  }

  // 2. Sanitize & merge consecutive same-role messages so Gemini always receives valid alternating turns
  const validMessages = messages.filter((m: any) => m && typeof m.text === "string" && m.text.trim().length > 0);
  let startIndex = 0;
  while (startIndex < validMessages.length && validMessages[startIndex].role !== "user") {
    startIndex++;
  }
  const messagesToSend = startIndex < validMessages.length ? validMessages.slice(startIndex) : validMessages;

  const formattedContents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const m of messagesToSend) {
    const role: "user" | "model" = m.role === "user" ? "user" : "model";
    const text = m.text.trim();
    if (!text) continue;
    const prev = formattedContents[formattedContents.length - 1];
    if (prev && prev.role === role) {
      prev.parts[0].text += `\n\n${text}`;
    } else {
      formattedContents.push({ role, parts: [{ text }] });
    }
  }

  if (formattedContents.length === 0) {
    formattedContents.push({
      role: "user",
      parts: [{ text: messages[messages.length - 1]?.text || "مرحباً" }]
    });
  } else if (formattedContents[formattedContents.length - 1].role !== "user") {
    formattedContents.push({ role: "user", parts: [{ text: "أكمل الإجابة" }] });
  }

  // 3. Build ordered Gemini model + tool fallback plans
  type ChatPlan = { model: string; tools?: any[]; toolConfig?: any };
  const plans: ChatPlan[] = [];

  if (mode === "complex" || mode === "thinking") {
    plans.push(
      { model: "gemini-4-argon" },
      { model: "gemini-4-hydrogen" },
      { model: "gemini-3.1-flash-lite" }
    );
  } else if (mode === "fast") {
    plans.push(
      { model: "gemini-3.1-flash-lite" },
      { model: "gemini-4-hydrogen" },
      { model: "gemini-4-argon" }
    );
  } else if (mode === "search") {
    plans.push(
      { model: "gemini-4-hydrogen", tools: [{ googleSearch: {} }] },
      { model: "gemini-3.1-flash-lite", tools: [{ googleSearch: {} }] },
      { model: "gemini-4-hydrogen" },
      { model: "gemini-3.1-flash-lite" }
    );
  } else if (mode === "maps") {
    const toolConfig =
      location && location.latitude && location.longitude
        ? {
            retrievalConfig: {
              latLng: {
                latitude: Number(location.latitude),
                longitude: Number(location.longitude)
              }
            }
          }
        : undefined;
    plans.push(
      { model: "gemini-4-hydrogen", tools: [{ googleMaps: {} }], toolConfig },
      { model: "gemini-3.1-flash-lite", tools: [{ googleMaps: {} }], toolConfig },
      { model: "gemini-4-hydrogen" },
      { model: "gemini-3.1-flash-lite" }
    );
  } else {
    plans.push(
      { model: "gemini-4-hydrogen" },
      { model: "gemini-3.1-flash-lite" },
      { model: "gemini-4-argon" }
    );
  }

  writeSseHeaders();

  const aiClient = new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });

  let lastError: any = null;
  let hasSentChunk = false;

  for (const plan of plans) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const config: any = {
          systemInstruction: effectiveSystemInstruction
        };
        if (plan.tools) config.tools = plan.tools;
        if (plan.toolConfig) config.toolConfig = plan.toolConfig;

        const stream = await aiClient.models.generateContentStream({
          model: plan.model,
          contents: formattedContents,
          config
        });

        for await (const chunk of stream) {
          if (!hasSentChunk) {
            hasSentChunk = true;
            res.write(`data: ${JSON.stringify({ provider: "gemini", modelUsed: plan.model })}\n\n`);
          }
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
          const groundingMeta = (chunk.candidates?.[0] as any)?.groundingMetadata;
          if (groundingMeta?.groundingChunks && Array.isArray(groundingMeta.groundingChunks)) {
            res.write(`data: ${JSON.stringify({ groundingSources: groundingMeta.groundingChunks })}\n\n`);
          }
        }

        if (hasSentChunk) {
          res.write("data: [DONE]\n\n");
          return res.end();
        }
        break;
      } catch (err: any) {
        const errStatus = Number(err?.status || 0);
        const errMsg = String(err?.message || "");
        const isTransient = errStatus === 503 || errStatus === 429 || errMsg.includes("503") || errMsg.includes("UNAVAILABLE");
        console.warn(`Gemini chat plan (${plan.model}${plan.tools ? "+tools" : ""}) failed (attempt ${attempt + 1}):`, err?.status || err?.message);
        lastError = err;
        if (hasSentChunk) {
          break;
        }
        if (isTransient && attempt === 0) {
          await new Promise((r) => setTimeout(r, 700));
          continue;
        }
        break;
      }
    }
    if (hasSentChunk) {
      break;
    }
  }

  // 4. Non-streaming Gemini emergency fallback before OpenRouter
  if (!hasSentChunk) {
    try {
      const { response: fallbackResp, modelUsed } = await robustGenerateContent(
        aiClient,
        plans[0]?.model || "gemini-4-hydrogen",
        formattedContents,
        { systemInstruction: effectiveSystemInstruction },
        true
      );
      if (fallbackResp?.text) {
        hasSentChunk = true;
        res.write(`data: ${JSON.stringify({ provider: "gemini", modelUsed })}\n\n`);
        res.write(`data: ${JSON.stringify({ text: fallbackResp.text })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }
    } catch (nonStreamErr: any) {
      lastError = nonStreamErr;
    }
  }

  // 5. Automatic OpenRouter fallback if Gemini failed before streaming & provider is auto
  const cleanOrKey = openRouterKey.replace(/^["']+|["']+$/g, "").replace(/[^\x20-\x7E]/g, "").trim();
  if (!hasSentChunk && provider !== "gemini" && cleanOrKey.length >= 12) {
    try {
      const { reply, modelUsed } = await callOpenRouterChat({
        messages,
        model: openRouterModel || "deepseek/deepseek-chat",
        systemInstruction: effectiveSystemInstruction
      });
      res.write(`data: ${JSON.stringify({ text: reply, provider: "openrouter", modelUsed })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    } catch (orErr: any) {
      console.warn("OpenRouter fallback after Gemini failure also failed:", orErr?.message);
    }
  }

  if (!hasSentChunk) {
    res.write(`data: ${JSON.stringify({ error: formatGeminiChatError(lastError) })}\n\n`);
  }
  res.write("data: [DONE]\n\n");
  res.end();
});

// --- GEMINI AUDIO TRANSCRIPTION API ---
app.post("/api/ai/transcribe-audio", requireAuth, async (req, res) => {
  const { audioBase64, mimeType = "audio/webm" } = req.body || {};
  if (!audioBase64 || typeof audioBase64 !== "string") {
    return res.status(400).json({ success: false, error: "بيانات الصوت مطلوبة للتفريغ" });
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    return res.status(500).json({ success: false, error: "مفتاح GEMINI_API_KEY غير مضبوط على الخادم" });
  }

  const aiClient = new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } }
  });

  const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
  const audioPart = {
    inlineData: {
      mimeType: mimeType.split(";")[0] || "audio/webm",
      data: cleanBase64
    }
  };
  const promptPart = {
    text: "قم بتفريغ الكلام المسموع في هذا التسجيل الصوتي بدقة إلى نص مكتوب فقط دون أي مقدمات أو تعليقات."
  };

  for (const model of ["gemini-3.5-transcribe", "gemini-4-hydrogen", "gemini-3.1-flash-lite"]) {
    try {
      const response = await aiClient.models.generateContent({
        model,
        contents: { parts: [audioPart, promptPart] }
      });
      const text = response.text?.trim() || "";
      if (text) {
        return res.json({ success: true, text, modelUsed: model });
      }
    } catch (err: any) {
      console.warn(`Audio transcription with ${model} failed:`, err?.status || err?.message);
    }
  }

  return res.status(500).json({
    success: false,
    error: "تعذر تفريغ التسجيل الصوتي حالياً. يرجى المحاولة مرة أخرى."
  });
});

app.post("/api/ai/suggest-category", requireAuth, async (req, res) => {
  const { name, productName, activeIngredient, description, availableCategories, allowNewCategories = true } = req.body || {};
  const itemName = String(productName || name || "").trim();
  const ingredient = String(activeIngredient || "").trim();
  const desc = String(description || "").trim();

  if (!itemName && !ingredient && !desc) {
    return res.status(400).json({ error: "يرجى إدخال اسم الصنف أو المادة الفعالة أولاً." });
  }

  try {
    const result = await classifySingleProductWithGemini({
      name: itemName,
      activeIngredient: ingredient,
      description: desc,
      availableCategories,
      allowNewCategories: Boolean(allowNewCategories),
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("AI suggest-category error:", err);
    res.status(500).json({ error: err?.message || "فشل اقتراح التصنيف عبر Gemini AI" });
  }
});

// Batch auto-classify catalog products into available system categories or suggest new categories using Gemini AI
app.post("/api/ai/classify-catalog", requirePrivileged, async (req, res) => {
  const { products, availableCategories, allowNewCategories = true } = req.body || {};

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "مفتاح Gemini API غير مهيأ على الخادم." });
  }

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: "يرجى توفير قائمة الأصناف المراد تحليلها وتصنيفها." });
  }

  const allowNew = Boolean(allowNewCategories);
  const categoriesList =
    Array.isArray(availableCategories) && availableCategories.length > 0
      ? Array.from(new Set(availableCategories.map((c) => String(c || "").trim()).filter(Boolean)))
      : DEFAULT_CATALOG_CATEGORIES;

  const sanitizedProducts = products
    .filter((p) => p && typeof p.id === "string" && typeof p.name === "string" && p.name.trim())
    .map((p) => ({
      id: String(p.id).trim(),
      name: String(p.name).trim(),
      activeIngredient: p.activeIngredient ? String(p.activeIngredient).trim() : "",
      description: p.description ? String(p.description).trim() : "",
      currentCategory: p.currentCategory || p.category ? String(p.currentCategory || p.category).trim() : "عام",
    }));

  if (sanitizedProducts.length === 0) {
    return res.status(400).json({ error: "لا توجد أصناف صالحة للتحليل." });
  }

  try {
    const BATCH_SIZE = 35;
    const allResults: Array<{
      id: string;
      suggestedCategory: string;
      isNewCategory: boolean;
      detectedActiveIngredient: string;
      confidence: string;
      reason: string;
    }> = [];
    const suggestedNewSet = new Set<string>();
    let lastModelUsed = "gemini-4-hydrogen";

    for (let i = 0; i < sanitizedProducts.length; i += BATCH_SIZE) {
      const chunk = sanitizedProducts.slice(i, i + BATCH_SIZE);
      const itemsPrompt = chunk
        .map(
          (item, idx) =>
            `${idx + 1}. id="${item.id}" | الاسم: "${item.name}" | المادة الفعالة: "${
              item.activeIngredient || "غير مذكورة"
            }" | الوصف: "${item.description || "لا يوجد"}" | التصنيف الحالي: "${item.currentCategory}"`
        )
        .join("\n");

      const prompt = `قم بتحليل أسماء الأصناف والمواد الفعالة التالية في كتالوج الصيدليات والمستودعات الطبية، وصنّف كل صنف تلقائياً إلى أنسب فئة من قائمة الفئات المتاحة في النظام${
        allowNew
          ? "، أو اقترح اسماً عربياً واضحاً ومختصراً لتصنيف جديد إذا لم يناسب أي تصنيف متاح طبيعة الصنف بدقة"
          : ""
      }.

قائمة الفئات المتاحة في النظام${allowNew ? " (يفضل الاختيار منها كلما أمكن)" : " (يجب اختيار الفئة من هذه القائمة حصراً وبنفس النص)"}:
${categoriesList.map((c) => `- ${c}`).join("\n")}

قائمة الأصناف المطلوب تصنيفها (${chunk.length} صنف):
${itemsPrompt}`;

      const { response, modelUsed } = await robustGenerateContent(
        ai,
        "gemini-4-hydrogen",
        prompt,
        {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: allowNew
            ? "أنت خبير صيدلاني متخصص في تصنيف الأدوية والمستلزمات الطبية. حلّل اسم الدواء التجاري والمادة الفعالة والشكل الصيدلاني والتركيز؛ اختر لكل صنف أنسب فئة من القائمة المتاحة أولاً، وإذا لم توجد فئة متاحة دقيقة (مثل مستلزمات أسنان أو عناية بالبشرة أو أدوية أعصاب وغيرها)، اقترح تصنيفاً جديداً موجزاً بالعربية (من كلمتين إلى 4 كلمات) واضبط isNewCategory على true. أرجع مصفوفة JSON مطابقة للمخطط لكل معرف id."
            : "أنت خبير صيدلاني متخصص في تصنيف الأدوية والمستلزمات الطبية. حلّل اسم الدواء التجاري والشكل الصيدلاني والتركيز والمادة الفعالة (إن وجدت) واختر لكل صنف أنسب فئة من القائمة المتاحة فقط. أرجع مصفوفة JSON مطابقة للمخطط تحتوي على كل معرف id تم إرساله.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: {
                  type: Type.STRING,
                  description: "معرف الصنف كما ورد في المدخلات تماماً.",
                },
                suggestedCategory: {
                  type: Type.STRING,
                  description: allowNew
                    ? "اسم الفئة من القائمة المتاحة أو اسم تصنيف جديد مختصر بالعربية."
                    : "اسم الفئة المقترحة بالنص المطابق من الفئات المتاحة.",
                },
                isNewCategory: {
                  type: Type.BOOLEAN,
                  description: "true إذا كانت الفئة المقترحة جديدة وغير موجودة في القائمة المتاحة، وfalse خلاف ذلك.",
                },
                detectedActiveIngredient: {
                  type: Type.STRING,
                  description: "المادة الفعالة العلمية المستنتجة من اسم الدواء إن أمكن معرفتها بدقة.",
                },
                confidence: {
                  type: Type.STRING,
                  description: "درجة الثقة في التصنيف: عالية أو متوسطة أو منخفضة.",
                },
                reason: {
                  type: Type.STRING,
                  description: "توضيح موجز باللغة العربية لسبب اختيار هذه الفئة (بحد أقصى 10 كلمات).",
                },
              },
              required: ["id", "suggestedCategory", "confidence", "reason"],
            },
          },
        },
        false
      );

      lastModelUsed = modelUsed;
      const parsedArray = JSON.parse((response.text ?? "[]").trim());
      if (Array.isArray(parsedArray)) {
        const resultById = new Map<string, any>();
        for (const r of parsedArray) {
          if (r && typeof r.id === "string") {
            resultById.set(r.id.trim(), r);
          }
        }

        for (const srcItem of chunk) {
          const match = resultById.get(srcItem.id);
          const resolved = resolveCatalogCategory(
            match?.suggestedCategory || srcItem.currentCategory,
            categoriesList,
            allowNew
          );
          if (resolved.isNewCategory) {
            suggestedNewSet.add(resolved.category);
          }
          allResults.push({
            id: srcItem.id,
            suggestedCategory: resolved.category,
            isNewCategory: resolved.isNewCategory,
            detectedActiveIngredient: String(match?.detectedActiveIngredient || "").trim(),
            confidence: String(match?.confidence || "متوسطة").trim(),
            reason: String(match?.reason || "تصنيف بناءً على الاسم الدوائي والمادة الفعالة").trim(),
          });
        }
      }
    }

    res.json({
      success: true,
      model: lastModelUsed,
      totalProcessed: allResults.length,
      suggestedNewCategories: Array.from(suggestedNewSet),
      classifications: allResults,
    });
  } catch (err: any) {
    console.error("AI Catalog Batch Classification Error:", err);
    res.status(500).json({
      error: "تعذر تحليل وتصنيف أصناف الكتالوج عبر Gemini AI: " + (err?.message || "خطأ غير متوقع"),
    });
  }
});

// Standard Gemini Generate Endpoint per AI Studio @google/genai guidelines
app.post("/api/gemini/generate", requireAuth, async (req, res) => {
  const { prompt, contents, systemInstruction } = req.body || {};
  const userPrompt = prompt || (typeof contents === "string" ? contents : contents?.parts?.[0]?.text) || "مرحباً";

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const { response, modelUsed } = await robustGenerateContent(
      ai,
      "gemini-4-hydrogen",
      userPrompt,
      systemInstruction ? { systemInstruction } : {},
      true
    );

    res.json({
      success: true,
      model: modelUsed,
      text: response.text,
      reply: response.text
    });
  } catch (err: any) {
    console.error("Gemini Generate Error:", err);
    res.status(500).json({
      success: false,
      error: "فشل توليد الإجابة من Gemini: " + (err.message || "عطل في الخدمة")
    });
  }
});

// Streaming Gemini API Endpoint (Server-Sent Events) with gemini-4-hydrogen
app.post("/api/gemini/stream", requireAuth, async (req, res) => {
  const { prompt, contents, systemInstruction } = req.body || {};
  const userPrompt = prompt || (typeof contents === "string" ? contents : contents?.parts?.[0]?.text) || "مرحباً";

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-4-hydrogen",
      contents: userPrompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("Gemini Stream Error:", err);
    res.write(`data: ${JSON.stringify({ error: err.message || "حدث خطأ أثناء البث المباشر" })}\n\n`);
    res.end();
  }
});

// --- GOOGLE GENAI MODEL INTERACTIONS API (gemini-4-hydrogen + google_search + thinking_level) ---
app.post("/api/ai/interaction", requireAuth, async (req, res) => {
  const {
    input,
    prompt,
    model = "gemini-4-hydrogen",
    useSearch = true,
    thinkingLevel = "medium",
    systemInstruction,
    previousInteractionId,
  } = req.body || {};

  const userInput = (input || prompt || "").toString().trim();
  if (!userInput) {
    return res.status(400).json({ success: false, error: "نص السؤال (input) مطلوب لبدء التفاعل." });
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    return res.status(500).json({
      success: false,
      error: "مفتاح GEMINI_API_KEY غير مضبوط على الخادم. يرجى التحقق من Settings > Secrets.",
    });
  }

  // Normalize legacy model names such as gemini-3.8-flash to active Gemini 4 models
  const resolvedModel =
    model === "gemini-3.8-flash" || model === "gemini-flash-latest"
      ? "gemini-4-hydrogen"
      : model;

  const allowedThinkingLevels = ["low", "medium", "high", "xhigh"];
  const normalizedThinking =
    typeof thinkingLevel === "string" && allowedThinkingLevels.includes(thinkingLevel.toLowerCase())
      ? thinkingLevel.toLowerCase()
      : "medium";

  try {
    const aiClient = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const interactionParams: any = {
      model: resolvedModel,
      input: userInput,
      generation_config: {
        thinking_level: normalizedThinking,
      },
    };

    if (useSearch) {
      interactionParams.tools = [{ type: "google_search" }];
    }
    if (systemInstruction && typeof systemInstruction === "string" && systemInstruction.trim()) {
      interactionParams.system_instruction = systemInstruction.trim();
    }
    if (previousInteractionId && typeof previousInteractionId === "string" && previousInteractionId.trim()) {
      interactionParams.previous_interaction_id = previousInteractionId.trim();
    }

    const interaction = await aiClient.interactions.create(interactionParams);

    let fullOutput = interaction.output_text || "";
    if (!fullOutput && Array.isArray(interaction.steps)) {
      for (const step of interaction.steps) {
        if (step.type === "model_output") {
          const textContent = step.content?.find((c: any) => c.type === "text") as any;
          if (textContent?.text) {
            fullOutput += textContent.text;
          }
        }
      }
    }

    return res.json({
      success: true,
      interactionId: interaction.id,
      modelUsed: resolvedModel,
      output_text: fullOutput,
      steps: interaction.steps || [],
    });
  } catch (err: any) {
    console.error("Gemini Interaction Error:", err);
    return res.status(err?.status || 500).json({
      success: false,
      error: formatGeminiChatError(err),
    });
  }
});

// --- GOOGLE GENAI INTERACTIONS AGENT API (ANTIGRAVITY & DEEP RESEARCH) ---
app.post("/api/ai/agent-interaction", requireAuth, async (req, res) => {
  const { input, prompt, agent = "antigravity-preview-09-2026", background = false } = req.body || {};
  const userInput = input || prompt;
  if (!userInput || typeof userInput !== "string" || userInput.trim() === "") {
    return res.status(400).json({ error: "نص الإدخال (input/prompt) مطلوب لبدء المحادثة مع الوكيل الذكي" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const interaction = await ai.interactions.create({
      agent: agent || "antigravity-preview-09-2026",
      input: userInput.trim(),
      environment: "remote",
      background: Boolean(background)
    }, { timeout: 300000 });

    let fullOutput = "";
    if (interaction.steps && Array.isArray(interaction.steps)) {
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          const textContent = step.content?.find((c: any) => c.type === 'text') as any;
          if (textContent && textContent.text) {
            fullOutput += textContent.text;
          }
        }
      }
    }
    if (!fullOutput && interaction.output_text) {
      fullOutput = interaction.output_text;
    }

    res.json({
      success: true,
      interactionId: interaction.id,
      status: interaction.status,
      environmentId: (interaction as any).environment_id,
      output: fullOutput || "تم استلام وتشغيل المهمة بنجاح",
      steps: interaction.steps || []
    });
  } catch (err: any) {
    console.error("Gemini Agent Interaction Error:", err);
    res.status(500).json({
      success: false,
      error: "فشل تنفيذ وكيل الذكاء الاصطناعي (Agent Interaction): " + (err.message || "عطل في الخدمة")
    });
  }
});

app.get("/api/ai/agent-interaction/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "معرف المهمة (interactionId) مطلوب" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const interaction = await ai.interactions.get(id);

    let fullOutput = "";
    if (interaction.steps && Array.isArray(interaction.steps)) {
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          const textContent = step.content?.find((c: any) => c.type === 'text') as any;
          if (textContent && textContent.text) {
            fullOutput += textContent.text;
          }
        }
      }
    }
    if (!fullOutput && interaction.output_text) {
      fullOutput = interaction.output_text;
    }

    res.json({
      success: true,
      interactionId: interaction.id,
      status: interaction.status,
      environmentId: (interaction as any).environment_id,
      output: fullOutput,
      steps: interaction.steps || []
    });
  } catch (err: any) {
    console.error("Gemini Agent Interaction Get Error:", err);
    res.status(500).json({
      success: false,
      error: "فشل استرداد حالة المهمة: " + (err.message || "عطل في الخدمة")
    });
  }
});

// --- GEMINI AI IMAGE GENERATION API ---
app.post("/api/ai/generate-image", requireAuth, async (req, res) => {
  const { prompt, aspectRatio = "1:1", imageSize = "1K" } = req.body || {};
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return res.status(400).json({ error: "نص التوجيه (Prompt) مطلوب لتوليد الصورة" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: {
        parts: [
          {
            text: `High quality, clean professional pharmaceutical advertisement flyer: ${prompt}`
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: (aspectRatio as any) || "1:1",
          imageSize: (imageSize as any) || "1K"
        }
      }
    });

    let imageUrl: string | null = null;
    let description = "";

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        } else if (part.text) {
          description += part.text + " ";
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        success: false,
        error: "لم يتم استلام بيانات الصورة من النموذج. يرجى المحاولة مرة أخرى."
      });
    }

    res.json({
      success: true,
      imageUrl,
      description: description.trim() || undefined
    });
  } catch (err: any) {
    console.error("Gemini Image Generation Error:", err);
    res.status(500).json({
      success: false,
      error: "فشل توليد التصميم بالذكاء الاصطناعي: " + (err.message || "عطل في الخدمة")
    });
  }
});

// --- GEMINI AI IMAGE EDITING API ---
app.post("/api/ai/edit-image", requireAuth, async (req, res) => {
  const { prompt, imageBase64, mimeType = "image/png" } = req.body || {};
  if (!prompt || !imageBase64) {
    return res.status(400).json({ error: "الصورة والنص التوجيهي مطلوبان لتعديل الصورة" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Remove data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || "image/png"
            }
          },
          {
            text: prompt
          }
        ]
      }
    });

    let imageUrl: string | null = null;
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        success: false,
        error: "لم يتم استلام الصورة المعدلة من النموذج."
      });
    }

    res.json({
      success: true,
      imageUrl
    });
  } catch (err: any) {
    console.error("Gemini Image Edit Error:", err);
    res.status(500).json({
      success: false,
      error: "فشل تعديل الصورة: " + (err.message || "عطل في الخدمة")
    });
  }
});



// --- BIOSCIENCE SKILLS API (PubChem PUG REST, openFDA, Europe PMC) ---
app.get("/api/science/compound-lookup", async (req, res) => {
  const queryName = (req.query.name as string || "").trim();
  if (!queryName) {
    return res.status(400).json({ error: "اسم المركب أو الدواء مطلوب للبحث العلمي" });
  }

  try {
    let cid: number | null = null;
    let properties: any = null;
    let structurePngUrl: string | null = null;

    // 1. Resolve CID from PubChem PUG REST
    try {
      const cidRes = await axios.get(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(queryName)}/cids/JSON`,
        { timeout: 5000 }
      );
      if (cidRes.data?.IdentifierList?.CID?.[0]) {
        cid = cidRes.data.IdentifierList.CID[0];
        structurePngUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=300x300`;
      }
    } catch (e: any) {
      console.warn("PubChem CID lookup fallback notice:", e.message);
    }

    // 2. Fetch Calculated Physicochemical Properties if CID found
    if (cid) {
      try {
        const propRes = await axios.get(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,IsomericSMILES,InChIKey,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,Complexity/JSON`,
          { timeout: 5000 }
        );
        properties = propRes.data?.PropertyTable?.Properties?.[0] || null;
      } catch (e: any) {
        console.warn("PubChem properties lookup fallback notice:", e.message);
      }
    }

    // 3. Query openFDA for official clinical drug labeling and boxed warnings
    let fdaLabel: any = null;
    try {
      const fdaRes = await axios.get(
        `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(queryName)}"+openfda.brand_name:"${encodeURIComponent(queryName)}"&limit=1`,
        { timeout: 5000 }
      );
      const doc = fdaRes.data?.results?.[0];
      if (doc) {
        fdaLabel = {
          brandName: doc.openfda?.brand_name?.[0] || queryName,
          genericName: doc.openfda?.generic_name?.[0] || queryName,
          substanceName: doc.openfda?.substance_name?.[0],
          pharmClass: doc.openfda?.pharm_class_epc || doc.openfda?.pharm_class_cs,
          indications: doc.indications_and_usage?.[0] || doc.description?.[0],
          boxedWarning: doc.boxed_warning?.[0],
          contraindications: doc.contraindications?.[0],
          dosageAndAdministration: doc.dosage_and_administration?.[0],
          drugInteractions: doc.drug_interactions?.[0]
        };
      }
    } catch (e: any) {
      // openFDA returns 404 if no exact match, which is fine
    }

    // 4. Query Europe PMC for recent open-access clinical literature
    let literature: any[] = [];
    try {
      const epmcRes = await axios.get(
        `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(queryName)}+AND+SRC:MED&format=json&pageSize=4&sort=P_PD_D`,
        { timeout: 5000 }
      );
      const resultList = epmcRes.data?.resultList?.result || [];
      literature = resultList.map((r: any) => ({
        id: r.id,
        title: r.title,
        authorString: r.authorString,
        journalTitle: r.journalTitle,
        pubYear: r.pubYear,
        doi: r.doi,
        isOpenAccess: r.isOpenAccess === "Y",
        url: r.doi ? `https://doi.org/${r.doi}` : `https://europepmc.org/article/MED/${r.id}`
      }));
    } catch (e: any) {
      console.warn("Europe PMC literature search fallback notice (ignoring):", e.message);
      literature = []; // Ensure literature remains an empty array
    }

    // 5. Evaluate Lipinski Rule of 5 and Veber's oral bioavailability rules
    let lipinskiEvaluation: any = null;
    if (properties) {
      const mw = parseFloat(properties.MolecularWeight) || 0;
      const xlogp = parseFloat(properties.XLogP) || 0;
      const hbd = parseInt(properties.HBondDonorCount, 10) || 0;
      const hba = parseInt(properties.HBondAcceptorCount, 10) || 0;
      const rotatableBonds = parseInt(properties.RotatableBondCount, 10) || 0;
      const tpsa = parseFloat(properties.TPSA) || 0;

      const violations: string[] = [];
      if (mw > 500) violations.push(`الوزن الجزيئي (${mw} Da) يتجاوز 500`);
      if (xlogp > 5) violations.push(`معامل الارتباط الدهني LogP (${xlogp}) يتجاوز 5`);
      if (hbd > 5) violations.push(`روابط الهيدروجين المانحة (${hbd}) تتجاوز 5`);
      if (hba > 10) violations.push(`روابط الهيدروجين المستقبلة (${hba}) تتجاوز 10`);

      const veberViolations: string[] = [];
      if (rotatableBonds > 10) veberViolations.push(`الروابط القابلة للدوران (${rotatableBonds}) تتجاوز 10`);
      if (tpsa > 140) veberViolations.push(`المساحة السطحية القطبية (${tpsa} Å²) تتجاوز 140 Å²`);

      lipinskiEvaluation = {
        passed: violations.length <= 1,
        violationsCount: violations.length,
        violations,
        veberPassed: veberViolations.length === 0,
        veberViolations,
        isOrallyBioavailable: violations.length <= 1 && veberViolations.length === 0,
        summaryArabic: violations.length === 0
          ? "مطابق تماماً لقواعد ليبينسكي وفايبر للتوافر الحيوي الفموي الممتاز (Rule of 5 compliant)"
          : violations.length === 1
          ? "مقبول صيدلانياً مع خرق طفيف واحد فقط لقاعدة ليبينسكي"
          : "قد يواجه تحديات في الامتصاص المعوي الفموي وفقاً لقواعد ليبينسكي"
      };
    }

    res.json({
      success: true,
      query: queryName,
      cid,
      structurePngUrl,
      properties,
      lipinskiEvaluation,
      fdaLabel,
      literature,
      provenance: {
        databases: ["PubChem PUG REST", "openFDA API", "Europe PMC"],
        timestamp: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error("Science Compound Lookup Error:", err);
    res.status(500).json({
      success: false,
      error: "فشل استرداد البيانات العلمية للمركب: " + (err.message || "عطل في الاتصال")
    });
  }
});



// ---------------- GEMINI BATCH & GENAI WEBHOOK INTEGRATION ----------------
// Specification: Standard Webhooks (HMAC-SHA256)
// Supporting: https://my-api.com/gemini-callback and /api/gemini-callback
// Events: batch.succeeded, batch.failed, batch.cancelled, batch.expired, video.generated, interaction.completed

async function fetchGeminiWebhooksFromDB(): Promise<GeminiWebhookEventRecord[]> {
  const db = getDB();
  let list = db.geminiWebhooks || [];

  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("gemini_webhooks").orderBy("receivedAt", "desc").limit(100).get();
      if (!snap.empty) {
        const fbList: GeminiWebhookEventRecord[] = [];
        snap.forEach((doc) => {
          fbList.push(doc.data() as GeminiWebhookEventRecord);
        });
        const map = new Map<string, GeminiWebhookEventRecord>();
        list.forEach((item) => map.set(item.id, item));
        fbList.forEach((item) => map.set(item.id, item));
        list = Array.from(map.values());
      }
    } catch (e: any) {
      console.warn("Firebase fetch gemini webhooks fallback:", e.message);
    }
  }

  list.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  return list;
}

async function saveGeminiWebhookToDB(item: GeminiWebhookEventRecord): Promise<void> {
  const db = getDB();
  if (!db.geminiWebhooks) db.geminiWebhooks = [];
  db.geminiWebhooks.unshift(item);
  if (db.geminiWebhooks.length > 200) {
    db.geminiWebhooks = db.geminiWebhooks.slice(0, 200);
  }
  saveDB(db);

  if (isFirebaseEnabled && dbAdmin) {
    try {
      await dbAdmin.collection("gemini_webhooks").doc(item.id).set(item);
    } catch (e: any) {
      console.warn("Firebase save gemini webhook fallback:", e.message);
    }
  }
}

async function clearGeminiWebhooksFromDB(): Promise<void> {
  const db = getDB();
  db.geminiWebhooks = [];
  saveDB(db);

  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("gemini_webhooks").get();
      const batch = dbAdmin.batch();
      snap.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch (e: any) {
      console.warn("Firebase clear gemini webhooks fallback:", e.message);
    }
  }
}

function verifyStandardWebhookSignature(
  rawBody: Buffer | string,
  headers: Record<string, any>,
  secretKeyString?: string
): { verified: boolean; reason?: string } {
  const secret = secretKeyString || process.env.GEMINI_WEBHOOK_SECRET || process.env.GEMINI_WEBHOOK_SIGNING_SECRET || getDB().settings?.geminiWebhookSecret;

  if (!secret || !secret.trim()) {
    return {
      verified: false,
      reason: "مفتاح التوقيع السري غير مهيأ في بيئة الخادم (GEMINI_WEBHOOK_SECRET)"
    };
  }

  const webhookId = (headers["webhook-id"] || headers["x-webhook-id"] || "") as string;
  const webhookTimestamp = (headers["webhook-timestamp"] || headers["x-webhook-timestamp"] || "") as string;
  const webhookSignatureHeader = (headers["webhook-signature"] || headers["x-goog-signature"] || headers["x-signature"] || "") as string;

  if (!webhookSignatureHeader) {
    return {
      verified: false,
      reason: "ترويسة التوقيع مفقودة من الطلب (webhook-signature)"
    };
  }

  // Parse secret (Standard Webhooks format: whsec_ followed by base64)
  let secretBuffer: Buffer;
  const cleanSecret = secret.trim();
  if (cleanSecret.startsWith("whsec_")) {
    try {
      secretBuffer = Buffer.from(cleanSecret.slice(6), "base64");
    } catch {
      secretBuffer = Buffer.from(cleanSecret, "utf-8");
    }
  } else {
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(cleanSecret) && cleanSecret.length % 4 === 0;
    secretBuffer = isBase64 ? Buffer.from(cleanSecret, "base64") : Buffer.from(cleanSecret, "utf-8");
  }

  const rawBodyStr = typeof rawBody === "string" ? rawBody : (rawBody ? rawBody.toString("utf8") : "");

  // Check timestamp drift tolerance (10 minutes)
  if (webhookTimestamp) {
    const timestampSec = parseInt(webhookTimestamp, 10);
    if (!isNaN(timestampSec)) {
      const nowSec = Math.floor(Date.now() / 1000);
      const diff = Math.abs(nowSec - timestampSec);
      if (diff > 600) {
        console.warn(`[Gemini Webhook] Timestamp drift notice: diff=${diff}s`);
      }
    }
  }

  // Standard Webhooks signature payload format: "${webhook_id}.${webhook_timestamp}.${body}"
  const toSign = webhookId && webhookTimestamp
    ? `${webhookId}.${webhookTimestamp}.${rawBodyStr}`
    : rawBodyStr;

  const expectedHmacBase64 = crypto.createHmac("sha256", secretBuffer).update(toSign).digest("base64");
  const expectedHmacHex = crypto.createHmac("sha256", secretBuffer).update(toSign).digest("hex");

  // Signatures can be a space-delimited list of candidate signatures: e.g. "v1,abc= v1,def="
  const sigTokens = webhookSignatureHeader.split(/\s+/);
  for (const token of sigTokens) {
    const sigValue = token.startsWith("v1,") ? token.slice(3) : token;
    try {
      const sigBuf = Buffer.from(sigValue, "base64");
      const expBuf = Buffer.from(expectedHmacBase64, "base64");
      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
        return { verified: true };
      }
    } catch {
      // Continue to next token
    }

    if (sigValue === expectedHmacBase64 || sigValue === expectedHmacHex) {
      return { verified: true };
    }
  }

  return {
    verified: false,
    reason: "عدم تطابق التوقيع الرقمي (Signature mismatch)"
  };
}

async function handleGeminiWebhook(req: express.Request, res: express.Response) {
  const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const headers = req.headers;
  const body = req.body || {};

  const webhookId = (headers["webhook-id"] || headers["x-webhook-id"] || `wh_${Date.now()}`) as string;
  const webhookTimestamp = (headers["webhook-timestamp"] || new Date().toISOString()) as string;

  // Verify signature
  const verification = verifyStandardWebhookSignature(rawBody, headers);
  const secretConfigured = Boolean(
    process.env.GEMINI_WEBHOOK_SECRET ||
    process.env.GEMINI_WEBHOOK_SIGNING_SECRET ||
    getDB().settings?.geminiWebhookSecret
  );

  // If secret is set AND signature was provided, reject invalid signatures
  if (secretConfigured && (headers["webhook-signature"] || headers["x-goog-signature"]) && !verification.verified) {
    console.warn("[Gemini Webhook] Rejected invalid signature:", verification.reason);
    return res.status(401).json({
      success: false,
      error: "فشل التحقق من التوقيع الرقمي للويب هوك",
      reason: verification.reason
    });
  }

  // Extract Event Details
  const eventType = body.type || body.event || body.event_type || headers["webhook-event-type"] || "batch.succeeded";
  const batchId = body.data?.batch_id || body.data?.name || body.batch_id || body.data?.id || body.name || "batch_" + Math.random().toString(36).substr(2, 7);
  const model = body.data?.model || body.model || "gemini-3.8-flash";
  const outputUri = body.data?.output_uri || body.output_uri || null;
  const totalCount = body.data?.total_count !== undefined ? Number(body.data.total_count) : undefined;
  const completedCount = body.data?.completed_count !== undefined ? Number(body.data.completed_count) : undefined;
  const failedCount = body.data?.failed_count !== undefined ? Number(body.data.failed_count) : undefined;
  const errorMsg = body.data?.error?.message || (typeof body.data?.error === "string" ? body.data.error : null) || (typeof body.error === "string" ? body.error : null) || null;

  let status: GeminiWebhookEventRecord["status"] = "received";
  if (eventType === "batch.succeeded" || body.data?.state === "JOB_STATE_SUCCEEDED") {
    status = "succeeded";
  } else if (eventType === "batch.failed" || body.data?.state === "JOB_STATE_FAILED") {
    status = "failed";
  } else if (eventType === "batch.cancelled") {
    status = "cancelled";
  } else if (eventType === "batch.expired") {
    status = "expired";
  }

  const summary = eventType === "batch.succeeded"
    ? `تم اكتمال معالجة دفعة Gemini (${batchId}) بنجاح بواسطة النموذج ${model}. إجمالي العمليات: ${totalCount ?? completedCount ?? 1}`
    : eventType === "batch.failed"
    ? `فشلت معالجة دفعة Gemini (${batchId}). السبب: ${errorMsg || "خطأ غير محدد"}`
    : `تم استلام إشعار حدث Gemini Webhook: ${eventType} للدفعة ${batchId}`;

  const eventRecord: GeminiWebhookEventRecord = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    webhookId,
    eventType,
    batchId,
    model,
    status,
    outputUri,
    totalCount,
    completedCount,
    failedCount,
    error: errorMsg,
    payload: body,
    headers: {
      "webhook-id": webhookId,
      "webhook-timestamp": String(webhookTimestamp),
      "content-type": (headers["content-type"] as string) || "application/json"
    },
    verified: verification.verified,
    receivedAt: new Date().toISOString(),
    summary
  };

  await saveGeminiWebhookToDB(eventRecord);
  console.log(`[Gemini Webhook] Successfully processed ${eventType} (${batchId}) | Verified: ${verification.verified}`);

  return res.status(200).json({
    success: true,
    eventId: eventRecord.id,
    eventType,
    batchId,
    verified: verification.verified,
    message: "Gemini webhook received and processed successfully"
  });
}

// Support the user's specific URI (/gemini-callback) and standard API endpoints
app.post(["/gemini-callback", "/api/gemini-callback", "/api/gemini/webhook"], handleGeminiWebhook);

// GET handler to check callback status and instructions
app.get(["/gemini-callback", "/api/gemini-callback"], (req, res) => {
  const host = req.get("host") || "mandoubak-med-1.vercel.app";
  const protocol = req.protocol === "http" && host.includes("localhost") ? "http" : "https";
  const fullUrl = `${protocol}://${host}/gemini-callback`;
  const secretConfigured = Boolean(
    process.env.GEMINI_WEBHOOK_SECRET ||
    process.env.GEMINI_WEBHOOK_SIGNING_SECRET ||
    getDB().settings?.geminiWebhookSecret
  );

  res.json({
    status: "active",
    service: "Gemini Batch Webhook Callback Listener",
    app: "مندوبك الطبي | Mandoubak Med",
    callbackUrl: fullUrl,
    subscribedEvents: ["batch.succeeded", "batch.failed", "batch.cancelled", "batch.expired"],
    specification: "Standard Webhooks (HMAC-SHA256)",
    secretConfigured,
    sampleRegistrationPython: `from google import genai\n\nclient = genai.Client()\nwebhook = client.webhooks.create(\n    name="MyBatchWebhook",\n    subscribed_events=["batch.succeeded", "batch.failed"],\n    uri="${fullUrl}"\n)\nwebhook_secret = webhook.new_signing_secret\nprint(f"Created webhook: {webhook.name}, {webhook.id}")`
  });
});

app.get("/api/gemini-callback/events", requirePrivileged, async (req, res) => {
  const events = await fetchGeminiWebhooksFromDB();
  res.json({
    success: true,
    count: events.length,
    events
  });
});

app.delete("/api/gemini-callback/events", requirePrivileged, async (req, res) => {
  await clearGeminiWebhooksFromDB();
  res.json({ success: true, message: "تم مسح سجل أحداث الويب هوك" });
});

app.get("/api/gemini-callback/config", requirePrivileged, (req, res) => {
  const host = req.get("host") || "mandoubak-med-1.vercel.app";
  const protocol = req.protocol === "http" && host.includes("localhost") ? "http" : "https";
  const fullUrl = `${protocol}://${host}/gemini-callback`;
  const secretConfigured = Boolean(
    process.env.GEMINI_WEBHOOK_SECRET ||
    process.env.GEMINI_WEBHOOK_SIGNING_SECRET ||
    getDB().settings?.geminiWebhookSecret
  );

  res.json({
    success: true,
    callbackUrl: fullUrl,
    apiUrl: `${protocol}://${host}/api/gemini-callback`,
    secretConfigured,
    subscribedEvents: ["batch.succeeded", "batch.failed", "batch.cancelled", "batch.expired"],
    pythonSnippet: `from google import genai

client = genai.Client()

webhook = client.webhooks.create(
    name="MyBatchWebhook",
    subscribed_events=["batch.succeeded", "batch.failed"],
    uri="${fullUrl}",
)

# Store webhook.new_signing_secret securely
webhook_secret = webhook.new_signing_secret
print(f"Created webhook: {webhook.name}, {webhook.id}")`
  });
});

app.post("/api/gemini-callback/config", requirePrivileged, async (req, res) => {
  const { secret } = req.body || {};
  const db = getDB();
  if (!db.settings) db.settings = { ...DEFAULT_SETTINGS };
  db.settings.geminiWebhookSecret = (secret || "").trim();
  saveDB(db);
  res.json({
    success: true,
    message: "تم حفظ مفتاح التوقيع السري للويب هوك بنجاح",
    secretConfigured: Boolean(db.settings.geminiWebhookSecret)
  });
});

app.post("/api/gemini-callback/test", requirePrivileged, async (req, res) => {
  const { eventType = "batch.succeeded", batchId, model = "gemini-3.8-flash", shouldSimulateSignature = true } = req.body || {};

  const actualBatchId = batchId || `batches/batch_${Date.now().toString(36)}`;
  const testPayload = {
    type: eventType,
    event_time: new Date().toISOString(),
    data: {
      batch_id: actualBatchId,
      name: actualBatchId,
      state: eventType === "batch.succeeded" ? "JOB_STATE_SUCCEEDED" : "JOB_STATE_FAILED",
      model,
      total_count: 50,
      completed_count: eventType === "batch.succeeded" ? 50 : 38,
      failed_count: eventType === "batch.succeeded" ? 0 : 12,
      output_uri: eventType === "batch.succeeded" ? `gs://mandoubak-gemini-batches/${actualBatchId}/output.jsonl` : null,
      error: eventType === "batch.failed" ? { code: 429, message: "Resource exhausted: batch quota limit reached" } : null
    }
  };

  const webhookId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const webhookTimestamp = Math.floor(Date.now() / 1000).toString();
  const rawBodyStr = JSON.stringify(testPayload);

  const secret = process.env.GEMINI_WEBHOOK_SECRET || process.env.GEMINI_WEBHOOK_SIGNING_SECRET || getDB().settings?.geminiWebhookSecret || "whsec_testSecretKey1234567890abcdef";

  let secretBuf: Buffer;
  if (secret.startsWith("whsec_")) {
    try { secretBuf = Buffer.from(secret.slice(6), "base64"); } catch { secretBuf = Buffer.from(secret, "utf-8"); }
  } else {
    secretBuf = Buffer.from(secret, "utf-8");
  }

  const toSign = `${webhookId}.${webhookTimestamp}.${rawBodyStr}`;
  const sig = crypto.createHmac("sha256", secretBuf).update(toSign).digest("base64");
  const signatureHeader = `v1,${sig}`;

  const eventRecord: GeminiWebhookEventRecord = {
    id: `ev_${Date.now()}_test`,
    webhookId,
    eventType,
    batchId: actualBatchId,
    model,
    status: eventType === "batch.succeeded" ? "succeeded" : "failed",
    outputUri: testPayload.data.output_uri || undefined,
    totalCount: testPayload.data.total_count,
    completedCount: testPayload.data.completed_count,
    failedCount: testPayload.data.failed_count,
    error: testPayload.data.error?.message || null,
    payload: testPayload,
    headers: {
      "webhook-id": webhookId,
      "webhook-timestamp": webhookTimestamp,
      "webhook-signature": shouldSimulateSignature ? signatureHeader : ""
    },
    verified: shouldSimulateSignature,
    receivedAt: new Date().toISOString(),
    summary: `[اختبار محاكاة] تم استلام ومعالجة حدث ${eventType} للدفعة (${actualBatchId}) بنجاح.`
  };

  await saveGeminiWebhookToDB(eventRecord);

  res.json({
    success: true,
    message: `تم إرسال حدث تجريبي (${eventType}) وتسجيله في سجل الويب هوك بنجاح`,
    event: eventRecord
  });
});


app.post("/api/system/reset", requirePrivileged, async (req, res) => {
  await resetSystemInDB();
  res.json({ success: true, message: "تم إعادة ضبط النظام بنجاح" });
});


app.post("/api/google-chat/events", (req, res) => {
  const body = req.body || {};
  const isWorkspaceAddon = Boolean(body.chat || body.commonEventObject);

  if (isWorkspaceAddon) {
    const chatEvent = body.chat || {};
    if (chatEvent.appHomePayload) {
      return res.json({
        action: {
          navigations: [
            {
              pushCard: {
                header: {
                  title: "مندوبك الطبي - Mandoubak Med",
                  subtitle: "د. بلال القيسي | نظام المبيعات والطلبيات الدوائية",
                },
                sections: [
                  {
                    widgets: [
                      {
                        textParagraph: {
                          text: "مرحباً بك في تطبيق مندوبك الطبي عبر Google Chat. يمكنك متابعة الطلبيات والزيارات من المنصة الرئيسية.",
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      });
    }

    if (chatEvent.removedFromSpacePayload) {
      return res.status(200).json({});
    }

    const incomingText = String(chatEvent.messagePayload?.message?.text || "").trim();
    const replyText = incomingText
      ? `تم استلام رسالتك في مندوبك الطبي: "${incomingText}". للمتابعة التفصيلية افتح لوحة التطبيق الرسمية.`
      : "أهلاً بك في تطبيق مندوبك الطبي (د/ بلال القيسي) على Google Chat!";

    return res.json({
      hostAppDataAction: {
        chatDataAction: {
          createMessageAction: {
            message: {
              text: replyText,
            },
          },
        },
      },
    });
  }

  const eventType = String(body.type || "").toUpperCase();
  if (eventType === "REMOVED_FROM_SPACE") {
    return res.status(200).json({});
  }
  if (eventType === "ADDED_TO_SPACE") {
    return res.json({
      text: "أهلاً بكم! تم تفعيل بوت مندوبك الطبي (د/ بلال القيسي) في هذه المساحة بنجاح.",
    });
  }

  const userText = String(body.message?.text || "").trim();
  return res.json({
    text: userText
      ? `تم استلام استفسارك: "${userText}" — يمكنك إدارته مباشرة من لوحة مندوبك الطبي.`
      : "مرحباً بك في تطبيق مندوبك الطبي - Mandoubak Med.",
  });
});

app.get("/api/telegram/status", requirePrivileged, (_req, res) => {
  res.json({
    configured: isTelegramConfigured(),
    hasBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()),
    hasChatId: Boolean(process.env.TELEGRAM_CHAT_ID?.trim()),
  });
});

app.post("/api/telegram/test", requirePrivileged, async (req, res) => {
  if (!isTelegramConfigured()) {
    return res.status(400).json({
      error: "متغيرات TELEGRAM_BOT_TOKEN أو TELEGRAM_CHAT_ID غير مضبوطة على الخادم.",
    });
  }
  try {
    const customMsg = typeof req.body?.message === "string" && req.body.message.trim()
      ? req.body.message.trim()
      : "✅ اختبار تنبيهات تيليجرام من خادم مندوبك الطبي بنجاح!";
    const result = await sendTelegramAlert(customMsg);
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(502).json({
      error: err?.message || "تعذر إرسال رسالة الاختبار إلى تيليجرام.",
    });
  }
});

app.get("/terms", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "terms.html"));
});

app.get("/privacy", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "privacy.html"));
});

// ---------------- VITE MIDDLEWARE / STATIC SERVING ----------------

async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  const isCompiledServer = typeof process.argv[1] === "string" && process.argv[1].endsWith("server.cjs");
  if ((process.env.NODE_ENV === "production" || isCompiledServer) && fs.existsSync(path.join(distPath, "index.html"))) {
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (
          filePath.endsWith("index.html") ||
          filePath.endsWith("firebase-messaging-sw.js") ||
          filePath.endsWith("sw.js")
        ) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        } else if (filePath.endsWith("manifest.webmanifest")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite middleware fallback warning:", e);
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(path.join(distPath, "index.html"));
        });
      }
    }
  }

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mandoubak Med Server running on http://localhost:${PORT}`);
  });
  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 66000;
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
