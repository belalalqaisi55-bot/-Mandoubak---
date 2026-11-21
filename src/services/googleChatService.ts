import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../firebase";
import firebaseConfig from "../../firebase-applet-config.json";

export const GOOGLE_CHAT_PROJECT_ID =
  (firebaseConfig as { projectId?: string })?.projectId || "wired-sol-514110-i2";

export const GOOGLE_CHAT_CONSOLE_CONFIG_URL = `https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=${GOOGLE_CHAT_PROJECT_ID}`;

/**
 * User-delegable Google Chat OAuth scopes provisioned via set_up_oauth.
 * (App-only scopes like chat.app.* and chat.import require service-account app auth
 * rather than browser user OAuth consent.)
 */
export const GOOGLE_CHAT_SCOPES: string[] = [
  "https://www.googleapis.com/auth/chat.spaces",
  "https://www.googleapis.com/auth/chat.spaces.create",
  "https://www.googleapis.com/auth/chat.spaces.readonly",
  "https://www.googleapis.com/auth/chat.messages",
  "https://www.googleapis.com/auth/chat.messages.create",
  "https://www.googleapis.com/auth/chat.messages.readonly",
  "https://www.googleapis.com/auth/chat.messages.reactions",
  "https://www.googleapis.com/auth/chat.messages.reactions.create",
  "https://www.googleapis.com/auth/chat.messages.reactions.readonly",
  "https://www.googleapis.com/auth/chat.memberships",
  "https://www.googleapis.com/auth/chat.memberships.app",
  "https://www.googleapis.com/auth/chat.memberships.readonly",
  "https://www.googleapis.com/auth/chat.delete",
  "https://www.googleapis.com/auth/chat.customemojis",
  "https://www.googleapis.com/auth/chat.customemojis.readonly",
  "https://www.googleapis.com/auth/chat.users.readstate",
  "https://www.googleapis.com/auth/chat.users.readstate.readonly",
  "https://www.googleapis.com/auth/chat.users.sections",
  "https://www.googleapis.com/auth/chat.users.sections.readonly",
  "https://www.googleapis.com/auth/chat.users.spacesettings",
  "https://www.googleapis.com/auth/chat.admin.spaces",
  "https://www.googleapis.com/auth/chat.admin.spaces.readonly",
  "https://www.googleapis.com/auth/chat.admin.memberships",
  "https://www.googleapis.com/auth/chat.admin.memberships.readonly",
  "https://www.googleapis.com/auth/chat.admin.delete",
];

// Core standard Chat scopes requested as fallback if an organization restricts admin scopes
export const GOOGLE_CHAT_CORE_SCOPES: string[] = [
  "https://www.googleapis.com/auth/chat.spaces",
  "https://www.googleapis.com/auth/chat.spaces.create",
  "https://www.googleapis.com/auth/chat.spaces.readonly",
  "https://www.googleapis.com/auth/chat.messages",
  "https://www.googleapis.com/auth/chat.messages.create",
  "https://www.googleapis.com/auth/chat.messages.readonly",
  "https://www.googleapis.com/auth/chat.messages.reactions",
  "https://www.googleapis.com/auth/chat.messages.reactions.create",
  "https://www.googleapis.com/auth/chat.messages.reactions.readonly",
  "https://www.googleapis.com/auth/chat.memberships",
  "https://www.googleapis.com/auth/chat.memberships.readonly",
  "https://www.googleapis.com/auth/chat.delete",
  "https://www.googleapis.com/auth/chat.users.readstate",
  "https://www.googleapis.com/auth/chat.users.spacesettings",
];

// Strictly in-memory OAuth access token cache (never stored in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let cachedFirebaseUser: FirebaseUser | null = null;
let isSigningIn = false;

type TokenListener = (state: { token: string | null; user: FirebaseUser | null }) => void;
const listeners = new Set<TokenListener>();

function notifyListeners() {
  for (const listener of listeners) {
    listener({ token: cachedAccessToken, user: cachedFirebaseUser });
  }
}

export function subscribeGoogleChatToken(listener: TokenListener): () => void {
  listeners.add(listener);
  listener({ token: cachedAccessToken, user: cachedFirebaseUser });
  return () => {
    listeners.delete(listener);
  };
}

export function initGoogleChatAuth(
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
): () => void {
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }

  return onAuthStateChanged(auth, (user: FirebaseUser | null) => {
    cachedFirebaseUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      notifyListeners();
      if (onAuthFailure) onAuthFailure();
    }
  });
}

export function getGoogleChatAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearGoogleChatAccessToken(): void {
  cachedAccessToken = null;
  notifyListeners();
}

export async function signOutGoogleChat(): Promise<void> {
  cachedAccessToken = null;
  notifyListeners();
}

export async function signInToGoogleChat(useCoreScopesOnly = false): Promise<{
  user: FirebaseUser;
  accessToken: string;
}> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("خدمة Firebase غير مهيأة بعد على هذا المشروع.");
  }

  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account consent" });
    const scopes = useCoreScopesOnly ? GOOGLE_CHAT_CORE_SCOPES : GOOGLE_CHAT_SCOPES;
    for (const scope of scopes) {
      provider.addScope(scope);
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("لم يتم الحصول على رمز المصادقة (Access Token) من جوجل.");
    }

    cachedAccessToken = credential.accessToken;
    cachedFirebaseUser = result.user;
    notifyListeners();
    return { user: result.user, accessToken: credential.accessToken };
  } catch (err: any) {
    // If full admin scope list was rejected by Workspace policy, retry with core user scopes
    const errMsg = String(err?.message || err?.code || "").toLowerCase();
    if (!useCoreScopesOnly && (errMsg.includes("invalid_scope") || errMsg.includes("admin"))) {
      return signInToGoogleChat(true);
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
}

export interface ChatSpace {
  name: string;
  displayName?: string;
  spaceType?: "SPACE" | "GROUP_CHAT" | "DIRECT_MESSAGE" | string;
  singleUserBotDm?: boolean;
  spaceThreadingState?: string;
}

export interface ChatEmojiReactionSummary {
  emoji?: { unicode?: string; customEmoji?: { uid?: string; name?: string } };
  reactionCount?: number;
}

export interface ChatMessage {
  name: string;
  text?: string;
  formattedText?: string;
  sender?: {
    name?: string;
    displayName?: string;
    type?: string;
  };
  createTime?: string;
  emojiReactionSummaries?: ChatEmojiReactionSummary[];
}

export interface ChatMember {
  name: string;
  role?: string;
  state?: string;
  member?: {
    name?: string;
    displayName?: string;
    type?: string;
  };
}

export interface GoogleChatApiError extends Error {
  status?: number;
  isAuthError?: boolean;
  isChatAppNotConfigured?: boolean;
  isConsumerAccountError?: boolean;
  consoleConfigUrl?: string;
  rawDetail?: string;
}

async function parseGoogleChatError(res: Response, fallbackMessage: string): Promise<GoogleChatApiError> {
  let rawDetail = "";
  try {
    const json = await res.json();
    rawDetail = json?.error?.message || JSON.stringify(json);
  } catch {
    try {
      rawDetail = await res.text();
    } catch {
      rawDetail = "";
    }
  }

  const lower = rawDetail.toLowerCase();
  const isAuthError = res.status === 401;
  const isChatAppNotConfigured =
    res.status === 404 &&
    (lower.includes("chat app not found") ||
      lower.includes("configure the app") ||
      lower.includes("hangouts-chat"));
  const isConsumerAccountError =
    res.status === 403 &&
    (lower.includes("workspace") ||
      lower.includes("consumer") ||
      lower.includes("customer") ||
      lower.includes("permission") ||
      lower.includes("not enabled") ||
      lower.includes("forbidden"));

  let friendlyMessage = fallbackMessage;

  if (isAuthError) {
    clearGoogleChatAccessToken();
    friendlyMessage = "انتهت صلاحية جلسة Google Chat. يرجى إعادة تسجيل الدخول بحساب Google.";
  } else if (isChatAppNotConfigured) {
    friendlyMessage =
      `Google Chat app not found (${res.status}). يجب تفعيل إعدادات تطبيق Google Chat مرة واحدة في Google Cloud Console للمشروع (${GOOGLE_CHAT_PROJECT_ID}) عبر صفحة Configuration (اسم التطبيق والأيقونة والوصف).`;
  } else if (isConsumerAccountError) {
    friendlyMessage =
      `تعذر الوصول إلى Google Chat API (${res.status}): يتطلب Google Chat API حساب Google Workspace للأعمال أو المؤسسات (Business/Enterprise)، وقد لا تدعم حسابات @gmail.com الشخصية هذه الواجهة أو تنقصها صلاحية مساحة العمل. (${rawDetail})`;
  } else if (rawDetail) {
    friendlyMessage = `${fallbackMessage}: ${rawDetail}`;
  }

  const error = new Error(friendlyMessage) as GoogleChatApiError;
  error.status = res.status;
  error.isAuthError = isAuthError;
  error.isChatAppNotConfigured = isChatAppNotConfigured;
  error.isConsumerAccountError = isConsumerAccountError;
  error.consoleConfigUrl = GOOGLE_CHAT_CONSOLE_CONFIG_URL;
  error.rawDetail = rawDetail;
  return error;
}

const CHAT_API_BASE = "https://chat.googleapis.com/v1";

export async function listChatSpaces(token: string): Promise<ChatSpace[]> {
  const res = await fetch(`${CHAT_API_BASE}/spaces?pageSize=50`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw await parseGoogleChatError(res, "فشل جلب مساحات المحادثة من Google Chat");
  }

  const data = await res.json();
  return data.spaces || [];
}

export async function createChatSpace(
  token: string,
  displayName: string,
  spaceType: "SPACE" = "SPACE"
): Promise<ChatSpace> {
  const res = await fetch(`${CHAT_API_BASE}/spaces`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      spaceType,
      displayName: displayName.trim(),
    }),
  });

  if (!res.ok) {
    throw await parseGoogleChatError(res, "فشل إنشاء مساحة محادثة جديدة في Google Chat");
  }

  return res.json();
}

export async function listChatMessages(
  token: string,
  spaceName: string,
  pageSize = 35
): Promise<ChatMessage[]> {
  const res = await fetch(
    `${CHAT_API_BASE}/${spaceName}/messages?pageSize=${pageSize}&orderBy=createTime%20desc`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw await parseGoogleChatError(res, "فشل جلب رسائل المحادثة");
  }

  const data = await res.json();
  const list: ChatMessage[] = data.messages || [];
  return [...list].reverse();
}

export async function sendChatMessage(
  token: string,
  spaceName: string,
  text: string
): Promise<ChatMessage> {
  const res = await fetch(`${CHAT_API_BASE}/${spaceName}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw await parseGoogleChatError(res, "فشل إرسال الرسالة إلى Google Chat");
  }

  return res.json();
}

export async function deleteChatMessage(token: string, messageName: string): Promise<void> {
  const res = await fetch(`${CHAT_API_BASE}/${messageName}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw await parseGoogleChatError(res, "فشل حذف الرسالة من Google Chat");
  }
}

export async function listChatMembers(token: string, spaceName: string): Promise<ChatMember[]> {
  const res = await fetch(`${CHAT_API_BASE}/${spaceName}/members?pageSize=50`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw await parseGoogleChatError(res, "فشل جلب أعضاء المساحة");
  }

  const data = await res.json();
  return data.memberships || [];
}

export async function addChatReaction(
  token: string,
  messageName: string,
  unicodeEmoji: string
): Promise<any> {
  const res = await fetch(`${CHAT_API_BASE}/${messageName}/reactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      emoji: { unicode: unicodeEmoji },
    }),
  });

  if (!res.ok) {
    throw await parseGoogleChatError(res, "فشل إضافة التفاعل على الرسالة");
  }

  return res.json();
}
