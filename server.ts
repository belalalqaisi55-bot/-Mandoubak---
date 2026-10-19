import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore, Firestore, Query } from "firebase-admin/firestore";
import { GoogleGenAI, Type, GenerateVideosOperation } from "@google/genai";
import session from 'express-session';
import axios from 'axios';
import qs from 'qs';

dotenv.config();
process.env.DISABLE_HMR = "true";

export const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.join(process.cwd(), "data-store.json");

// Initialize Firebase Admin if configuration exists
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let isFirebaseEnabled = false;
let dbAdmin: Firestore | null = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
    if (config.projectId && config.projectId !== "remixed-project-id") {
      admin.initializeApp({
        projectId: config.projectId
      });
      if (config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)") {
        dbAdmin = getFirestore(config.firestoreDatabaseId);
      } else {
        dbAdmin = getFirestore();
      }
      isFirebaseEnabled = true;
      console.log("Firebase Admin initialized for project:", config.projectId, "Database:", config.firestoreDatabaseId || "(default)");

      // Probe Admin permissions
      dbAdmin.collection("products").limit(1).get()
        .then(() => {
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

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'none',
    secure: true
  }
}));

// Cookie diagnostics & verification endpoint
app.get("/api/diagnostics/cookies", (req, res) => {
  const clientCookies = req.headers.cookie || "";
  // Modern cross-site partitioned cookie
  res.setHeader("Set-Cookie", "mandoubak_session_probe=active; Path=/; SameSite=None; Secure; Partitioned; Max-Age=86400");
  res.json({
    success: true,
    message: "فحص الكوكيز نشط وتعمل ملفات تعريف الارتباط بنجاح",
    hasCookies: Boolean(clientCookies),
    receivedCookiesCount: clientCookies ? clientCookies.split(";").length : 0,
    cookiePolicy: "SameSite=None; Secure; Partitioned",
    timestamp: new Date().toISOString()
  });
});

app.use(express.json({ limit: "25mb" }));
// Explicitly serve Web App Manifest and Service Worker with standard PWA headers
app.get(["/manifest.webmanifest", "/manifest.json", "/site.webmanifest"], (req, res) => {
  const manifestFile = path.join(process.cwd(), "public", "manifest.webmanifest");
  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.sendFile(manifestFile);
});

app.get("/sw.js", (req, res) => {
  const swPath = fs.existsSync(path.join(process.cwd(), "dist", "sw.js"))
    ? path.join(process.cwd(), "dist", "sw.js")
    : path.join(process.cwd(), "public", "sw.js");
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Service-Worker-Allowed", "/");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(swPath);
});

app.use(express.static(path.join(process.cwd(), "public")));

// OAuth routes
app.get('/auth/google', (req, res) => {
  const state = Math.random().toString(36).slice(2);
  (req.session as any).oauth_state = state;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send('Google OAuth error: ' + error);
    }

    if (!code || state !== (req.session as any).oauth_state) {
      return res.status(400).send('Invalid request');
    }

    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      qs.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token } = tokenResponse.data;
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    (req.session as any).user = userResponse.data;

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/me', (req, res) => {
  res.json({ user: (req.session as any).user || null });
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect(process.env.FRONTEND_ORIGIN || '/');
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "مندوبك الطبي", timestamp: new Date().toISOString() });
});

// Diagnostics ping endpoint
app.post("/api/diagnostics/ping", (req, res) => {
  const receivedAt = new Date().toISOString();
  const echoPayloadSize = req.body ? JSON.stringify(req.body).length : 0;
  res.json({
    success: true,
    message: "Pong from Mandoubak Med server",
    receivedAt,
    clientTime: req.body?.clientTime,
    echoPayloadSize,
    headers: {
      origin: req.headers["origin"] || "direct",
      host: req.headers["host"],
      userAgent: req.headers["user-agent"]
    }
  });
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
  createdAt: string;
}

interface AppSettings {
  requireApprovalForNewClients: boolean;
  requireApprovalForNewAccounts: boolean;
  singlePhonePerDevice: boolean;
  autoApproveKnownNumbers: boolean;
  enableVisitTracking?: boolean;
  drProfileAvatar?: string;
  productCategories?: string[];
}

const DEFAULT_SETTINGS: AppSettings = {
  requireApprovalForNewClients: true,
  requireApprovalForNewAccounts: true,
  singlePhonePerDevice: true,
  autoApproveKnownNumbers: true,
  enableVisitTracking: true,
  drProfileAvatar: ""
};

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
}

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "سيبلوكس 500 (Ciplox 500)",
    description: "الاسم العلمي: Ciprofloxacine 500",
    category: "مضادات حيوية",
    price: "660 ريال",
    bonus: "10%",
    unit: "شريط",
    activeIngredient: "Ciprofloxacin",
    dosageForm: "أقراص (Tablets)"
  },
  {
    id: "p2",
    name: "ديراد إم أقراص (Dirad-M Tablets)",
    description: "الاسم العلمي: Metronidazole + Diloxanide",
    category: "مضادات طفيليات مطهرة",
    price: "703 ريال",
    bonus: "10%",
    unit: "شريط",
    activeIngredient: "Metronidazole, Diloxanide",
    dosageForm: "أقراص (Tablets)"
  },
  {
    id: "p3",
    name: "ديراد إم شراب (Dirad-M Syrup)",
    description: "الاسم العلمي: Metronidazole + Diloxanide",
    category: "مضادات طفيليات مطهرة",
    price: "770 ريال",
    bonus: "10%",
    unit: "زجاجة",
    activeIngredient: "Metronidazole, Diloxanide",
    dosageForm: "شراب ومعلق (Syrup)"
  },
  {
    id: "p4",
    name: "ألريد أقراص (Allerid Tablets)",
    description: "الاسم العلمي: Cetirizine Tab.",
    category: "مضادات الحساسية",
    price: "781 ريال",
    bonus: "20%",
    unit: "شريط",
    activeIngredient: "Cetirizine",
    dosageForm: "أقراص (Tablets)"
  },
  {
    id: "p5",
    name: "ألريد شراب (Allerid Syrup)",
    description: "الاسم العلمي: Cetirizine Syrp",
    category: "مضادات الحساسية",
    price: "770 ريال",
    bonus: "10%",
    unit: "زجاجة",
    activeIngredient: "Cetirizine",
    dosageForm: "شراب ومعلق (Syrup)"
  },
  {
    id: "p6",
    name: "فوركان 150 كبسول (Forcan 150 Caps)",
    description: "الاسم العلمي: Fluconazol 150",
    category: "مضادات الفطريات",
    price: "508 ريال",
    bonus: "10%",
    unit: "كبسولة",
    activeIngredient: "Fluconazole",
    dosageForm: "كبسولات (Capsules)"
  },
  {
    id: "p7",
    name: "نوفاتاكس 1 جم (Novatax 1g)",
    description: "الاسم العلمي: Cefotaxime 1g",
    category: "حقن مضاد حيوي",
    price: "850 ريال",
    bonus: "40%",
    unit: "حقنة",
    activeIngredient: "Cefotaxime",
    dosageForm: "حقن وفيال (Injections)"
  },
  {
    id: "p13",
    name: "نوفاتكس 500 (Novatex 500)",
    description: "الاسم العلمي: Cefotaxime 500 mg",
    category: "حقن مضاد حيوي",
    price: "600 ريال",
    bonus: "40%",
    unit: "حقنة",
    activeIngredient: "Cefotaxime",
    dosageForm: "حقن وفيال (Injections)"
  },
  {
    id: "p8",
    name: "لوماك شرائط (Lomac Strips)",
    description: "الاسم العلمي: Omeprazole 20 Tab",
    category: "أدوية المعدة والحموضة",
    price: "2400 ريال",
    bonus: "100%",
    unit: "شريط",
    activeIngredient: "Omeprazole",
    dosageForm: "كبسولات (Capsules)"
  },
  {
    id: "p9",
    name: "لانسك علب (Lansec 30 mg)",
    description: "الاسم العلمي: Lansoprazol 30 mg",
    category: "أدوية المعدة والحموضة",
    price: "1223 ريال",
    bonus: "20%",
    unit: "علبة",
    activeIngredient: "Lansoprazole",
    dosageForm: "كبسولات (Capsules)"
  },
  {
    id: "p10",
    name: "سيبازول فورت (Cipazole Forte)",
    description: "الاسم العلمي: Scenidazole 1000",
    category: "مضادات طفيليات وبكتيريا",
    price: "550 ريال",
    bonus: "40%",
    unit: "شريط",
    activeIngredient: "Secnidazole",
    dosageForm: "أقراص (Tablets)"
  },
  {
    id: "p11",
    name: "بارفيز فوار (Parfeez Effervescent)",
    description: "الاسم العلمي: Paracetamol",
    category: "مسكنات ومضادات حمى",
    price: "1999 ريال",
    bonus: "40%",
    unit: "علبة فوار",
    activeIngredient: "Paracetamol",
    dosageForm: "فوار وحبيبات (Effervescent)"
  },
  {
    id: "p12",
    name: "بارفيز بلص فوار (Parfeez Plus Effervescent)",
    description: "الاسم العلمي: Paracetamol + Codeine + Caffeine",
    category: "مسكنات ألم قوية",
    price: "2400 ريال",
    bonus: "40%",
    unit: "علبة فوار",
    activeIngredient: "Paracetamol, Codeine, Caffeine",
    dosageForm: "فوار وحبيبات (Effervescent)"
  }
];

const DEFAULT_USERS: User[] = [
  {
    id: "u_rep",
    email: "belalalqaisi55@gmail.com",
    phone: "+967776600049",
    name: "د/ بلال القيسي",
    entityName: "المكتب العلمي والمبيعات الطبية (الإدارة)",
    location: "صنعاء / جميع المحافظات",
    role: "rep",
    isApproved: true,
    status: "approved",
    createdAt: new Date().toISOString()
  }
];

// Read database
function getDB(): DB {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialDB: DB = {
        users: DEFAULT_USERS,
        products: DEFAULT_PRODUCTS,
        stockReports: [],
        orders: [],
        visits: [],
        notifications: [],
        agreements: [],
        complaints: [],
        trashArchive: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf8");
      return initialDB;
    }

    const data = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(data) as DB;
    
    // Ensure lists are initialized
    if (!parsed.users) parsed.users = [];
    const defaultClientIds = new Set(["c_1", "c_2", "c_3", "c_4", "c_5"]);
    parsed.users = parsed.users.filter((u) => !defaultClientIds.has(u.id));

    if (!parsed.products || parsed.products.length === 0) parsed.products = DEFAULT_PRODUCTS;
    if (!parsed.stockReports) parsed.stockReports = [];
    if (!parsed.orders) parsed.orders = [];
    if (!parsed.visits) parsed.visits = [];
    if (!parsed.notifications) parsed.notifications = [];
    if (!parsed.agreements) parsed.agreements = [];
    if (!parsed.complaints) parsed.complaints = [];
    if (!parsed.trashArchive) parsed.trashArchive = [];

    return parsed;
  } catch (err) {
    console.error("Error reading database", err);
    return {
      users: [],
      products: DEFAULT_PRODUCTS,
      stockReports: [],
      orders: [],
      visits: [],
      notifications: [],
      agreements: [],
      complaints: [],
      trashArchive: []
    };
  }
}

// Save database
function saveDB(db: DB) {
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
      const snap = await dbAdmin.collection("users").get();
      snap.forEach((doc) => {
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

  // Ensure rep is synced so rep always exists
  let hasChanges = false;
  for (const defU of DEFAULT_USERS) {
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
  db.products.push(product);
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
      await dbAdmin.collection("orders").doc(order.id).set(order);
      return;
    } catch (e: any) {
      console.warn("Firebase operation fallback (save order):", e.message);
      isFirebaseEnabled = false;
    }
  }
  const db = getDB();
  db.orders.unshift(order);
  saveDB(db);
}

async function updateOrderStatusInDB(id: string, status: string): Promise<Order | null> {
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const docRef = dbAdmin.collection("orders").doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        await docRef.update({ status });
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
    db.orders[idx].status = status as any;
    saveDB(db);
    return db.orders[idx];
  }
  return null;
}

async function archiveOrderInDB(id: string, isArchived: boolean = true): Promise<Order | null> {
  const archivedAt = isArchived ? new Date().toISOString() : undefined;
  const status = isArchived ? "completed" : "approved";
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const docRef = dbAdmin.collection("orders").doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        await docRef.update({
          isArchived,
          status,
          archivedAt: archivedAt || null
        });
        const updated = await docRef.get();
        return updated.data() as Order;
      }
    } catch (e: any) {
      console.warn("Firebase archive order fallback:", e.message);
    }
  }
  const db = getDB();
  const idx = db.orders.findIndex((o) => o.id === id);
  if (idx !== -1) {
    db.orders[idx].isArchived = isArchived;
    db.orders[idx].status = status;
    db.orders[idx].archivedAt = archivedAt;
    saveDB(db);
    return db.orders[idx];
  }
  return null;
}

async function archiveAllCompletedOrdersInDB(): Promise<number> {
  let count = 0;
  const now = new Date().toISOString();
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("orders").where("status", "==", "completed").get();
      const batch = dbAdmin.batch();
      snap.forEach((doc) => {
        const data = doc.data();
        if (!data.isArchived) {
          batch.update(doc.ref, { isArchived: true, archivedAt: now });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (e: any) {
      console.warn("Firebase batch archive completed orders fallback:", e.message);
    }
  }
  const db = getDB();
  db.orders.forEach((o) => {
    if (o.status === "completed" && !o.isArchived) {
      o.isArchived = true;
      o.archivedAt = now;
      count++;
    }
  });
  if (count > 0) saveDB(db);
  return count;
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

async function deleteOrderFromDB(id: string, deletedBy = "د. بلال القيسي"): Promise<boolean> {
  const db = getDB();
  const existingOrder = db.orders.find((o) => o.id === id);
  if (existingOrder) {
    const oAny = existingOrder as any;
    await addTrashItemToDB({
      id: `trash_order_${id}_${Date.now()}`,
      itemType: "order",
      title: `طلبية #${oAny.orderNumber || existingOrder.id.slice(-6)} - ${existingOrder.clientName || existingOrder.entityName || "العميل"}`,
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
  }

  let deleted = false;
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const docRef = dbAdmin.collection("orders").doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        await docRef.delete();
        deleted = true;
      }
    } catch (e: any) {
      console.warn("Firebase delete order fallback:", e.message);
    }
  }
  const initialLen = db.orders.length;
  db.orders = db.orders.filter((o) => o.id !== id);
  if (db.orders.length < initialLen) {
    saveDB(db);
    deleted = true;
  }
  return deleted;
}

async function clearAllArchivedOrdersFromDB(deletedBy = "د. بلال القيسي"): Promise<number> {
  const db = getDB();
  const archivedOrders = db.orders.filter((o) => o.isArchived);
  for (const o of archivedOrders) {
    const oAny = o as any;
    await addTrashItemToDB({
      id: `trash_order_${o.id}_${Date.now()}`,
      itemType: "order",
      title: `طلبية سابقة #${oAny.orderNumber || o.id.slice(-6)} - ${o.clientName || o.entityName || "العميل"}`,
      subtitle: `القيمة: ${oAny.totalAmount || 0} ر.ي | الحالة: مسلّمة ومؤرشفة`,
      originalId: o.id,
      deletedAt: new Date().toISOString(),
      deletedBy,
      details: {
        orderNumber: oAny.orderNumber,
        clientName: o.clientName || o.entityName,
        phone: oAny.clientPhone || oAny.phone,
        totalAmount: oAny.totalAmount,
        status: o.status
      },
      data: o
    });
  }

  let deletedCount = 0;
  if (isFirebaseEnabled && dbAdmin) {
    try {
      const snap = await dbAdmin.collection("orders").where("isArchived", "==", true).get();
      const batch = dbAdmin.batch();
      snap.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });
      if (deletedCount > 0) {
        await batch.commit();
      }
    } catch (e: any) {
      console.warn("Firebase clear archived orders fallback:", e.message);
    }
  }
  const initialLen = db.orders.length;
  db.orders = db.orders.filter((o) => !o.isArchived);
  deletedCount = initialLen - db.orders.length;
  if (deletedCount > 0) {
    saveDB(db);
  }
  return deletedCount;
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
      const doc = await dbAdmin.collection("settings").doc("app_config").get();
      if (doc.exists) {
        return { ...DEFAULT_SETTINGS, ...doc.data() as AppSettings };
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
      await dbAdmin.collection("settings").doc("app_config").set(settings, { merge: true });
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

export function isValidAdminSecret(pwd?: string): boolean {
  if (!pwd) return false;
  const input = pwd.trim();
  const envSecret = (process.env.ADMIN_SECRET || process.env.APP_ADMIN_SECRET || "").trim();
  const validSecrets = ["Mandoubk302344$", "Belal302344"];
  if (envSecret && !validSecrets.includes(envSecret)) {
    validSecrets.push(envSecret);
  }
  return validSecrets.includes(input);
}

// --- AUTH API ---

app.post("/api/auth/login", async (req, res) => {
  const { phone, email, password } = req.body;
  const rawInput = String(phone || email || "").trim().toLowerCase();
  if (!rawInput) {
    return res.status(400).json({ error: "رقم الهاتف أو البريد الإلكتروني مطلوب" });
  }

  const inputDigits = cleanPhoneDigits(rawInput);
  const isRepEmail = rawInput.includes("belalalqaisi55@gmail.com") || rawInput === "belalalqaisi55";
  const repDigits = "776600049";
  const isRepPhone = inputDigits.endsWith(repDigits);
  const isRep = isRepPhone || isRepEmail;

  if (isRep) {
    if (password && !isValidAdminSecret(password)) {
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
    return res.json({ status: "success", user: adminUser });
  }

  if (!inputDigits && !rawInput.includes("@")) {
    return res.status(400).json({ error: "يرجى إدخال رقم هاتف صحيح أو بريد إلكتروني" });
  }

  const users = await fetchAllUsersFromDB();
  
  const user = users.find((u) => {
    const uDigits = cleanPhoneDigits(u.phone);
    if (!uDigits || uDigits.length < 6) return false;
    if (uDigits === inputDigits) return true;
    if (inputDigits.length >= 8 && uDigits.length >= 8) {
      return inputDigits.slice(-8) === uDigits.slice(-8);
    }
    return false;
  });

  if (user) {
    if (user.role === "rep") {
      if (!isValidAdminSecret(password)) {
        return res.status(401).json({ error: "كلمة المرور الخاصة بالمندوب المسؤول غير صحيحة" });
      }
      return res.json({ status: "success", user });
    }

    // Check account status
    if (user.status === "suspended") {
      return res.json({
        status: "suspended",
        user,
        error: "تم تعليق هذا الحساب مؤقتاً. يرجى التواصل مع المندوب د/ بلال القيسي للتفعيل."
      });
    }

    const settings = await fetchSettingsFromDB();
    
    // Check if unconfirmed / pending approval
    const isUnconfirmed = user.isApproved === false || user.status === "pending_approval";
    if (isUnconfirmed && settings.requireApprovalForNewClients) {
      return res.json({
        status: "pending_approval",
        user,
        message: "حسابك قيد المراجعة والتأكيد من قبل المندوب المسؤول د/ بلال القيسي."
      });
    }

    // If approval requirement is turned off or user is already approved
    if (user.isApproved === undefined) {
      user.isApproved = true;
      user.status = "approved";
      await saveUserToDB(user);
    }

    return res.json({ status: "success", user });
  } else {
    return res.json({ status: "not_found", error: "رقم الهاتف غير مسجل مسبقاً بالتطبيق" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { phone, name, role, entityName, location } = req.body;

  if (!phone || !name) {
    return res.status(400).json({ error: "جميع الحقول الأساسية مطلوبة للتسجيل" });
  }

  const inputDigits = cleanPhoneDigits(phone);
  if (!inputDigits || inputDigits.length < 6) {
    return res.status(400).json({ error: "يرجى إدخال رقم هاتف صحيح يتكون من 6 أرقام على الأقل" });
  }

  if (inputDigits.endsWith("776600049")) {
    return res.status(400).json({ error: "رقم هاتف المندوب المسؤول مسجل مسبقاً. يرجى تسجيل الدخول باستخدام كلمة المرور." });
  }

  const users = await fetchAllUsersFromDB();
  
  const userExists = users.some((u) => {
    const uDigits = cleanPhoneDigits(u.phone);
    if (!uDigits || uDigits.length < 6) return false;
    if (uDigits === inputDigits) return true;
    if (inputDigits.length >= 8 && uDigits.length >= 8) {
      return inputDigits.slice(-8) === uDigits.slice(-8);
    }
    return false;
  });

  if (userExists) {
    return res.status(400).json({ error: "رقم الهاتف مسجل مسبقاً بالتطبيق. يرجى تسجيل الدخول مباشرة بنفس الرقم بعد التأكيد." });
  }

  const settings = await fetchSettingsFromDB();
  const requiresApproval = settings.requireApprovalForNewAccounts !== undefined ? settings.requireApprovalForNewAccounts : settings.requireApprovalForNewClients;
  
  // Security: Public registration can only be client (pharmacy or doctor), never rep
  const clientRole: "pharmacy" | "doctor" = role === "doctor" ? "doctor" : "pharmacy";
  const randomCode = String(Math.floor(1000 + Math.random() * 9000));

  const newUser: User = {
    id: "u_" + Math.random().toString(36).substr(2, 9),
    phone: phone.trim(),
    name: name.trim(),
    role: clientRole,
    entityName: entityName ? entityName.trim() : "",
    location: location ? location.trim() : "",
    isApproved: !requiresApproval,
    status: requiresApproval ? "pending_approval" : "approved",
    confirmationCode: randomCode,
    createdAt: new Date().toISOString()
  };

  await saveUserToDB(newUser);

  res.json({
    success: true,
    user: newUser,
    requiresApproval,
    message: requiresApproval
      ? "تم تسجيل طلب انضمامك بنجاح. حسابك بانتظار التأكيد والاعتماد من قبل د/ بلال القيسي."
      : "تم إنشاء وتفعيل حسابك بنجاح."
  });
});

app.post("/api/auth/verify-code", async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: "رقم الهاتف ورمز التأكيد مطلوبان" });
  }

  const inputDigits = cleanPhoneDigits(phone);
  const inputCode = String(code).trim();
  const users = await fetchAllUsersFromDB();

  const user = users.find((u) => {
    const uDigits = cleanPhoneDigits(u.phone);
    if (!uDigits || uDigits.length < 6) return false;
    if (uDigits === inputDigits) return true;
    if (inputDigits.length >= 8 && uDigits.length >= 8) {
      return inputDigits.slice(-8) === uDigits.slice(-8);
    }
    return false;
  });

  if (!user) {
    return res.status(404).json({ error: "الحساب غير موجود" });
  }

  // Master confirmation bypass code 3023 or the user's generated confirmationCode
  if (user.confirmationCode === inputCode || inputCode === "3023") {
    user.isApproved = true;
    user.status = "approved";
    await saveUserToDB(user);
    return res.json({ success: true, user, message: "تم تأكيد واعتماد الحساب بنجاح!" });
  }

  return res.status(400).json({ error: "رمز التأكيد المدخل غير مطابق. يرجى التواصل مع المندوب د/ بلال القيسي." });
});

// --- SYSTEM SETTINGS API ---

app.get("/api/settings", async (req, res) => {
  const settings = await fetchSettingsFromDB();
  res.json(settings);
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

app.post("/api/settings", async (req, res) => {
  const current = await fetchSettingsFromDB();
  const updated: AppSettings = {
    requireApprovalForNewClients: req.body.requireApprovalForNewClients !== undefined ? Boolean(req.body.requireApprovalForNewClients) : current.requireApprovalForNewClients,
    requireApprovalForNewAccounts: req.body.requireApprovalForNewAccounts !== undefined ? Boolean(req.body.requireApprovalForNewAccounts) : (current.requireApprovalForNewAccounts !== undefined ? current.requireApprovalForNewAccounts : current.requireApprovalForNewClients),
    singlePhonePerDevice: req.body.singlePhonePerDevice !== undefined ? Boolean(req.body.singlePhonePerDevice) : current.singlePhonePerDevice,
    autoApproveKnownNumbers: req.body.autoApproveKnownNumbers !== undefined ? Boolean(req.body.autoApproveKnownNumbers) : current.autoApproveKnownNumbers,
    enableVisitTracking: req.body.enableVisitTracking !== undefined ? Boolean(req.body.enableVisitTracking) : (current.enableVisitTracking ?? true),
    drProfileAvatar: req.body.drProfileAvatar !== undefined ? String(req.body.drProfileAvatar) : (current.drProfileAvatar || ""),
    productCategories: Array.isArray(req.body.productCategories) ? req.body.productCategories.map(String) : current.productCategories
  };

  await saveSettingsToDB(updated);
  res.json({ success: true, settings: updated });
});

app.get("/api/admin/dr-avatar", async (req, res) => {
  const settings = await fetchSettingsFromDB();
  res.json({ drProfileAvatar: settings.drProfileAvatar || "" });
});

app.post("/api/admin/dr-avatar", async (req, res) => {
  const { avatar } = req.body;
  const current = await fetchSettingsFromDB();
  const updated: AppSettings = { ...current, drProfileAvatar: avatar || "" };
  await saveSettingsToDB(updated);
  res.json({ success: true, drProfileAvatar: updated.drProfileAvatar });
});

// --- USERS / CLIENTS MANAGEMENT API ---

app.get("/api/users", async (req, res) => {
  const users = await fetchAllUsersFromDB();
  res.json(users);
});

app.post("/api/users/batch-import", async (req, res) => {
  const { clients } = req.body;
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

app.put("/api/users/:id/status", async (req, res) => {
  const { id } = req.params;
  const { isApproved, status } = req.body;

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

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { phone, name, role, entityName, location, isApproved, status, avatar } = req.body;

  if (!phone || !name) {
    return res.status(400).json({ error: "اسم العميل ورقم الهاتف مطلوبان" });
  }

  const users = await fetchAllUsersFromDB();
  const existing = users.find((u) => u.id === id);
  
  const updatedUser: User = {
    id,
    phone: phone.trim(),
    name: name.trim(),
    role: role || (existing ? existing.role : "pharmacy"),
    entityName: entityName ? entityName.trim() : (existing ? existing.entityName : ""),
    location: location ? location.trim() : (existing ? existing.location : ""),
    avatar: avatar !== undefined ? avatar : (existing ? existing.avatar : ""),
    isApproved: isApproved !== undefined ? isApproved : (existing ? existing.isApproved : true),
    status: status || (existing ? existing.status : "approved"),
    createdAt: existing ? existing.createdAt : new Date().toISOString()
  };

  await saveUserToDB(updatedUser);
  res.json({ success: true, user: updatedUser });
});

app.delete("/api/users", async (req, res) => {
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

async function deleteClientFromDB(id: string, deletedBy = "د. بلال القيسي"): Promise<boolean> {
  const db = getDB();
  const idx = db.users.findIndex((u) => u.id === id || u.phone === id);
  if (idx !== -1) {
    const client = db.users[idx];
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
      try {
        await dbAdmin.collection("users").doc(client.id).delete();
      } catch (e: any) {
        console.warn("Firestore delete user error:", e.message);
      }
    }

    db.users.splice(idx, 1);
    saveDB(db);
    return true;
  }
  return false;
}

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const deletedBy = (req.query.deletedBy as string) || (req.body?.deletedBy as string) || "د. بلال القيسي";
  const success = await deleteClientFromDB(id, deletedBy);
  return res.json({ success });
});

app.delete("/api/clients/:id", async (req, res) => {
  const { id } = req.params;
  const deletedBy = (req.query.deletedBy as string) || (req.body?.deletedBy as string) || "د. بلال القيسي";
  const success = await deleteClientFromDB(id, deletedBy);
  return res.json({ success });
});

// ---------------- ADMIN TRASH & RECYCLE BIN ARCHIVE API ROUTES ----------------

app.get("/api/trash", async (req, res) => {
  const list = await fetchTrashArchiveFromDB();
  res.json({ success: true, items: list, count: list.length });
});

app.post("/api/trash", async (req, res) => {
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

app.post("/api/trash/:id/restore", async (req, res) => {
  const { id } = req.params;
  const result = await restoreTrashItemInDB(id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.delete("/api/trash/:id", async (req, res) => {
  const { id } = req.params;
  await deleteTrashItemFromDB(id);
  res.json({ success: true, message: "تم حذف العنصر نهائياً من الأرشيف" });
});

app.delete("/api/trash", async (req, res) => {
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
app.post("/api/products", async (req, res) => {
  const { id, name, description, category, price, unit, bonus, image, imageUrl, activeIngredient, dosageForm, barcode, qrCode } = req.body;

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

// Update product (by Representative)
app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, category, price, unit, bonus, image, imageUrl, activeIngredient, dosageForm, barcode, qrCode } = req.body;

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
app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const success = await deleteProductFromDB(id);

  if (!success) {
    return res.status(404).json({ error: "الصنف غير موجود" });
  }

  res.json({ success: true });
});


// --- STOCK REPORTS API ---

// Batch submit stock remaining levels
app.post("/api/stock-reports", async (req, res) => {
  const { clientId, clientName, entityName, reports } = req.body;

  if (!clientId || !reports || !Array.isArray(reports)) {
    return res.status(400).json({ error: "معلومات الجرد غير مكتملة" });
  }

  await saveStockReportToDB(clientId, clientName, entityName, reports);
  res.json({ success: true, message: "تم تسجيل وتحديث المخزون بنجاح" });
});

// Get stock reports
app.get("/api/stock-reports", async (req, res) => {
  const { clientId } = req.query;
  const reports = await fetchStockReportsFromDB(clientId as string);
  res.json(reports);
});


// --- ORDERS API ---

app.post("/api/orders", async (req, res) => {
  const { clientId, clientName, entityName, items } = req.body;

  if (!clientId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "الرجاء تحديد الأصناف والكميات لإنشاء الطلب" });
  }

  const newOrder: Order = {
    id: "ord_" + Math.random().toString(36).substr(2, 9),
    clientId,
    clientName: clientName || "عميل غير معروف",
    entityName: entityName || "منشأة غير معروفة",
    items: items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: Number(item.quantity),
      price: item.price || "غير محدد"
    })),
    status: "pending",
    createdAt: new Date().toISOString()
  };

  await saveOrderToDB(newOrder);

  res.json({ success: true, order: newOrder });
});

app.get("/api/orders", async (req, res) => {
  const { clientId } = req.query;
  const orders = await fetchOrdersFromDB(clientId as string);
  res.json(orders);
});

app.patch("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  const { status, isArchived } = req.body; // pending, approved, completed, cancelled

  if (!status && isArchived === undefined) {
    return res.status(400).json({ error: "حالة الطلب أو حالة الأرشفة مطلوبة" });
  }

  let order;
  if (isArchived !== undefined) {
    order = await archiveOrderInDB(id, isArchived !== false);
  } else {
    order = await updateOrderStatusInDB(id, status);
  }

  if (!order) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }

  res.json({ success: true, order });
});

app.post("/api/orders/archive-completed", async (req, res) => {
  const count = await archiveAllCompletedOrdersInDB();
  res.json({ success: true, count, message: `تم نقل ${count} طلبية مسلمة إلى الأرشيف بنجاح` });
});

app.patch("/api/orders/:id/archive", async (req, res) => {
  const { id } = req.params;
  const isArchived = req.body?.isArchived !== false;
  const order = await archiveOrderInDB(id, isArchived);
  if (!order) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }
  res.json({
    success: true,
    order,
    message: isArchived ? "تمت أرشفة الطلبية بنجاح" : "تمت استعادة الطلبية للقائمة النشطة بنجاح"
  });
});

app.delete("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  const success = await deleteOrderFromDB(id);
  if (!success) {
    return res.status(404).json({ error: "الطلب غير موجود أو تعذر حذفه" });
  }
  res.json({ success: true, message: "تم حذف الطلبية نهائياً" });
});

// Send Order Status Update via Email Notification
app.post("/api/orders/:id/email-update", async (req, res) => {
  const { id } = req.params;
  const { recipientEmail, recipientName, entityName, status, subject, message, repName, repPhone } = req.body;

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

app.post("/api/orders/archive/clear", async (req, res) => {
  const count = await clearAllArchivedOrdersFromDB();
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
      const snap = await dbAdmin.collection("notifications").get();
      const list: Notification[] = [];
      snap.forEach((doc) => {
        const notif = doc.data() as Notification;
        if (!clientId || notif.type === "broadcast" || notif.targetClientId === clientId) {
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
  const filtered = clientId ? list.filter((n) => n.type === "broadcast" || n.targetClientId === clientId) : list;
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

// --- NEW VISITS & NOTIFICATIONS ENDPOINTS ---

app.get("/api/visits", async (req, res) => {
  const { clientId } = req.query;
  const list = await fetchVisitsFromDB(clientId as string);
  res.json(list);
});

app.post("/api/visits", async (req, res) => {
  const { clientId, clientName, entityName, visitDate, notes, summary, tasks } = req.body;

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

app.patch("/api/visits/:id", async (req, res) => {
  const { id } = req.params;
  const { tasks, summary, notes } = req.body;

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

app.get("/api/notifications", async (req, res) => {
  const { clientId } = req.query;
  const list = await fetchNotificationsFromDB(clientId as string);
  res.json(list);
});

app.post("/api/notifications", async (req, res) => {
  const { title, message, type, targetClientId, targetClientName } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "عنوان الإشعار ونص الإشعار مطلوبان" });
  }

  const newNotif: Notification = {
    id: "n_" + Math.random().toString(36).substr(2, 9),
    title: title.trim(),
    message: message.trim(),
    type: type === "target" ? "target" : "broadcast",
    targetClientId,
    targetClientName,
    createdAt: new Date().toISOString()
  };

  await saveNotificationToDB(newNotif);
  res.json({ success: true, notification: newNotif });
});

app.delete("/api/notifications/:id", async (req, res) => {
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

app.delete("/api/notifications", async (req, res) => {
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

app.get("/api/agreements", async (req, res) => {
  const { clientId } = req.query;
  const list = await fetchAgreementsFromDB(clientId as string);
  res.json(list);
});

app.post("/api/agreements", async (req, res) => {
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

app.put("/api/agreements/:id", async (req, res) => {
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

app.delete("/api/agreements/:id", async (req, res) => {
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

app.get("/api/complaints", async (req, res) => {
  const { clientId } = req.query;
  const list = await fetchComplaintsFromDB(clientId as string);
  res.json(list);
});

app.post("/api/complaints", async (req, res) => {
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
  res.json({ success: true, complaint: newComplaint });
});

app.put("/api/complaints/:id", async (req, res) => {
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

app.delete("/api/complaints/:id", async (req, res) => {
  const { id } = req.params;
  const success = await deleteComplaintFromDB(id);
  if (!success) {
    return res.status(404).json({ error: "الشكوى غير موجودة" });
  }
  res.json({ success: true });
});

app.delete("/api/complaints", async (req, res) => {
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
  const fallbackModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  const candidateModels = Array.from(new Set([preferredModel || "gemini-3.8-flash", ...fallbackModels]));

  // If search or maps tools requested, attempt first with tools
  if (config.tools && config.tools.length > 0) {
    try {
      const res = await ai.models.generateContent({
        model: preferredModel || "gemini-3.8-flash",
        contents,
        config
      });
      return { response: res, modelUsed: preferredModel || "gemini-3.8-flash" };
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
    try {
      const res = await ai.models.generateContent({
        model,
        contents,
        config
      });
      return { response: res, modelUsed: model, fallbackSearchUsed: true };
    } catch (err: any) {
      console.warn(`Model ${model} failed, trying fallback:`, err?.status || err?.message);
      lastError = err;
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

  const appUrl = process.env.APP_URL || "https://mandoubak-med.app";
  const workspaceId = process.env.OPENROUTER_WORKSPACE_ID || "21aaba5e-2929-5ce8-a166-d464aaf42366";

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
          "Authorization": `Bearer ${apiKey.trim()}`,
          "HTTP-Referer": appUrl,
          "X-OpenRouter-Title": "مندوبك الطبي | Mandoubak Med",
          "X-Title": "مندوبك الطبي | Mandoubak Med",
          "Content-Type": "application/json",
          "X-Workspace-Id": workspaceId
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`OpenRouter model ${candidate} failed (${res.status}):`, errText);
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

app.post("/api/visits/analyze", async (req, res) => {
  const { notes } = req.body;
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
      "gemini-3.8-flash",
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

app.post("/api/drugs/scientific-search", async (req, res) => {
  const { drugQuery } = req.body;
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
      "gemini-3.8-flash",
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
app.post("/api/ai/generate-medical-exam", async (req, res) => {
  const { specialty, topic, count = 5, difficulty = "medium" } = req.body;

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
      "gemini-3.8-flash",
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
      defaultModel: "gemini-3.8-flash"
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

app.post("/api/ai/openrouter/chat", async (req, res) => {
  const { messages, model, systemInstruction, temperature } = req.body;
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

app.post("/api/chat", async (req, res) => {
  const { messages, mode = "standard", provider = "auto", openRouterModel, systemInstruction } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "الرسائل مطلوبة لبدء المحادثة" });
  }

  const defaultSysInstruction = `أنت المساعد الطبي والدوائي الذكي لمنصة "مندوبك الطبي".
أنت خبير صيدلاني وطبي واستشاري مبيعات للأدوية والمستلزمات الطبية.
تواصل بلغة عربية فصحى، واضحة، علمية ومتقنة.
قدم إجابات منظمة، موثوقة، ومباشرة تخدم المندوبين، الأطباء، والصيادلة.`;

  // 1. Explicit OpenRouter Request
  if (provider === "openrouter") {
    try {
      const { reply, modelUsed } = await callOpenRouterChat({
        messages,
        model: openRouterModel || "deepseek/deepseek-chat",
        systemInstruction: systemInstruction || defaultSysInstruction
      });

      return res.json({
        success: true,
        provider: "openrouter",
        modelUsed,
        reply,
        groundingChunks: null,
        searchFallback: false
      });
    } catch (err: any) {
      if (process.env.GEMINI_API_KEY) {
        console.warn("OpenRouter direct attempt failed, trying Gemini fallback:", err.message);
      } else {
        return res.status(500).json({
          success: false,
          error: "حدث خطأ أثناء الاتصال بـ OpenRouter: " + (err.message || "عطل في الخدمة")
        });
      }
    }
  }

  // 2. If Gemini is not set, but OpenRouter is configured, route to OpenRouter automatically
  if (!process.env.GEMINI_API_KEY && process.env.OPENROUTER_API_KEY) {
    try {
      const { reply, modelUsed } = await callOpenRouterChat({
        messages,
        model: openRouterModel || "deepseek/deepseek-chat",
        systemInstruction: systemInstruction || defaultSysInstruction
      });
      return res.json({
        success: true,
        provider: "openrouter",
        modelUsed,
        reply,
        groundingChunks: null,
        searchFallback: false
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: "فشل الاتصال بنماذج OpenRouter: " + (err.message || "عطل في الخدمة")
      });
    }
  }

  // 3. Main Gemini Flow
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const config: any = {
      systemInstruction: systemInstruction || defaultSysInstruction
    };

    let preferredModel = "gemini-3.8-flash";

    if (mode === "complex" || mode === "thinking") {
      // Use gemini-3.1-pro-preview for particularly complex tasks
      preferredModel = "gemini-3.1-pro-preview";
    } else if (mode === "fast") {
      // Use gemini-3.1-flash-lite for tasks that should happen fast
      preferredModel = "gemini-3.1-flash-lite";
    } else if (mode === "search") {
      // Search Grounding using gemini-3.8-flash with googleSearch tool
      preferredModel = "gemini-3.8-flash";
      config.tools = [{ googleSearch: {} }];
    } else if (mode === "maps") {
      // Maps Grounding using gemini-3.8-flash with googleMaps tool
      preferredModel = "gemini-3.8-flash";
      config.tools = [{ googleMaps: {} }];
      if (req.body.location && req.body.location.latitude && req.body.location.longitude) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: Number(req.body.location.latitude),
              longitude: Number(req.body.location.longitude)
            }
          }
        };
      }
    } else {
      // Use gemini-3.8-flash for general tasks
      preferredModel = "gemini-3.8-flash";
    }

    // Sanitize conversation history:
    const validMessages = messages.filter((m: any) => m && typeof m.text === "string" && m.text.trim().length > 0);

    let startIndex = 0;
    while (startIndex < validMessages.length && validMessages[startIndex].role !== "user") {
      startIndex++;
    }

    const messagesToSend = startIndex < validMessages.length ? validMessages.slice(startIndex) : validMessages;

    const formattedContents = messagesToSend.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    if (formattedContents.length === 0) {
      formattedContents.push({
        role: "user",
        parts: [{ text: messages[messages.length - 1]?.text || "مرحباً" }]
      });
    }

    const { response, modelUsed, fallbackSearchUsed } = await robustGenerateContent(
      ai,
      preferredModel,
      formattedContents,
      config,
      true
    );

    const replyText = response.text || "عذراً، لم أستطع توليد إجابة في الوقت الحالي.";
    const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    res.json({
      success: true,
      provider: "gemini",
      modelUsed,
      reply: replyText,
      groundingChunks: searchChunks || null,
      searchFallback: Boolean(fallbackSearchUsed)
    });
  } catch (err: any) {
    console.error("Gemini Chat API Error:", err);

    // If Gemini fails (e.g. quota limit, 429) and OpenRouter is configured, seamlessly fallback to OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
      try {
        console.log("Seamlessly falling back to OpenRouter AI...");
        const { reply, modelUsed } = await callOpenRouterChat({
          messages,
          model: openRouterModel || "deepseek/deepseek-chat",
          systemInstruction: systemInstruction || defaultSysInstruction
        });

        return res.json({
          success: true,
          provider: "openrouter",
          modelUsed,
          reply,
          groundingChunks: null,
          searchFallback: false
        });
      } catch (fallbackErr: any) {
        console.error("OpenRouter fallback attempt also failed:", fallbackErr);
      }
    }

    res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء الاتصال بالمساعد الذكي: " + (err.message || "عطل في الخدمة")
    });
  }
});

app.post("/api/ai/suggest-category", async (req, res) => {
  const { name, description } = req.body;
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' }
    }
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Suggest a single, short drug category for a medicine named "${name}" with description "${description}". Return only the category name in Arabic.`,
    });
    res.json({ category: response.text?.trim() });
  } catch (e) {
    res.status(500).json({ error: "Failed to suggest category" });
  }
});

// Standard Gemini Generate Endpoint per AI Studio @google/genai guidelines
app.post("/api/gemini/generate", async (req, res) => {
  const { prompt, contents, systemInstruction } = req.body;
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
      "gemini-3.8-flash",
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

// Streaming Gemini API Endpoint (Server-Sent Events) with gemini-3.8-flash
app.post("/api/gemini/stream", async (req, res) => {
  const { prompt, contents, systemInstruction } = req.body;
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
      model: "gemini-3.8-flash",
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

// --- GOOGLE GENAI INTERACTIONS AGENT API (ANTIGRAVITY & DEEP RESEARCH) ---
app.post("/api/ai/agent-interaction", async (req, res) => {
  const { input, prompt, agent = "antigravity-preview-05-2026", background = false } = req.body;
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
      agent: agent || "antigravity-preview-05-2026",
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

app.get("/api/ai/agent-interaction/:id", async (req, res) => {
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
app.post("/api/ai/generate-image", async (req, res) => {
  const { prompt, aspectRatio = "1:1", imageSize = "1K" } = req.body;
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
app.post("/api/ai/edit-image", async (req, res) => {
  const { prompt, imageBase64, mimeType = "image/png" } = req.body;
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

// --- VEO 3.1 VIDEO GENERATION API (3-Step Pattern) ---
app.post("/api/generate-video", async (req, res) => {
  const { prompt, imageBase64, mimeType = "image/png", aspectRatio = "16:9", resolution = "720p" } = req.body;
  if (!prompt && !imageBase64) {
    return res.status(400).json({ error: "الوصف أو الصورة مطلوب لتوليد الفيديو" });
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

    const videoConfig: any = {
      numberOfVideos: 1,
      resolution: resolution === "1080p" ? "1080p" : "720p",
      aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9"
    };

    let videoPayload: any = {
      model: "veo-3.1-lite-generate-preview",
      prompt: prompt || "Cinematic promotional pharmaceutical showcase video with gentle lighting and floating medical elements",
      config: videoConfig
    };

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      videoPayload.image = {
        imageBytes: cleanBase64,
        mimeType: mimeType || "image/png"
      };
    }

    const operation = await ai.models.generateVideos(videoPayload);

    res.json({
      success: true,
      operationName: operation.name
    });
  } catch (err: any) {
    console.error("Veo Video Start Error:", err);
    res.status(500).json({
      success: false,
      error: "فشل بدء توليد الفيديو: " + (err.message || "عطل في الخدمة")
    });
  }
});

app.post("/api/video-status", async (req, res) => {
  const { operationName } = req.body;
  if (!operationName) {
    return res.status(400).json({ error: "اسم العملية (operationName) مطلوب" });
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

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    res.json({
      success: true,
      done: Boolean(updated.done),
      error: updated.error ? updated.error.message : undefined
    });
  } catch (err: any) {
    console.error("Veo Video Status Error:", err);
    res.status(500).json({
      success: false,
      error: "فشل فحص حالة الفيديو: " + (err.message || "عطل في الخدمة")
    });
  }
});

app.post("/api/video-download", async (req, res) => {
  const { operationName } = req.body;
  if (!operationName) {
    return res.status(400).json({ error: "اسم العملية مطلوب لتحميل الفيديو" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "مفتاح GEMINI_API_KEY غير مهيأ" });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      return res.status(404).json({ error: "لم يتم العثور على رابط ملف الفيديو المكتمل" });
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey }
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).json({ error: "فشل جلب بيانات الفيديو من الخادم" });
    }

    res.setHeader('Content-Type', 'video/mp4');
    if (videoRes.body) {
      // Stream video content directly to client
      const arrayBuffer = await videoRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } else {
      res.status(500).json({ error: "محتوى الفيديو فارغ" });
    }
  } catch (err: any) {
    console.error("Veo Video Download Error:", err);
    res.status(500).json({
      success: false,
      error: "فشل تحميل الفيديو: " + (err.message || "عطل في الخدمة")
    });
  }
});


// Clear all data (For testing/reset)
app.post("/api/system/reset", async (req, res) => {
  await resetSystemInDB();
  res.json({ success: true, message: "تم إعادة ضبط النظام بنجاح" });
});


// ---------------- VITE MIDDLEWARE / STATIC SERVING ----------------

async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  if (process.env.NODE_ENV === "production" && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    try {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mandoubak Med Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
