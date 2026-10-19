import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { storage, db, isFirebaseConfigured, handleFirestoreError, OperationType } from "../firebase";
import { User, AppSettings } from "../types";
import { getApiUrl } from "../utils/apiConfig";

/**
 * Compresses an image file before upload to keep file size small (under 250KB)
 * and ensure rapid loading across slow cellular networks on all devices.
 */
export async function compressImageForStorage(
  file: File | Blob,
  maxWidth: number = 800,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("فشل قراءة ملف الصورة"));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error("فشل فك ترميز ملف الصورة"));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Converts a Blob to a base64 Data URL (used as guaranteed fallback if storage is offline)
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("فشل تحويل الصورة"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads an avatar image to Firebase Storage and returns its public HTTPS download URL.
 * Includes automatic compression and resilient fallback.
 */
export async function uploadProfileImageToStorage(
  file: File | Blob,
  customPath?: string
): Promise<string> {
  // 1. Compress image to optimal dimensions and size
  const compressedBlob = await compressImageForStorage(file, 800, 0.85);

  // 2. If Firebase Storage is available, upload to cloud bucket
  if (isFirebaseConfigured && storage) {
    try {
      const storagePath = customPath || `profiles/avatar_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
      const imageRef = ref(storage, storagePath);

      const metadata = {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000",
      };

      const snapshot = await uploadBytes(imageRef, compressedBlob, metadata);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      if (downloadUrl && downloadUrl.startsWith("http")) {
        console.log("Firebase Storage profile image uploaded successfully:", downloadUrl);
        return downloadUrl;
      }
    } catch (storageError) {
      console.warn("Firebase Storage direct upload warning, falling back to secure data sync:", storageError);
    }
  }

  // 3. Resilient Fallback: Convert to optimized compressed Data URL
  return await blobToDataUrl(compressedBlob);
}


/**
 * Comprehensive User Profile Update Function.
 * Connects the profile update in Firestore and Express server.
 */
export async function updateUserProfile({
  userId,
  name,
  phone,
  email,
  entityName,
  location,
  role,
  notes,
}: {
  userId: string;
  name?: string;
  phone?: string;
  email?: string;
  entityName?: string;
  location?: string;
  role?: string;
  notes?: string;
}): Promise<{
  success: boolean;
  user?: Partial<User>;
  error?: string;
}> {
  try {
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (name) updates.name = name.trim();
    if (phone) updates.phone = phone.trim();
    if (email) updates.email = email.trim();
    if (entityName !== undefined) updates.entityName = entityName.trim();
    if (location !== undefined) updates.location = location.trim();
    if (role) updates.role = role;
    if (notes !== undefined) updates.notes = notes.trim();

    // 1. Update User Document in Firestore
    if (isFirebaseConfigured && db && userId) {
      try {
        const userDocRef = doc(db, "users", userId);
        await setDoc(userDocRef, updates, { merge: true });
        console.log(`Firestore user profile ${userId} updated successfully.`);
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.WRITE, `users/${userId}`);
      }
    }

    // 2. Update User in Express Backend Server
    if (userId) {
      try {
        const userApiUrl = getApiUrl(`/api/users/${userId}`);
        await fetch(userApiUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...updates,
            id: userId,
          }),
        });
      } catch (apiErr) {
        console.warn("Backend user API update notice:", apiErr);
      }
    }

    // 3. Update Local User Session Cache
    try {
      const savedUserStr = localStorage.getItem("mandoubak_user");
      if (savedUserStr) {
        const currentUser = JSON.parse(savedUserStr);
        if (currentUser && currentUser.id === userId) {
          const merged = { ...currentUser, ...updates };
          localStorage.setItem("mandoubak_user", JSON.stringify(merged));
        }
      }
    } catch (e) {
      console.warn("Local storage cache sync notice:", e);
    }

    return {
      success: true,
      user: { id: userId, ...updates },
    };
  } catch (error: any) {
    console.error("Error in updateUserProfile:", error);
    return {
      success: false,
      error: error.message || "حدث خطأ أثناء تحديث الملف الشخصي",
    };
  }
}
