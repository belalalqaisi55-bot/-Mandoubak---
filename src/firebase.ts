import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider, getToken as getAppCheckToken } from "firebase/app-check";
import {
  getAuth,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence
} from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  getDocs,
  setLogLevel,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Set Firestore log level to silent to prevent offline connection warning noise in browser console
try {
  setLogLevel("silent");
} catch {
  // Ignore if already set
}

// Check if Firebase is configured with active credentials
export const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.projectId !== "remixed-project-id");

let app: any = null;
let db: any = null;
let auth: any = null;
let storage: any = null;
let appCheck: any = null;
let messaging: any = null;
export { app, auth, db, storage, appCheck, messaging };
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export function formatFirebaseAuthError(error: any): string {
  const code = error?.code || "";
  const message = error?.message || "";
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";

  if (code === "auth/unauthorized-domain" || message.includes("auth/unauthorized-domain")) {
    return `النطاق الحالي (${hostname}) غير مصرح به في Firebase Authentication. يرجى إضافته في Authorized domains بلوحة تحكم Firebase.`;
  }
  if (code === "auth/operation-not-allowed" || message.includes("auth/operation-not-allowed")) {
    return "طريقة تسجيل الدخول هذه غير مفعّلة في إعدادات Firebase Authentication (Sign-in method).";
  }
  if (code === "auth/invalid-email" || message.includes("auth/invalid-email")) {
    return "صيغة البريد الإلكتروني غير صحيحة، يرجى التحقق والمحاولة مجدداً.";
  }
  if (code === "auth/user-disabled" || message.includes("auth/user-disabled")) {
    return "تم تعطيل هذا الحساب. يرجى التواصل مع المندوب المسؤول د/ بلال القيسي.";
  }
  if (code === "auth/user-not-found" || message.includes("auth/user-not-found")) {
    return "لا يوجد حساب مسجل بهذا البريد الإلكتروني. يمكنك الضغط على «إنشاء حساب جديد».";
  }
  if (code === "auth/wrong-password" || message.includes("auth/wrong-password")) {
    return "كلمة المرور غير صحيحة. يرجى التأكد أو استخدام خيار «نسيت كلمة المرور؟».";
  }
  if (code === "auth/invalid-credential" || message.includes("auth/invalid-credential")) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق والمحاولة مجدداً.";
  }
  if (code === "auth/email-already-in-use" || message.includes("auth/email-already-in-use")) {
    return "هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول بدلاً من إنشاء حساب جديد.";
  }
  if (code === "auth/weak-password" || message.includes("auth/weak-password")) {
    return "كلمة المرور ضعيفة جداً، يجب أن تتكون من 6 أحرف أو أرقام على الأقل.";
  }
  if (code === "auth/missing-password" || message.includes("auth/missing-password")) {
    return "يرجى إدخال كلمة المرور.";
  }
  if (code === "auth/too-many-requests" || message.includes("auth/too-many-requests")) {
    return "تم تجاوز عدد المحاولات المسموح بها مؤقتاً. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.";
  }
  if (code === "auth/requires-recent-login" || message.includes("auth/requires-recent-login")) {
    return "لأسباب أمنية، يرجى إعادة تسجيل الدخول ثم المحاولة مجدداً.";
  }
  if (code === "auth/popup-blocked" || message.includes("auth/popup-blocked")) {
    return "تم حظر النافذة المنبثقة لتسجيل الدخول بجوجل. يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع والمحاولة مجدداً.";
  }
  if (code === "auth/popup-closed-by-user" || message.includes("auth/popup-closed-by-user")) {
    return "تم إغلاق نافذة تسجيل الدخول بحساب Google قبل إتمام العملية.";
  }
  if (code === "auth/cancelled-popup-request" || message.includes("auth/cancelled-popup-request")) {
    return "تم إلغاء نافذة تسجيل الدخول السابقة، يرجى المحاولة مرة أخرى.";
  }
  if (code === "auth/network-request-failed" || message.includes("auth/network-request-failed")) {
    return "تعذر الاتصال بخوادم المصادقة. يرجى التحقق من اتصال الإنترنت.";
  }
  if (
    code === "auth/firebase-app-check-token-is-invalid" ||
    code.includes("app-check") ||
    message.includes("App Check") ||
    message.includes("app-check")
  ) {
    return "تم تفعيل حماية Firebase App Check على المصادقة (Authentication) في لوحة تحكم Firebase للمشروع بدون مفتاح reCAPTCHA صالح. أوقف فرض App Check مؤقتاً على Authentication أو أضف مفتاح reCAPTCHA v3 الصحيح.";
  }
  if (code === "auth/internal-error" || message.includes("auth/internal-error")) {
    const appCheckDetail = error?.__appCheckError;
    if (appCheckDetail) {
      return `فشل التحقق من حماية App Check / reCAPTCHA: مشروع Firebase يفرض App Check على المصادقة، لكن التحقق من المفتاح فشل على هذا الدومين (${appCheckDetail}). تأكد من حفظ الـ Secret Key في Firebase App Check وإضافة الدومين في Google reCAPTCHA، أو اجعل Authentication غير مفروض (Unenforced) مؤقتاً في Firebase Console ← App Check ← APIs.`;
    }
    const rawDetail = error?.customData?.message || error?.customData?._tokenResponse?.error?.message || message || code;
    return `تعذر إتمام المصادقة داخل المتصفح الحالي (قد يكون بسبب حظر النوافذ المنبثقة/ملفات تعريف الارتباط، أو عدم اكتمال إعداد App Check في Firebase). جرّب فتح التطبيق في متصفح Chrome خارجياً أو الدخول بالبريد وكلمة المرور. (${rawDetail})`;
  }
  if (code) {
    return `${message || "تعذر إتمام تسجيل الدخول حالياً."} (${code})`;
  }
  return message || "عذراً، تعذر إتمام تسجيل الدخول حالياً. يمكنك المحاولة بطريقة أخرى أو برقم هاتفك المسجل.";
}

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const configAny = firebaseConfig as any;
    
    // Resilient Firestore settings with forced HTTP long polling to avoid WebSocket drops
    const firestoreSettings: any = {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    };

    if (configAny.firestoreDatabaseId && configAny.firestoreDatabaseId !== "(default)") {
      try {
        db = initializeFirestore(app, firestoreSettings, configAny.firestoreDatabaseId);
      } catch {
        db = getFirestore(app, configAny.firestoreDatabaseId);
      }
    } else {
      try {
        db = initializeFirestore(app, firestoreSettings);
      } catch {
        db = getFirestore(app);
      }
    }
    auth = getAuth(app);
    // Robust 3-tier persistence hierarchy to seamlessly survive third-party cookie restrictions in iframes and WebViews:
    // 1. IndexedDB (unaffected by third-party cookie blocking) -> 2. LocalStorage -> 3. In-Memory
    setPersistence(auth, indexedDBLocalPersistence)
      .catch(() => setPersistence(auth, browserLocalPersistence))
      .catch(() => setPersistence(auth, inMemoryPersistence))
      .catch(() => {});

    try {
      storage = configAny.storageBucket ? getStorage(app, configAny.storageBucket) : getStorage(app);
    } catch (storageErr) {
      try {
        storage = getStorage(app);
      } catch {
        console.warn("Firebase Storage initialization notice:", storageErr);
      }
    }

    // Initialize Firebase App Check when configured via env, firebaseConfig, or project site key
    const PROJECT_RECAPTCHA_SITE_KEY = "6LfCoSQuAAAAAKom-xj-27ElUa4l2dE-jtI-K1Dx";
    const envRecaptchaSiteKey = (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY;
    const cleanEnvKey =
      typeof envRecaptchaSiteKey === "string" &&
      envRecaptchaSiteKey.trim() &&
      envRecaptchaSiteKey.trim() !== "6Leav78tAAAAAIC55RH3TEYNvLaxhbN0JQ6YzgYf"
        ? envRecaptchaSiteKey.trim()
        : "";
    const configRecaptchaSiteKey = typeof configAny.recaptchaSiteKey === "string" ? configAny.recaptchaSiteKey.trim() : "";
    const recaptchaSiteKey = cleanEnvKey || configRecaptchaSiteKey || PROJECT_RECAPTCHA_SITE_KEY;
    const providerType = (import.meta as any).env?.VITE_RECAPTCHA_PROVIDER;
    const useClassicV3 =
      providerType === "v3" ||
      (providerType !== "enterprise" &&
        (recaptchaSiteKey === "6LcKGSEuAAAAAKhDasLhGYfZ9ReQl0efNofln7sP" ||
          recaptchaSiteKey === "6Ldr1yMuAAAAAPgQKz4zV8hzN0mml0pkGjGlp4id"));
    const disableAppCheck = (import.meta as any).env?.VITE_ENABLE_APP_CHECK === "false";
    const debugTokenEnv = (import.meta as any).env?.VITE_APPCHECK_DEBUG_TOKEN;
    if (!disableAppCheck && typeof window !== "undefined" && recaptchaSiteKey) {
      if (debugTokenEnv) {
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugTokenEnv === "true" ? true : debugTokenEnv;
      }
      try {
        appCheck = initializeAppCheck(app, {
          provider: useClassicV3
            ? new ReCaptchaV3Provider(recaptchaSiteKey)
            : new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
        console.log(
          useClassicV3
            ? "✓ تم تفعيل Firebase App Check (reCAPTCHA v3) بنجاح"
            : "✓ تم تفعيل Firebase App Check (reCAPTCHA Enterprise) بنجاح"
        );
      } catch (appCheckErr) {
        console.error("خطأ في تفعيل App Check:", appCheckErr);
      }
    }

    try {
      messaging = getMessaging(app);
    } catch (msgErr) {
      console.warn("Firebase Messaging initialization notice:", msgErr);
    }

    // Attempt silent anonymous sign-in so Firestore has a valid auth session
    if (auth && !auth.currentUser) {
      signInAnonymously(auth).catch(() => {
        // Silently ignore if offline or anonymous auth disabled
      });
    }
  } catch (err) {
    console.warn("Firebase SDK initialization fallback:", err);
  }
}

/**
 * Executes a Firestore getDocs with an automatic timeout to prevent 10s hang on slow networks
 */
export async function getDocsWithTimeout(queryRef: any, timeoutMs: number = 10000): Promise<any> {
  const fetchPromise = getDocs(queryRef);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Firestore fetch timeout")), timeoutMs)
  );
  return Promise.race([fetchPromise, timeoutPromise]);
}

async function attachAppCheckDiagnostics(err: any) {
  if (!err || (err?.code !== "auth/internal-error" && !String(err?.message || "").includes("auth/internal-error"))) {
    return;
  }
  const host = typeof window !== "undefined" ? window.location.hostname : "unknown-host";
  if (!appCheck) {
    err.__appCheckError = `App Check not initialized (${host})`;
    return;
  }
  try {
    await Promise.race([
      getAppCheckToken(appCheck, false),
      new Promise((_, reject) => setTimeout(() => reject(new Error("App Check token timeout")), 2500))
    ]);
  } catch (acErr: any) {
    const detail = acErr?.code ? `${acErr.code}: ${acErr.message || ""}` : (acErr?.message || String(acErr));
    err.__appCheckError = `${detail} | host: ${host}`;
  }
}

export async function signInWithGoogle() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("خدمة Firebase غير مهيأة بعد على هذا المشروع");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    await attachAppCheckDiagnostics(err);
    throw err;
  }
}

export async function signInWithEmail(email: string, pass: string) {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("خدمة Firebase غير مهيأة بعد على هذا المشروع");
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (err) {
    await attachAppCheckDiagnostics(err);
    throw err;
  }
}

export async function registerWithEmail(email: string, pass: string) {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("خدمة Firebase غير مهيأة بعد على هذا المشروع");
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (err) {
    await attachAppCheckDiagnostics(err);
    throw err;
  }
}

export async function signOutUser() {
  if (!auth) return;
  await signOut(auth);
}

export async function resetPassword(email: string) {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("خدمة Firebase غير مهيأة بعد على هذا المشروع");
  }
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    await attachAppCheckDiagnostics(err);
    throw err;
  }
}

export function subscribeToAuthState(callback: (user: any) => void) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

// ==========================================
// 1. Hardened Error Handlers
// ==========================================
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn("Firestore Operation Notice: ", JSON.stringify(errInfo));
  return errInfo;
}

// ==========================================
// 2. Validate Connection to Firestore on Demand
// ==========================================
export async function testConnection() {
  if (!isFirebaseConfigured || !db) return;
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firebase testConnection timeout")), 1500)
    );
    await Promise.race([getDocFromServer(doc(db, "test", "connection")), timeoutPromise]);
  } catch (error: any) {
    // If the server responded with not-found or permission-denied, connection is active.
    if (error?.code === 'not-found' || error?.code === 'permission-denied') {
      return;
    }
    console.warn("Firebase connection notice:", error?.message || error);
  }
}

// Automatically test Firestore connection on boot as mandated by Firebase skill
if (typeof window !== "undefined") {
  void testConnection();
}
export interface FirestoreProbeResult {
  configured: boolean;
  connected: boolean;
  latencyMs: number;
  source: 'server' | 'cache' | 'none';
  error?: string;
  projectId?: string;
  databaseId?: string;
  authUid?: string;
  isAnonymous?: boolean;
}

export async function probeFirestoreDetailed(): Promise<FirestoreProbeResult> {
  const projectId = (firebaseConfig as any)?.projectId;
  const databaseId = (firebaseConfig as any)?.firestoreDatabaseId || "(default)";

  if (!isFirebaseConfigured || !db) {
    return {
      configured: false,
      connected: false,
      latencyMs: 0,
      source: 'none',
      projectId,
      databaseId,
      error: "Firebase غير مهيأ (يعمل التطبيق في وضع قاعدة البيانات المحلية المستقلة)",
      authUid: auth?.currentUser?.uid,
      isAnonymous: auth?.currentUser?.isAnonymous
    };
  }

  const start = performance.now();
  try {
    const probeRef = doc(db, "_diagnostics", "probe_" + Date.now());
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("مهلة الاتصال بـ Firestore انتهت (> 4500ms)")), 4500)
    );

    await Promise.race([getDocFromServer(probeRef), timeoutPromise]);
    const latencyMs = Math.round(performance.now() - start);

    return {
      configured: true,
      connected: true,
      latencyMs,
      source: 'server',
      projectId,
      databaseId,
      authUid: auth?.currentUser?.uid,
      isAnonymous: auth?.currentUser?.isAnonymous
    };
  } catch (error: any) {
    const latencyMs = Math.round(performance.now() - start);
    // In Firestore, if server returns 'not-found' or 'permission-denied', that confirms server connection is active!
    if (error?.code === 'not-found' || error?.code === 'permission-denied') {
      return {
        configured: true,
        connected: true,
        latencyMs,
        source: 'server',
        projectId,
        databaseId,
        authUid: auth?.currentUser?.uid,
        isAnonymous: auth?.currentUser?.isAnonymous
      };
    }

    return {
      configured: true,
      connected: false,
      latencyMs,
      source: 'cache',
      projectId,
      databaseId,
      error: error?.message || "تعذر الوصول المباشر لخوادم Firestore (قد تكون محجوبة بالشبكة)",
      authUid: auth?.currentUser?.uid,
      isAnonymous: auth?.currentUser?.isAnonymous
    };
  }
}

function sanitizeAndValidateVapidKey(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const cleaned = raw.trim().replace(/^["']+|["']+$/g, "").replace(/\s+/g, "");
  if (!cleaned || !/^[A-Za-z0-9\-_+/=]+$/.test(cleaned)) {
    return undefined;
  }
  try {
    const base64url = cleaned.replace(/=+$/, "");
    const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
    const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    // Standard Web Push VAPID public key is an uncompressed P-256 point (65 bytes, starting with 0x04)
    if (decoded.length !== 65 || decoded.charCodeAt(0) !== 4) {
      return undefined;
    }
    return base64url;
  } catch {
    return undefined;
  }
}

export async function requestFcmToken(): Promise<string | null> {
  if (!isFirebaseConfigured || !messaging || typeof window === "undefined") {
    return null;
  }
  if (!("Notification" in window) || window.Notification.permission !== "granted") {
    return null;
  }
  try {
    const configAny = firebaseConfig as any;
    const rawVapidKey =
      (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY ||
      configAny.vapidKey;
    const vapidKey = sanitizeAndValidateVapidKey(rawVapidKey);

    if (rawVapidKey && !vapidKey) {
      console.warn("قيمة VITE_FIREBASE_VAPID_KEY غير صالحة (يجب أن تكون مفتاح Web Push VAPID بصيغة Base64URL من Firebase Console). سيتم استخدام المفتاح الافتراضي للـ SDK.");
    }

    let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator) {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      } catch (swErr) {
        console.warn("FCM service worker registration notice:", swErr);
      }
    }

    const { getToken } = await import("firebase/messaging");
    const tokenOptions: { vapidKey?: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = {};
    if (vapidKey) {
      tokenOptions.vapidKey = vapidKey;
    }
    if (serviceWorkerRegistration) {
      tokenOptions.serviceWorkerRegistration = serviceWorkerRegistration;
    }

    const token = await getToken(messaging, tokenOptions);
    if (token) {
      return token;
    }
    return null;
  } catch (err) {
    console.warn("FCM token retrieval notice:", err);
    return null;
  }
}

export async function subscribeToForegroundFcmMessages(
  callback: (payload: any) => void
): Promise<() => void> {
  if (!isFirebaseConfigured || !messaging || typeof window === "undefined") {
    return () => {};
  }
  try {
    const { onMessage } = await import("firebase/messaging");
    return onMessage(messaging, callback);
  } catch (err) {
    console.warn("FCM foreground listener notice:", err);
    return () => {};
  }
}
