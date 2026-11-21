import { auth } from "../firebase";
import { getApiUrl } from "./apiConfig";
import {
  ApiLogLevel,
  logApiNetworkError,
  logApiResponse,
  parseRequestBodyForLog,
} from "./apiLogger";

function resolveRequestUrl(url: RequestInfo | URL): string {
  if (typeof url === "string") return url.startsWith("/api/") || url === "/api" ? getApiUrl(url) : url;
  if (url instanceof URL) return url.toString();
  if (url && typeof (url as Request).url === "string") return (url as Request).url;
  return String(url);
}

export interface AuthenticatedRequestInit extends RequestInit {
  silentNetworkLog?: boolean;
}

function isJwtExpired(token: string, skewSeconds = 30): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    if (typeof payload?.exp !== "number") return false;
    return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}

interface CachedResponseSnapshot {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: ArrayBuffer;
  cachedAt: number;
}

const GET_MICRO_CACHE_TTL_MS = 4000;
const inFlightGetSnapshots = new Map<string, Promise<CachedResponseSnapshot>>();
const recentGetSnapshots = new Map<string, CachedResponseSnapshot>();
let rateLimitCooldownUntil = 0;

function snapshotToResponse(snap: CachedResponseSnapshot): Response {
  return new Response(snap.body.slice(0), {
    status: snap.status,
    statusText: snap.statusText,
    headers: snap.headers,
  });
}

function parseRetryAfterMs(headerVal: string | null): number {
  if (!headerVal) return 12000;
  const seconds = Number(headerVal);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return Math.min(30000, Math.max(5000, seconds * 1000));
  }
  const targetTs = Date.parse(headerVal);
  if (!Number.isNaN(targetTs)) {
    const diff = targetTs - Date.now();
    if (diff > 0) return Math.min(30000, Math.max(5000, diff));
  }
  return 12000;
}

function raceWithAbortSignal<T>(promise: Promise<T>, signal?: AbortSignal | null): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (val) => {
        signal.removeEventListener("abort", onAbort);
        resolve(val);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      }
    );
  });
}

export const authenticatedFetch = async (
  url: RequestInfo | URL,
  options: AuthenticatedRequestInit = {}
): Promise<Response> => {
  const { silentNetworkLog, ...fetchOptions } = options;
  let idToken: string | null = null;

  if (auth?.currentUser && !auth.currentUser.isAnonymous) {
    try {
      idToken = await auth.currentUser.getIdToken();
      if (idToken) localStorage.setItem("mandoubak_id_token", idToken);
    } catch {
      // Ignore silent token refresh failure
    }
  } else {
    const storedToken = localStorage.getItem("mandoubak_id_token");
    if (storedToken) {
      if (isJwtExpired(storedToken)) {
        localStorage.removeItem("mandoubak_id_token");
      } else {
        idToken = storedToken;
      }
    }
  }

  const isFormData = typeof FormData !== "undefined" && fetchOptions.body instanceof FormData;
  const buildHeaders = (token: string | null): Record<string, string> => {
    const baseHeaders: Record<string, string> = {
      ...((fetchOptions.headers as Record<string, string>) || {}),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    };
    if (token) {
      baseHeaders.Authorization = `Bearer ${token}`;
    } else if (baseHeaders.Authorization) {
      delete baseHeaders.Authorization;
    }
    return baseHeaders;
  };

  const method = (
    fetchOptions.method ||
    (typeof Request !== "undefined" && url instanceof Request ? url.method : "GET")
  ).toUpperCase();
  const isReadMethod = method === "GET" || method === "HEAD";
  const urlStr = resolveRequestUrl(url);
  const targetInput: RequestInfo | URL = typeof url === "string" ? urlStr : url;
  const requestPayload = parseRequestBodyForLog(fetchOptions.body);
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const dedupeKey = `${method}:${urlStr}:${idToken ? idToken.slice(-12) : "anon"}`;

  // Any write operation invalidates short-lived GET micro-cache
  if (!isReadMethod) {
    recentGetSnapshots.clear();
  }

  // Serve from short-lived micro-cache on bursty duplicate GETs (unless cache: "no-store")
  if (isReadMethod && typeof url === "string" && fetchOptions.cache !== "no-store") {
    const cached = recentGetSnapshots.get(dedupeKey);
    if (cached && Date.now() - cached.cachedAt < GET_MICRO_CACHE_TTL_MS) {
      return snapshotToResponse(cached);
    }
    if (cached) {
      recentGetSnapshots.delete(dedupeKey);
    }
  }

  // If upstream proxy recently returned 429 Rate exceeded, pause background/silent bursts gracefully
  if (Date.now() < rateLimitCooldownUntil && (silentNetworkLog || isReadMethod)) {
    return new Response(JSON.stringify({ error: "Rate limit cooldown active" }), {
      status: 429,
      statusText: "Too Many Requests",
      headers: { "Content-Type": "application/json" },
    });
  }

  const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;
  const isAbortedSignal = Boolean(fetchOptions.signal && fetchOptions.signal.aborted);

  // Deduplicate concurrent identical GET/HEAD requests (e.g., StrictMode double-mounts)
  if (isReadMethod && typeof url === "string" && !isAbortedSignal) {
    const existingInFlight = inFlightGetSnapshots.get(dedupeKey);
    if (existingInFlight) {
      const snap = await raceWithAbortSignal(existingInFlight, fetchOptions.signal);
      return snapshotToResponse(snap);
    }
  }

  const executeNetworkFetch = async (token: string | null): Promise<Response> => {
    // Strip caller abort signal when sharing an in-flight GET so one unmount doesn't abort another caller
    const { signal: _ignoredSignal, ...sharedFetchOptions } = fetchOptions;
    const initToUse =
      isReadMethod && typeof url === "string"
        ? { ...sharedFetchOptions, headers: buildHeaders(token) }
        : { ...fetchOptions, headers: buildHeaders(token) };

    try {
      return await fetch(targetInput, initToUse);
    } catch (networkErr) {
      const errName = networkErr instanceof Error ? networkErr.name : "";
      const shouldRetryGet =
        method === "GET" &&
        isOnline &&
        !isAbortedSignal &&
        errName !== "AbortError" &&
        !(fetchOptions.signal && fetchOptions.signal.aborted);

      if (shouldRetryGet) {
        await new Promise((r) => setTimeout(r, 450));
        return await fetch(targetInput, initToUse);
      }
      throw networkErr;
    }
  };

  let response: Response;
  if (isReadMethod && typeof url === "string" && !isAbortedSignal) {
    const sharedPromise = (async (): Promise<CachedResponseSnapshot> => {
      let res = await executeNetworkFetch(idToken);
      if (
        (res.status === 401 || res.status === 403) &&
        auth?.currentUser &&
        !auth.currentUser.isAnonymous
      ) {
        try {
          const refreshedToken = await auth.currentUser.getIdToken(true);
          if (refreshedToken && refreshedToken !== idToken) {
            idToken = refreshedToken;
            localStorage.setItem("mandoubak_id_token", refreshedToken);
            res = await executeNetworkFetch(refreshedToken);
          }
        } catch {
          // Ignore refresh failure
        }
      }

      const body = method === "HEAD" ? new ArrayBuffer(0) : await res.arrayBuffer();
      const snap: CachedResponseSnapshot = {
        status: res.status,
        statusText: res.statusText,
        headers: Array.from(res.headers.entries()),
        body,
        cachedAt: Date.now(),
      };
      if (res.ok && fetchOptions.cache !== "no-store") {
        recentGetSnapshots.set(dedupeKey, snap);
      }
      return snap;
    })().finally(() => {
      if (inFlightGetSnapshots.get(dedupeKey) === sharedPromise) {
        inFlightGetSnapshots.delete(dedupeKey);
      }
    });

    inFlightGetSnapshots.set(dedupeKey, sharedPromise);

    try {
      const snap = await raceWithAbortSignal(sharedPromise, fetchOptions.signal);
      response = snapshotToResponse(snap);
    } catch (err) {
      const durationMs =
        (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
      logApiNetworkError({
        url: urlStr,
        method,
        error: err,
        durationMs,
        requestPayload,
        levelOverride: silentNetworkLog || !isOnline ? ApiLogLevel.WARN : undefined,
      });
      throw err;
    }
  } else {
    try {
      response = await executeNetworkFetch(idToken);
    } catch (networkErr) {
      const durationMs =
        (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
      logApiNetworkError({
        url: urlStr,
        method,
        error: networkErr,
        durationMs,
        requestPayload,
        levelOverride: silentNetworkLog || !isOnline ? ApiLogLevel.WARN : undefined,
      });
      throw networkErr;
    }

    if (
      (response.status === 401 || response.status === 403) &&
      auth?.currentUser &&
      !auth.currentUser.isAnonymous
    ) {
      try {
        const refreshedToken = await auth.currentUser.getIdToken(true);
        if (refreshedToken && refreshedToken !== idToken) {
          idToken = refreshedToken;
          localStorage.setItem("mandoubak_id_token", refreshedToken);
          response = await executeNetworkFetch(refreshedToken);
        }
      } catch {
        // Ignore refresh failure and proceed
      }
    }
  }

  if (response.status === 429) {
    const cooldownMs = parseRetryAfterMs(response.headers.get("Retry-After"));
    rateLimitCooldownUntil = Math.max(rateLimitCooldownUntil, Date.now() + cooldownMs);
  }

  const durationMs =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
  const isAuthErr = response.status === 401 || response.status === 403;
  const isRateLimited = response.status === 429;
  await logApiResponse({
    url: urlStr,
    method,
    response,
    durationMs,
    requestPayload,
    levelOverride:
      (silentNetworkLog || isRateLimited) && !response.ok ? ApiLogLevel.WARN : undefined,
  });

  if (isAuthErr) {
    if (idToken) {
      localStorage.removeItem("mandoubak_id_token");
      if (!silentNetworkLog) {
        throw new Error("Unauthorized");
      }
    }
  }

  return response;
};
