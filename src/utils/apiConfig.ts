/**
 * Central API configuration and automatic routing for Mandoubak Med.
 * Ensures that when the application runs as a native Android APK (Capacitor / Cordova / WebView)
 * or as a standalone app, all /api/* calls are routed directly to the production backend server.
 */

export const OFFICIAL_APP_URL = "https://ais-pre-oqwx6mdzcwvrhadryzbxjt-13849160368.europe-west1.run.app";

export const BACKEND_URL = typeof window !== "undefined" && window.location && window.location.origin && !window.location.origin.includes("localhost")
  ? window.location.origin
  : OFFICIAL_APP_URL;

export function isNativeOrApkEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const { protocol, hostname, port } = window.location;

  // Detect Android WebView / Capacitor / Cordova / file protocol
  if (protocol === "file:" || protocol.includes("capacitor") || protocol.includes("ionic")) {
    return true;
  }

  // Capacitor native platform check
  if ((window as any).Capacitor?.isNativePlatform?.() || (window as any).Capacitor?.isPluginAvailable?.("App")) {
    return true;
  }

  // Capacitor on Android serves from http://localhost or https://localhost (port is empty / 80 / 443, not 3000)
  if ((hostname === "localhost" || hostname === "127.0.0.1") && port !== "3000") {
    return true;
  }

  return false;
}

export function getApiUrl(endpoint: string): string {
  const cleanPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (isNativeOrApkEnvironment()) {
    let customBase = "";
    try {
      customBase = localStorage.getItem("mandoubak_api_base")?.trim() || "";
    } catch (_) {}
    const base = customBase || BACKEND_URL;
    return `${base.replace(/\/+$/, "")}${cleanPath}`;
  }

  return cleanPath;
}

/**
 * Initializes global fetch interception so that all existing fetch('/api/...') calls
 * in every component automatically use the live backend when running on an Android APK.
 * Safely guards against non-writable/getter-only window.fetch properties in browser iframes.
 */
export function initGlobalApiProxy(): void {
  if (typeof window === "undefined" || (window as any).__MANDOUBAK_API_INITIALIZED__) {
    return;
  }
  (window as any).__MANDOUBAK_API_INITIALIZED__ = true;

  // Only activate fetch interception if running in native APK/Android environment or with custom base URL
  let hasCustomBase = false;
  try {
    hasCustomBase = Boolean(localStorage.getItem("mandoubak_api_base")?.trim());
  } catch (_) {}
  if (!isNativeOrApkEnvironment() && !hasCustomBase) {
    return;
  }

  try {
    const originalFetch = window.fetch ? window.fetch.bind(window) : undefined;
    if (!originalFetch) {
      return;
    }

    const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      try {
        let urlStr = "";
        if (typeof input === "string") {
          urlStr = input;
        } else if (input instanceof URL) {
          urlStr = input.toString();
        } else if (input && typeof (input as any).url === "string") {
          urlStr = (input as any).url;
        }

        if (urlStr && (urlStr.startsWith("/api/") || urlStr === "/api")) {
          const resolvedUrl = getApiUrl(urlStr);

          if (resolvedUrl !== urlStr) {
            if (typeof input === "string") {
              return originalFetch(resolvedUrl, init);
            } else if (input instanceof URL) {
              return originalFetch(new URL(resolvedUrl), init);
            } else {
              return originalFetch(new Request(resolvedUrl, input), init);
            }
          }
        }
      } catch (e) {
        console.warn("API proxy fetch interceptor error, falling back to original fetch:", e);
      }

      return originalFetch(input, init);
    };

    // Safely define property to prevent "Cannot set property fetch of #<Window> which has only a getter"
    try {
      Object.defineProperty(window, "fetch", {
        value: customFetch,
        writable: true,
        configurable: true,
      });
    } catch (defineErr) {
      try {
        (window as any).fetch = customFetch;
      } catch (assignErr) {
        console.warn("Could not patch window.fetch directly:", assignErr);
      }
    }
  } catch (err) {
    console.warn("initGlobalApiProxy failed gracefully:", err);
  }
}
