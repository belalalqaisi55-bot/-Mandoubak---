/**
 * Comprehensive Cookie & Storage Manager for Mandoubak Med.
 * Handles modern cookie policies: SameSite=None, Secure, Partitioned (CHIPS),
 * with resilient fallbacks for iframes, private browsing, and Android WebViews.
 */

export interface CookieOptions {
  days?: number;
  path?: string;
  secure?: boolean;
  sameSite?: "None" | "Lax" | "Strict";
  partitioned?: boolean;
}

/**
 * Checks whether the browser allows reading and writing cookies.
 */
export function areCookiesEnabled(): boolean {
  if (typeof navigator !== "undefined" && navigator.cookieEnabled !== undefined) {
    if (!navigator.cookieEnabled) return false;
  }
  if (typeof document === "undefined") return false;

  try {
    const testKey = "__cookie_test__";
    document.cookie = `${testKey}=1; path=/; SameSite=Lax`;
    const supported = document.cookie.indexOf(testKey) !== -1;
    document.cookie = `${testKey}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    return supported;
  } catch (e) {
    return false;
  }
}

/**
 * Checks whether localStorage / local site data is accessible without SecurityError.
 */
export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

// In-memory fallback dictionary for environments where cookies and localStorage are completely blocked
const memoryStore = new Map<string, string>();

/**
 * Sets a cookie with modern cross-site attributes (SameSite=None, Secure, Partitioned).
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): boolean {
  const {
    days = 365,
    path = "/",
    secure = true,
    sameSite = "None",
    partitioned = true
  } = options;

  // Always keep in-memory backup
  memoryStore.set(name, value);

  // Sync to safe storage
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(`cookie_${name}`, value);
    }
  } catch (_) {}

  if (typeof document === "undefined") return true;

  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

    let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=${path}`;

    if (secure) {
      cookieStr += "; Secure";
    }

    if (sameSite) {
      cookieStr += `; SameSite=${sameSite}`;
    }

    // Partitioned cookies (CHIPS) support for embedded iframes (Chrome 114+)
    if (partitioned && secure) {
      cookieStr += "; Partitioned";
    }

    document.cookie = cookieStr;
    return true;
  } catch (e) {
    console.warn("Document cookie write failed, using storage fallback:", e);
    return false;
  }
}

/**
 * Retrieves a cookie by name, with fallback to localStorage and memory.
 */
export function getCookie(name: string): string | null {
  if (typeof document !== "undefined") {
    try {
      const nameEQ = `${encodeURIComponent(name)}=`;
      const ca = document.cookie.split(";");
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
      }
    } catch (_) {}
  }

  // Fallback 1: Safe local storage
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const val = window.localStorage.getItem(`cookie_${name}`);
      if (val !== null) return val;
    }
  } catch (_) {}

  // Fallback 2: In-memory store
  return memoryStore.get(name) ?? null;
}

/**
 * Deletes a cookie by name across all scopes.
 */
export function deleteCookie(name: string, path: string = "/"): void {
  memoryStore.delete(name);

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(`cookie_${name}`);
    }
  } catch (_) {}

  if (typeof document !== "undefined") {
    try {
      document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=None; Secure; Partitioned`;
      document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
    } catch (_) {}
  }
}

// -------------------------------------------------------------
// USER COOKIE CONSENT & PREFERENCES
// -------------------------------------------------------------

const CONSENT_COOKIE_KEY = "mandoubak_cookie_consent_v2";

export interface CookieConsentStatus {
  hasAnswered: boolean;
  accepted: boolean;
  essentialOnly: boolean;
  acceptedAt?: string;
}

/**
 * Checks if the user has accepted cookies and local storage.
 */
export function getCookieConsent(): CookieConsentStatus {
  const val = getCookie(CONSENT_COOKIE_KEY);
  if (!val) {
    return {
      hasAnswered: false,
      accepted: true, // Default to true for essential functionality
      essentialOnly: false,
    };
  }

  try {
    const parsed = JSON.parse(val);
    return {
      hasAnswered: true,
      accepted: Boolean(parsed.accepted),
      essentialOnly: Boolean(parsed.essentialOnly),
      acceptedAt: parsed.acceptedAt,
    };
  } catch {
    return {
      hasAnswered: true,
      accepted: val === "accepted",
      essentialOnly: false,
    };
  }
}

/**
 * Saves the user's cookie consent decision.
 */
export function saveCookieConsent(accepted: boolean, essentialOnly: boolean = false): void {
  const payload = JSON.stringify({
    accepted,
    essentialOnly,
    acceptedAt: new Date().toISOString(),
  });
  setCookie(CONSENT_COOKIE_KEY, payload, { days: 365 });
}
