import { auth } from "../firebase";
import { getApiUrl } from "./apiConfig";
import {
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

export const authenticatedFetch = async (
  url: RequestInfo | URL,
  options: RequestInit = {}
): Promise<Response> => {
  let idToken = localStorage.getItem("mandoubak_id_token");
  if (!idToken && auth?.currentUser && !auth.currentUser.isAnonymous) {
    try {
      idToken = await auth.currentUser.getIdToken();
      if (idToken) localStorage.setItem("mandoubak_id_token", idToken);
    } catch {
      // Ignore silent token refresh failure
    }
  }

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const buildHeaders = (token: string | null): Record<string, string> => ({
    ...((options.headers as Record<string, string>) || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
  });

  const method = (
    options.method ||
    (typeof Request !== "undefined" && url instanceof Request ? url.method : "GET")
  ).toUpperCase();
  const urlStr = resolveRequestUrl(url);
  const targetInput: RequestInfo | URL = typeof url === "string" ? urlStr : url;
  const requestPayload = parseRequestBodyForLog(options.body);
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();

  let response: Response;
  try {
    response = await fetch(targetInput, { ...options, headers: buildHeaders(idToken) });
  } catch (networkErr) {
    const durationMs =
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
    logApiNetworkError({
      url: urlStr,
      method,
      error: networkErr,
      durationMs,
      requestPayload,
    });
    throw networkErr;
  }

  // If token expired (401/403) and a non-anonymous Firebase user exists, refresh once and retry
  if (
    (response.status === 401 || response.status === 403) &&
    idToken &&
    auth?.currentUser &&
    !auth.currentUser.isAnonymous
  ) {
    try {
      const refreshedToken = await auth.currentUser.getIdToken(true);
      if (refreshedToken && refreshedToken !== idToken) {
        idToken = refreshedToken;
        localStorage.setItem("mandoubak_id_token", refreshedToken);
        response = await fetch(targetInput, { ...options, headers: buildHeaders(refreshedToken) });
      }
    } catch {
      // Ignore refresh failure and proceed to error logging
    }
  }

  const durationMs =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
  await logApiResponse({
    url: urlStr,
    method,
    response,
    durationMs,
    requestPayload,
  });

  if (response.status === 401 || response.status === 403) {
    if (idToken) {
      localStorage.removeItem("mandoubak_id_token");
      throw new Error("Unauthorized");
    }
  }

  return response;
};
