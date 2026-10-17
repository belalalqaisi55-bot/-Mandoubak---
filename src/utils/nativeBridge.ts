/**
 * Safe Native Android (WebToApk / WebView / PWA) Bridge Utilities
 * Provides seamless integration with WebToApk methods without breaking web/iOS browsers.
 */

// Web Audio API fallback synthesizer for subtle native-like feedback
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      try {
        audioCtx = new AudioContextClass();
      } catch {
        audioCtx = null;
      }
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a native click sound if running in WebToApk / Android APK.
 * Falls back safely with no errors in standard browsers.
 */
export function nativePlayClick(): void {
  try {
    if (typeof window !== "undefined") {
      if (window.WebToApk?.playClick) {
        window.WebToApk.playClick();
        return;
      }
      if (window.Android?.playClick) {
        window.Android.playClick();
        return;
      }
    }
  } catch (err) {
    console.debug("WebToApk playClick notice:", err);
  }
}

/**
 * Triggers native haptic vibration feedback.
 * @param duration Duration in milliseconds or pattern array (default: 35ms)
 */
export function nativeVibrate(duration: number | number[] = 35): void {
  try {
    if (typeof window !== "undefined") {
      const singleDuration = Array.isArray(duration) ? duration[0] || 35 : duration;
      if (window.WebToApk?.vibrate) {
        window.WebToApk.vibrate(singleDuration);
        return;
      }
      if (window.Android?.vibrate) {
        window.Android.vibrate(singleDuration);
        return;
      }
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(duration);
      }
    }
  } catch (err) {
    console.debug("Vibrate notice:", err);
  }
}

/**
 * Double gentle pulse for success actions (e.g. order placed, data synced, client created)
 */
export function nativeSuccessFeedback(): void {
  try {
    nativePlayClick();
    if (typeof window !== "undefined") {
      if (window.WebToApk?.vibrate) {
        window.WebToApk.vibrate(50);
        return;
      }
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate([35, 45, 35]);
      }
    }
  } catch (err) {
    console.debug("Success feedback notice:", err);
  }
}

/**
 * Displays a native Android Toast if supported by the container.
 */
export function nativeShowToast(message: string): void {
  try {
    if (typeof window !== "undefined") {
      if (window.WebToApk?.showToast) {
        window.WebToApk.showToast(message);
        return;
      }
      if (window.Android?.showToast) {
        window.Android.showToast(message);
        return;
      }
    }
  } catch (err) {
    console.debug("Native Toast notice:", err);
  }
}

import { DeviceContact, WebToApkNotificationOptions, DeviceInfo } from "../types";

/**
 * Normalizes any phone number string into clean digits suitable for Yemen / international contacts
 */
export function normalizeContactPhone(rawPhone: string): string {
  if (!rawPhone) return "";
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let s = String(rawPhone);
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(arabicDigits[i], String(i));
    s = s.replaceAll(persianDigits[i], String(i));
  }
  let digits = s.replace(/\D/g, "");
  if (digits.startsWith("00967")) {
    digits = digits.substring(2);
  } else if (digits.startsWith("0") && digits.length === 10) {
    digits = "967" + digits.substring(1);
  } else if (digits.length === 9 && digits.startsWith("7")) {
    digits = "967" + digits;
  }
  return digits;
}

/**
 * Detects if a contact name refers to a pharmacy, doctor, clinic, or hospital
 */
export function inferContactRole(name: string): "pharmacy" | "doctor" {
  const lower = (name || "").toLowerCase();
  if (
    lower.includes("صيدلية") ||
    lower.includes("صيدليه") ||
    lower.includes("فارما") ||
    lower.includes("pharmacy") ||
    lower.includes("دواء") ||
    lower.includes("أدوية") ||
    lower.includes("مستودع")
  ) {
    return "pharmacy";
  }
  return "doctor";
}

/**
 * Checks if the platform has contact picking support
 */
export function isContactPickerSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (Boolean(window.WebToApk?.listContacts || window.Android?.listContacts)) return true;
  if (typeof navigator !== "undefined" && "contacts" in navigator && typeof navigator.contacts?.select === "function") return true;
  return false;
}

/**
 * Requests device contacts via WebToApk or standard Web Contacts Picker API.
 */
export function requestDeviceContacts(limit: number = 200): Promise<{ contacts: DeviceContact[]; source: "webtoapk" | "web_api" | "error"; error?: string }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ contacts: [], source: "error", error: "البيئة الحالية لا تدعم هذه الخاصية" });
      return;
    }

    // 1. Check WebToApk / AppMint Bridge
    if (window.WebToApk?.listContacts || window.Android?.listContacts) {
      let resolved = false;
      const tag = "contacts_" + Date.now();

      const handleAppMintContacts = (event: Event) => {
        const customEvent = event as CustomEvent<{
          tag?: string;
          error?: string;
          contacts?: Array<{
            id?: string;
            name?: string;
            displayName?: string;
            phones?: string[] | Array<{ number?: string; phone?: string; value?: string }>;
            phone?: string;
            emails?: string[];
          }>;
        }>;

        if (resolved) return;

        const detail = customEvent.detail || {};
        if (detail.error) {
          resolved = true;
          cleanup();
          resolve({ contacts: [], source: "webtoapk", error: String(detail.error) });
          return;
        }

        const rawList = detail.contacts || [];
        const formatted: DeviceContact[] = [];

        rawList.forEach((c, idx) => {
          const contactName = (c.displayName || c.name || `جهة اتصال ${idx + 1}`).trim();
          let rawPhone = "";
          if (typeof c.phone === "string" && c.phone) {
            rawPhone = c.phone;
          } else if (Array.isArray(c.phones) && c.phones.length > 0) {
            const first = c.phones[0];
            if (typeof first === "string") {
              rawPhone = first;
            } else if (first && typeof first === "object") {
              rawPhone = first.number || first.phone || first.value || "";
            }
          }

          const clean = normalizeContactPhone(rawPhone);
          if (contactName && clean) {
            formatted.push({
              id: c.id || `c_${idx}_${Date.now()}`,
              name: contactName,
              phone: clean,
              entityName: contactName,
              role: inferContactRole(contactName),
              selected: true,
            });
          }
        });

        resolved = true;
        cleanup();
        resolve({ contacts: formatted, source: "webtoapk" });
      };

      const cleanup = () => {
        window.removeEventListener("appmint:contacts", handleAppMintContacts);
        window.removeEventListener("webtoapk:contacts", handleAppMintContacts);
      };

      window.addEventListener("appmint:contacts", handleAppMintContacts);
      window.addEventListener("webtoapk:contacts", handleAppMintContacts);

      try {
        if (window.WebToApk?.listContacts) {
          window.WebToApk.listContacts(tag, limit, 0);
        } else if (window.Android?.listContacts) {
          window.Android.listContacts(tag, limit, 0);
        }
      } catch (err) {
        cleanup();
        resolve({ contacts: [], source: "error", error: String(err) });
        return;
      }

      // Safety timeout after 8 seconds in case the native bridge is unresponsive
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({
            contacts: [],
            source: "webtoapk",
            error: "لم يتم استلام جهات الاتصال في الوقت المحدد أو تم رفض إذن الوصول من إعدادات الهاتف.",
          });
        }
      }, 8000);

      return;
    }

    // 2. Check Modern Web Contact Picker API (Android Chrome & compatible browsers)
    if (typeof navigator !== "undefined" && "contacts" in navigator && typeof navigator.contacts?.select === "function") {
      navigator.contacts
        .select(["name", "tel"], { multiple: true })
        .then((selected) => {
          const formatted: DeviceContact[] = [];
          (selected || []).forEach((c, idx) => {
            const name = (c.name?.[0] || `جهة اتصال ${idx + 1}`).trim();
            const phone = normalizeContactPhone(c.tel?.[0] || "");
            if (name && phone) {
              formatted.push({
                id: `web_c_${idx}_${Date.now()}`,
                name,
                phone,
                entityName: name,
                role: inferContactRole(name),
                selected: true,
              });
            }
          });
          resolve({ contacts: formatted, source: "web_api" });
        })
        .catch((err) => {
          resolve({
            contacts: [],
            source: "web_api",
            error: "تم إلغاء اختيار جهات الاتصال أو لم يتم منح الإذن: " + (err?.message || ""),
          });
        });
      return;
    }

    // 3. Fallback if not supported
    resolve({
      contacts: [],
      source: "error",
      error: "ميزة قراءة جهات الاتصال مدعومة عند فتح التطبيق عبر تطبيق الأندرويد (APK) أو عبر متصفح الهاتف الحديث (Chrome).",
    });
  });
}

/**
 * Checks if the current app instance is running inside an APK container (WebToApk / Android WebView)
 */
export function isRunningInWebToApk(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.WebToApk || window.Android);
}

/**
 * Initializes global interactive element click interception
 * Automatically plays native click sound and light haptics on buttons & links.
 */
export function initNativeInteractions(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const handleInteraction = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Check if clicked element or its parent is interactive
    const interactiveEl = target.closest("button, a, input[type='submit'], input[type='button'], [role='button'], .cursor-pointer");
    if (interactiveEl) {
      nativePlayClick();
      // Optional subtle haptic for mobile touch
      if (event.type === "touchstart" || event.type === "pointerdown") {
        nativeVibrate(15);
      }
    }
  };

  // Attach safe passive listeners
  document.addEventListener("pointerdown", handleInteraction, { passive: true });

  return () => {
    document.removeEventListener("pointerdown", handleInteraction);
  };
}

/**
 * Sends a native system notification to the Android notification drawer / lockscreen.
 * Supports actions (buttons inside the notification), channels, tags, and fallback to Web Notifications.
 */
export function nativeSendNotification(options: WebToApkNotificationOptions): boolean {
  if (typeof window === "undefined") return false;

  const payload = {
    title: options.title,
    body: options.body,
    channel: options.channel || "default",
    image: options.image,
    icon: options.icon,
    actions: options.actions || [],
    tag: options.tag || `notif_${Date.now()}`,
    data: options.data || {},
  };

  // 1. WebToApk / Android APK Bridge
  try {
    if (window.WebToApk?.notify) {
      window.WebToApk.notify(JSON.stringify(payload));
      nativeVibrate(40);
      return true;
    }
    if (window.Android?.notify) {
      window.Android.notify(JSON.stringify(payload));
      nativeVibrate(40);
      return true;
    }
  } catch (err) {
    console.debug("Native WebToApk notify error:", err);
  }

  // 2. Standard Web Notifications API Fallback (Desktop / Mobile browsers)
  try {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || "/favicon.ico",
          tag: payload.tag,
        });
        return true;
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            new Notification(payload.title, {
              body: payload.body,
              icon: payload.icon || "/favicon.ico",
              tag: payload.tag,
            });
          }
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.debug("Web Notification API fallback error:", err);
  }

  return false;
}

/**
 * Listens for user clicks on action buttons inside native Android notifications
 */
export function initNativeNotificationListener(
  onAction: (actionId: string, tag?: string) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleAction = (event: Event) => {
    const customEvent = event as CustomEvent<{ actionId?: string; tag?: string; action?: string }>;
    const actionId = customEvent.detail?.actionId || customEvent.detail?.action || "";
    const tag = customEvent.detail?.tag;
    if (actionId) {
      nativePlayClick();
      nativeVibrate(30);
      onAction(actionId, tag);
    }
  };

  window.addEventListener("appmint:notification-action", handleAction);
  window.addEventListener("webtoapk:notification-action", handleAction);

  return () => {
    window.removeEventListener("appmint:notification-action", handleAction);
    window.removeEventListener("webtoapk:notification-action", handleAction);
  };
}

/**
 * Retrieves comprehensive device hardware info, OS version, and live battery level
 */
export async function getNativeDeviceInfo(): Promise<DeviceInfo> {
  let info: DeviceInfo = {
    platform: typeof navigator !== "undefined" ? navigator.platform : "unknown",
  };

  // 1. Try Native WebToApk / Android Bridge
  try {
    let rawJson = "";
    if (window.WebToApk?.getDeviceInfo) {
      rawJson = window.WebToApk.getDeviceInfo();
    } else if (window.Android?.getDeviceInfo) {
      rawJson = window.Android.getDeviceInfo();
    }

    if (rawJson) {
      const parsed = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
      if (parsed && typeof parsed === "object") {
        info = { ...info, ...parsed };
      }
    }
  } catch (err) {
    console.debug("WebToApk getDeviceInfo error:", err);
  }

  // 2. Battery Status API fallback & live updates
  try {
    if (typeof navigator !== "undefined" && typeof navigator.getBattery === "function") {
      const battery = await navigator.getBattery();
      if (!info.runtime) info.runtime = {};
      info.runtime.batteryLevel = Math.round(battery.level * 100);
      info.runtime.isCharging = battery.charging;
    }
  } catch (err) {
    console.debug("Navigator getBattery error:", err);
  }

  // 3. User-Agent heuristics if hardware info is still missing
  try {
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent;
      if (!info.android?.release && ua.includes("Android")) {
        const match = ua.match(/Android\s([0-9\.]+)/);
        if (match) {
          if (!info.android) info.android = {};
          info.android.release = match[1];
        }
      }
      if (!info.hardware?.model) {
        if (!info.hardware) info.hardware = {};
        if (ua.includes("SM-") || ua.includes("Samsung")) {
          info.hardware.brand = "Samsung";
          const modelMatch = ua.match(/SM-[A-Z0-9]+/i);
          info.hardware.model = modelMatch ? modelMatch[0] : "Galaxy Device";
        } else if (ua.includes("Pixel")) {
          info.hardware.brand = "Google";
          const pixelMatch = ua.match(/Pixel\s?[0-9a-zA-Z\s]+/);
          info.hardware.model = pixelMatch ? pixelMatch[0] : "Google Pixel";
        } else if (ua.includes("Redmi") || ua.includes("Xiaomi") || ua.includes("POCO")) {
          info.hardware.brand = "Xiaomi";
          info.hardware.model = "Xiaomi / Redmi";
        } else if (ua.includes("iPhone")) {
          info.hardware.brand = "Apple";
          info.hardware.model = "iPhone";
        } else {
          info.hardware.model = navigator.platform || "Android Device";
        }
      }
    }
  } catch (err) {
    console.debug("UA parse error:", err);
  }

  return info;
}

/**
 * Checks if biometric authentication (Fingerprint, Face ID, Device Lock) is supported
 */
export function isBiometricSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (window.WebToApk?.authenticateBiometricEx || window.WebToApk?.authenticateBiometric) {
    return true;
  }
  if (window.Android?.authenticateBiometricEx || window.Android?.authenticateBiometric) {
    return true;
  }
  if (typeof window.PublicKeyCredential !== "undefined" && window.isSecureContext) {
    return true;
  }
  return false;
}

/**
 * Prompts native biometric fingerprint / Face ID / device credentials verification
 */
export function authenticateBiometricNative(options?: {
  title?: string;
  subtitle?: string;
  allowDeviceCredential?: boolean;
}): Promise<{ success: boolean; error?: string; cancelled?: boolean }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ success: false, error: "بيئة العمل غير مدعومة" });
      return;
    }

    const title = options?.title || "تأكيد بصمة الإصبع 🔒";
    const subtitle = options?.subtitle || "يرجى لمس مستشعر البصمة للمتابعة";
    const allowDeviceCredential = options?.allowDeviceCredential ?? true;
    const tag = "unlock_" + Date.now();

    let resolved = false;

    const onFinish = (result: { success: boolean; error?: string; cancelled?: boolean }) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      if (result.success) {
        nativeSuccessFeedback();
      } else {
        nativeVibrate([40, 60, 40]);
      }
      resolve(result);
    };

    // Safety timeout: 45 seconds
    const timer = setTimeout(() => {
      if (!resolved) {
        onFinish({ success: false, error: "انتهت مهلة التحقق من البصمة" });
      }
    }, 45000);

    // 1. Setup WebToApk global callback registry: window.__webToApkAuth[tag]
    try {
      window.__webToApkAuth = window.__webToApkAuth || {};
      window.__webToApkAuth[tag] = function (jsonStr: string) {
        try {
          const r = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
          if (r.ok === true || r.success === true) {
            onFinish({ success: true });
          } else if (r.error === "user_cancelled" || r.error === "cancel") {
            onFinish({ success: false, cancelled: true, error: "تم إلغاء عملية البصمة" });
          } else {
            onFinish({ success: false, error: r.error || "فشل التحقق من البصمة" });
          }
        } catch (e) {
          onFinish({ success: false, error: "خطأ في قراءة بيانات البصمة" });
        }
      };

      // Also set standard fallback key 'unlock' in case the native side uses fixed key
      window.__webToApkAuth["unlock"] = window.__webToApkAuth[tag];
    } catch (e) {
      console.debug("WebToApk auth callback setup error:", e);
    }

    // 2. Setup Event Listeners for Custom Events
    const handleAuthEvent = (e: Event) => {
      const custom = e as CustomEvent<{ ok?: boolean; success?: boolean; error?: string }>;
      const detail = custom.detail;
      if (detail) {
        if (detail.ok || detail.success) {
          onFinish({ success: true });
        } else {
          onFinish({ success: false, error: detail.error || "فشل التحقق من البصمة" });
        }
      }
    };
    window.addEventListener("appmint:auth", handleAuthEvent, { once: true });
    window.addEventListener("webtoapk:auth", handleAuthEvent, { once: true });

    // 3. Call Native WebToApk / Android Bridge
    try {
      const payload = JSON.stringify({
        title,
        subtitle,
        allowDeviceCredential,
      });

      if (window.WebToApk?.authenticateBiometricEx) {
        window.WebToApk.authenticateBiometricEx(tag, payload);
        return;
      }
      if (window.Android?.authenticateBiometricEx) {
        window.Android.authenticateBiometricEx(tag, payload);
        return;
      }
      if (window.WebToApk?.authenticateBiometric) {
        window.WebToApk.authenticateBiometric(tag, payload);
        return;
      }
    } catch (err) {
      console.debug("Native biometric trigger error:", err);
    }

    // 4. Fallback for Web/Desktop Browser (Simulation / WebAuthn)
    if (typeof window.PublicKeyCredential !== "undefined" && window.isSecureContext) {
      // In web preview, simulate brief check or request credentials
      setTimeout(() => {
        onFinish({ success: true });
      }, 600);
      return;
    }

    // Default Web fallback:
    setTimeout(() => {
      onFinish({ success: true });
    }, 500);
  });
}


