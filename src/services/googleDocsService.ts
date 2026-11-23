import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../firebase";
import firebaseConfig from "../../firebase-applet-config.json";

export const GOOGLE_DOCS_PROJECT_ID =
  (firebaseConfig as { projectId?: string })?.projectId || "wired-sol-514110-i2";

/**
 * Google Docs & Drive OAuth scopes provisioned via set_up_oauth.
 */
export const GOOGLE_DOCS_SCOPES: string[] = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
];

// Narrower fallback scopes if an organization policy restricts broad drive scope
export const GOOGLE_DOCS_CORE_SCOPES: string[] = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive.file",
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

export function subscribeGoogleDocsToken(listener: TokenListener): () => void {
  listeners.add(listener);
  listener({ token: cachedAccessToken, user: cachedFirebaseUser });
  return () => {
    listeners.delete(listener);
  };
}

export function initGoogleDocsAuth(
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

export function getGoogleDocsAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearGoogleDocsAccessToken(): void {
  cachedAccessToken = null;
  notifyListeners();
}

export async function signOutGoogleDocs(): Promise<void> {
  cachedAccessToken = null;
  notifyListeners();
}

export async function signInToGoogleDocs(useCoreScopesOnly = false): Promise<{
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
    const scopes = useCoreScopesOnly ? GOOGLE_DOCS_CORE_SCOPES : GOOGLE_DOCS_SCOPES;
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
    const errMsg = String(err?.message || err?.code || "").toLowerCase();
    if (!useCoreScopesOnly && (errMsg.includes("invalid_scope") || errMsg.includes("restricted"))) {
      return signInToGoogleDocs(true);
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
}

export interface DriveDocFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
  owners?: Array<{ displayName?: string; emailAddress?: string }>;
}

export interface ParsedGoogleDoc {
  documentId: string;
  title: string;
  revisionId?: string;
  bodyText: string;
  endIndex: number;
  paragraphCount: number;
  tableCount: number;
}

export interface GoogleDocsApiError extends Error {
  status?: number;
  isAuthError?: boolean;
  rawDetail?: string;
}

async function parseGoogleDocsError(res: Response, fallbackMessage: string): Promise<GoogleDocsApiError> {
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

  const isAuthError = res.status === 401;
  let friendlyMessage = fallbackMessage;

  if (isAuthError) {
    clearGoogleDocsAccessToken();
    friendlyMessage = "انتهت صلاحية جلسة Google Docs. يرجى إعادة تسجيل الدخول بحساب Google.";
  } else if (res.status === 403) {
    friendlyMessage = `تعذر الوصول إلى Google Docs / Drive API (403). تأكد من منح صلاحيات المستندات وتفعيل واجهتي Docs و Drive في مشروع Google Cloud (${GOOGLE_DOCS_PROJECT_ID}). (${rawDetail})`;
  } else if (rawDetail) {
    friendlyMessage = `${fallbackMessage}: ${rawDetail}`;
  }

  const error = new Error(friendlyMessage) as GoogleDocsApiError;
  error.status = res.status;
  error.isAuthError = isAuthError;
  error.rawDetail = rawDetail;
  return error;
}

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DOCS_API_BASE = "https://docs.googleapis.com/v1";

export async function listGoogleDocs(token: string, searchQuery = ""): Promise<DriveDocFile[]> {
  const escapedSearch = searchQuery.trim().replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const qParts = [
    "mimeType='application/vnd.google-apps.document'",
    "trashed=false",
  ];
  if (escapedSearch) {
    qParts.push(`name contains '${escapedSearch}'`);
  }

  const params = new URLSearchParams({
    q: qParts.join(" and "),
    orderBy: "modifiedTime desc",
    pageSize: "30",
    fields: "files(id,name,modifiedTime,webViewLink,owners(displayName,emailAddress))",
  });

  const res = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw await parseGoogleDocsError(res, "فشل جلب قائمة مستندات Google Docs من Drive");
  }

  const data = await res.json();
  return data.files || [];
}

function readStructuralElements(elements: any[] = []): {
  text: string;
  paragraphCount: number;
  tableCount: number;
} {
  const chunks: string[] = [];
  let paragraphCount = 0;
  let tableCount = 0;

  for (const el of elements) {
    if (el.paragraph?.elements) {
      paragraphCount += 1;
      let line = "";
      for (const pEl of el.paragraph.elements) {
        if (pEl.textRun?.content) {
          line += pEl.textRun.content;
        }
      }
      if (line) {
        chunks.push(line);
      }
    } else if (el.table?.tableRows) {
      tableCount += 1;
      const rowsText: string[] = [];
      for (const row of el.table.tableRows) {
        const cellTexts: string[] = [];
        for (const cell of row.tableCells || []) {
          const nested = readStructuralElements(cell.content || []);
          cellTexts.push(nested.text.replace(/\n+/g, " ").trim());
        }
        rowsText.push(cellTexts.join(" | "));
      }
      chunks.push(`\n${rowsText.join("\n")}\n`);
    } else if (el.tableOfContents?.content) {
      const toc = readStructuralElements(el.tableOfContents.content);
      chunks.push(toc.text);
    }
  }

  return {
    text: chunks.join("").trimEnd(),
    paragraphCount,
    tableCount,
  };
}

export async function getGoogleDoc(token: string, documentId: string): Promise<ParsedGoogleDoc> {
  const res = await fetch(`${DOCS_API_BASE}/documents/${encodeURIComponent(documentId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw await parseGoogleDocsError(res, "فشل قراءة محتوى المستند من Google Docs");
  }

  const doc = await res.json();
  const contentElements: any[] = doc?.body?.content || [];
  const extracted = readStructuralElements(contentElements);
  const lastElement = contentElements[contentElements.length - 1];
  const endIndex = typeof lastElement?.endIndex === "number" ? Math.max(1, lastElement.endIndex - 1) : 1;

  return {
    documentId: doc.documentId,
    title: doc.title || "مستند بدون عنوان",
    revisionId: doc.revisionId,
    bodyText: extracted.text,
    endIndex,
    paragraphCount: extracted.paragraphCount,
    tableCount: extracted.tableCount,
  };
}

export async function createGoogleDoc(
  token: string,
  title: string,
  initialContent = ""
): Promise<ParsedGoogleDoc> {
  const createRes = await fetch(`${DOCS_API_BASE}/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: title.trim() || "مستند مندوبك الطبي الجديد",
    }),
  });

  if (!createRes.ok) {
    throw await parseGoogleDocsError(createRes, "فشل إنشاء مستند جديد في Google Docs");
  }

  const created = await createRes.json();
  const documentId = created.documentId as string;

  if (initialContent.trim()) {
    const updateRes = await fetch(
      `${DOCS_API_BASE}/documents/${encodeURIComponent(documentId)}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: initialContent.trimEnd() + "\n",
              },
            },
          ],
        }),
      }
    );

    if (!updateRes.ok) {
      throw await parseGoogleDocsError(updateRes, "تم إنشاء المستند لكن تعذر كتابة المحتوى الأولي");
    }
  }

  return getGoogleDoc(token, documentId);
}

export async function appendTextToGoogleDoc(
  token: string,
  documentId: string,
  textToAppend: string
): Promise<ParsedGoogleDoc> {
  const current = await getGoogleDoc(token, documentId);
  const insertText = (current.bodyText ? "\n\n" : "") + textToAppend.trimEnd() + "\n";

  const res = await fetch(
    `${DOCS_API_BASE}/documents/${encodeURIComponent(documentId)}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: current.endIndex },
              text: insertText,
            },
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    throw await parseGoogleDocsError(res, "فشل تحديث المستند وإضافة النص عبر Google Docs");
  }

  return getGoogleDoc(token, documentId);
}

export async function trashGoogleDoc(token: string, documentId: string): Promise<void> {
  const res = await fetch(`${DRIVE_API_BASE}/files/${encodeURIComponent(documentId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trashed: true }),
  });

  if (!res.ok) {
    throw await parseGoogleDocsError(res, "فشل نقل المستند إلى سلة المهملات في Google Drive");
  }
}
