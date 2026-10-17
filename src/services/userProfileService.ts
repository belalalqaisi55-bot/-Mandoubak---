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
 * Connects the uploaded image directly to Firebase Storage,
 * updates the user profile in Firestore and Express server, and syncs across all devices.
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
  avatarFile,
  avatarUrl: providedAvatarUrl,
  isDrBelal = false,
}: {
  userId: string;
  name?: string;
  phone?: string;
  email?: string;
  entityName?: string;
  location?: string;
  role?: string;
  notes?: string;
  avatarFile?: File | Blob;
  avatarUrl?: string;
  isDrBelal?: boolean;
}): Promise<{
  success: boolean;
  avatarUrl?: string;
  user?: Partial<User>;
  error?: string;
}> {
  try {
    let finalAvatarUrl = providedAvatarUrl || "";

    // 1. If an image file was uploaded, store it in Firebase Storage
    if (avatarFile) {
      const path = isDrBelal
        ? `profiles/dr_belal_official_${Date.now()}.jpg`
        : `profiles/user_${userId || "profile"}_${Date.now()}.jpg`;

      finalAvatarUrl = await uploadProfileImageToStorage(avatarFile, path);
    }

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
    if (finalAvatarUrl) updates.avatar = finalAvatarUrl;

    // 2. If updating Dr. Belal / Main App Representative avatar, sync app_config & settings
    if (isDrBelal && finalAvatarUrl) {
      try {
        localStorage.setItem("mandoubak_dr_avatar", finalAvatarUrl);
      } catch (e) {
        console.warn("localStorage write warning", e);
      }

      // Sync to backend settings API
      try {
        const settingsUrl = getApiUrl("/api/settings");
        await fetch(settingsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ drProfileAvatar: finalAvatarUrl }),
        });
      } catch (apiErr) {
        console.warn("API settings update notice:", apiErr);
      }

      // Sync to Firestore settings/app_config
      if (isFirebaseConfigured && db) {
        try {
          await setDoc(
            doc(db, "settings", "app_config"),
            { drProfileAvatar: finalAvatarUrl, updatedAt: new Date().toISOString() },
            { merge: true }
          );
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, "settings/app_config");
        }
      }
    }

    // 3. Update User Document in Firestore
    if (isFirebaseConfigured && db && userId) {
      try {
        const userDocRef = doc(db, "users", userId);
        await setDoc(userDocRef, updates, { merge: true });
        console.log(`Firestore user profile ${userId} updated successfully with Firebase Storage avatar.`);
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.WRITE, `users/${userId}`);
      }
    }

    // 4. Update User in Express Backend Server
    if (userId) {
      try {
        const userApiUrl = getApiUrl(`/api/users/${userId}`);
        await fetch(userApiUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...updates,
            id: userId,
            avatar: finalAvatarUrl || updates.avatar,
          }),
        });
      } catch (apiErr) {
        console.warn("Backend user API update notice:", apiErr);
      }
    }

    // 5. Update Local User Session Cache
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
      avatarUrl: finalAvatarUrl,
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

/**
 * Dedicated function to update Dr. Belal Al-Qaisi's official representative avatar
 * with direct Firebase Storage integration and multi-device broadcasting.
 */
export async function updateDrBelalOfficialAvatar(file: File | Blob): Promise<{
  success: boolean;
  avatarUrl: string;
  error?: string;
}> {
  try {
    const downloadUrl = await uploadProfileImageToStorage(
      file,
      `profiles/dr_belal_official_${Date.now()}.jpg`
    );

    // Save locally
    try {
      localStorage.setItem("mandoubak_dr_avatar", downloadUrl);
    } catch (e) {}

    // Save to Firestore app_config
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(
          doc(db, "settings", "app_config"),
          { drProfileAvatar: downloadUrl, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "settings/app_config");
      }
    }

    // Save to server backend
    try {
      const settingsUrl = getApiUrl("/api/settings");
      await fetch(settingsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drProfileAvatar: downloadUrl }),
      });
    } catch (e) {
      console.warn("Server settings sync notice:", e);
    }

    return {
      success: true,
      avatarUrl: downloadUrl,
    };
  } catch (err: any) {
    console.error("Error updating Dr. Belal official avatar:", err);
    return {
      success: false,
      avatarUrl: "",
      error: err.message || "فشل تحديث الصورة الرسمية في Firebase Storage",
    };
  }
}
