import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import {
  getAuth,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "firebase/auth";
import { getStorage } from "firebase/storage";
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
export { app, auth, db, storage, appCheck };
const googleProvider = new GoogleAuthProvider();

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const configAny = firebaseConfig as any;
    
    // Resilient Firestore settings with forced HTTP long polling to avoid WebSocket drops
    const firestoreSettings: any = {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    };

    if (configAny.firestoreDatabaseId) {
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
    try {
      const bucket = configAny.storageBucket || "gen-lang-client-0739281919.firebasestorage.app";
      storage = getStorage(app, bucket);
    } catch (storageErr) {
      try {
        storage = getStorage(app);
      } catch (fallbackErr) {
        console.warn("Firebase Storage initialization notice:", storageErr);
      }
    }

    // Initialize Firebase App Check if real site key is provided
    const recaptchaSiteKey = (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY;
    if (typeof window !== "undefined" && recaptchaSiteKey && recaptchaSiteKey !== "6Leav78tAAAAAIC55RH3TEYNvLaxhbN0JQ6YzgYf") {
      if ((import.meta as any).env?.DEV) {
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      try {
        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(recaptchaSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
        console.log("✓ تم تفعيل Firebase App Check بنجاح لحماية التطبيق");
      } catch (appCheckErr) {
        console.warn("Firebase App Check initialization notice:", appCheckErr);
      }
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
export async function getDocsWithTimeout(queryRef: any, timeoutMs: number = 3000): Promise<any> {
  const fetchPromise = getDocs(queryRef);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Firestore fetch timeout")), timeoutMs)
  );
  return Promise.race([fetchPromise, timeoutPromise]);
}

export async function signInWithGoogle() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("خدمة Firebase غير مهيأة بعد على هذا المشروع");
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithEmail(email: string, pass: string) {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("خدمة Firebase غير مهيأة بعد على هذا المشروع");
  }
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  return userCredential.user;
}

export async function registerWithEmail(email: string, pass: string) {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("خدمة Firebase غير مهيأة بعد على هذا المشروع");
  }
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  return userCredential.user;
}

export async function signOutUser() {
  if (!auth) return;
  await signOut(auth);
}

export async function resetPassword(email: string) {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("خدمة Firebase غير مهيأة بعد على هذا المشروع");
  }
  await sendPasswordResetEmail(auth, email);
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
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error: any) {
    // If the server responded with not-found or permission-denied, connection is active.
    if (error?.code === 'not-found' || error?.code === 'permission-denied') {
      return;
    }
    console.warn("Firebase connection notice:", error?.message || error);
  }
}

// Automatically test Firestore connection on boot as mandated by Firebase skill
testConnection();

