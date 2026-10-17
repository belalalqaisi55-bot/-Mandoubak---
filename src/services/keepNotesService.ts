import { KeepNote } from "../types";
import { db, isFirebaseConfigured, auth } from "../firebase";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

const STORAGE_KEY = "mandoubak_keep_notes";
const EVENT_KEY = "mandoubak_keep_notes_updated";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
    },
    operationType,
    path
  };

  console.error("Firestore Error: ", JSON.stringify(errInfo));
  
  if (errMessage.includes("Missing or insufficient permissions") || errMessage.includes("permission-denied")) {
    throw new Error(JSON.stringify({
      userMessage: "عذراً، ليس لديك صلاحية كافية للوصول إلى الملاحظات في قاعدة البيانات السحابية. يتم استخدام التخزين المحلي مؤقتاً.",
      ...errInfo
    }));
  }

  throw new Error(JSON.stringify(errInfo));
}

const DEFAULT_SAMPLE_NOTES: KeepNote[] = [
  {
    id: "note-sample-1",
    title: "💊 طلبيات صيدلية الروضة العاجلة",
    content: "أموكسيسيلين 500 مغ (20 علبة)\nباراسيتامول شراب (50 حبة)\nفيتامين سي فوار (15 علبة)",
    color: "yellow",
    isPinned: true,
    isArchived: false,
    labels: ["أدوية", "طلبيات"],
    clientEntityName: "صيدلية الروضة المركزية",
    updatedAt: new Date().toISOString(),
    checklist: [
      { id: "item-1", text: "تأكيد كشف بونص الشركة 10+2", completed: true },
      { id: "item-2", text: "تسليم الفاتورة الأصلية للمسؤول", completed: false },
    ],
  },
  {
    id: "note-sample-2",
    title: "📋 تعليمات الزيارات الميدانية ومتابعة الأطباء",
    content: "1. التأكد من توفر بونص الشركات للأدوية الجديدة.\n2. تسليم عينات مجانية للأطباء المعتمدين.\n3. توثيق الملاحظات في تطبيق مندوبك الطبي.",
    color: "blue",
    isPinned: true,
    isArchived: false,
    labels: ["إرشادات", "ميداني"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "note-sample-3",
    title: "📞 أرقام هامة للتنسيق الطبي السريع",
    content: "المندوب المعتمد د/ بلال القيسي: 776600049\nمخزن الأدوية الرئيسي: فرع صنعاء",
    color: "green",
    isPinned: false,
    isArchived: false,
    labels: ["تواصل"],
    updatedAt: new Date().toISOString(),
  },
];

export async function fetchKeepNotes(): Promise<KeepNote[]> {
  const collectionPath = "keep_notes";
  try {
    if (isFirebaseConfigured && db) {
      const q = collection(db, collectionPath);
      const snapshot = await getDocs(q).catch((err) => {
        handleFirestoreError(err, OperationType.LIST, collectionPath);
      });
      
      const fetched: KeepNote[] = [];
      if (snapshot) {
        snapshot.forEach((d) => {
          fetched.push({ id: d.id, ...d.data() } as KeepNote);
        });
      }
      if (fetched.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fetched));
        return fetched;
      }
    }
  } catch (err: any) {
    console.warn("Could not fetch notes from Firestore, using offline storage:", err.message || err);
  }

  // Fallback to localStorage
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed reading local keep notes:", e);
  }

  // Seed default notes
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_NOTES));
  } catch (e) {}
  return DEFAULT_SAMPLE_NOTES;
}

export async function saveKeepNotes(notes: KeepNote[]): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.warn("Failed saving notes to localStorage:", e);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: notes }));
  }

  if (isFirebaseConfigured && db) {
    try {
      for (const note of notes) {
        const ref = doc(db, "keep_notes", note.id);
        await setDoc(ref, note, { merge: true }).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `keep_notes/${note.id}`);
        });
      }
    } catch (err) {
      console.warn("Could not sync note to Firestore:", err);
    }
  }
}

export async function addKeepNote(
  newNoteData: Omit<KeepNote, "id" | "updatedAt">
): Promise<KeepNote> {
  const current = await fetchKeepNotes();
  const created: KeepNote = {
    ...newNoteData,
    id: `keep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    updatedAt: new Date().toISOString(),
  };

  const updated = [created, ...current];
  await saveKeepNotes(updated);
  return created;
}

export async function updateKeepNote(
  id: string,
  updates: Partial<KeepNote>
): Promise<KeepNote[]> {
  const current = await fetchKeepNotes();
  const updated = current.map((n) =>
    n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
  );
  await saveKeepNotes(updated);
  return updated;
}

export async function deleteKeepNote(id: string): Promise<KeepNote[]> {
  const current = await fetchKeepNotes();
  const updated = current.filter((n) => n.id !== id);
  await saveKeepNotes(updated);

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, "keep_notes", id)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `keep_notes/${id}`);
      });
    } catch (err) {
      console.warn("Could not delete note from Firestore:", err);
    }
  }

  return updated;
}

export function subscribeKeepNotes(callback: (notes: KeepNote[]) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<KeepNote[]>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener(EVENT_KEY, handler);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(EVENT_KEY, handler);
    }
  };
}
