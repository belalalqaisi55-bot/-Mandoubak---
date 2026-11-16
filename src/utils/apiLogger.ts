export enum ApiLogLevel {
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export interface ApiRequestLogEntry {
  id: string;
  timestamp: string;
  level: ApiLogLevel;
  method: string;
  url: string;
  status: number | null;
  statusText: string;
  ok: boolean;
  durationMs: number;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string;
  failureHint?: string;
}

const STORAGE_KEY = "mandoubak_api_request_logs";
const MAX_LOG_ENTRIES = 50;
const MAX_PAYLOAD_STRING_LENGTH = 2000;
const SENSITIVE_KEYS = new Set(["password", "token", "idtoken", "authorization", "secret", "apikey"]);

let inMemoryLogs: ApiRequestLogEntry[] = [];

function loadInitialLogs(): ApiRequestLogEntry[] {
  if (inMemoryLogs.length > 0) return inMemoryLogs;
  if (typeof window === "undefined") return inMemoryLogs;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryLogs = parsed.slice(0, MAX_LOG_ENTRIES);
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return inMemoryLogs;
}

function persistLogs(logs: ApiRequestLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_LOG_ENTRIES)));
  } catch {
    // Ignore storage quota / security errors
  }
}

export function sanitizeLogPayload(value: unknown, depth = 0): unknown {
  if (value === undefined || value === null) return value;
  if (depth > 4) return "[MaxDepth]";

  if (typeof value === "string") {
    if (value.length > MAX_PAYLOAD_STRING_LENGTH) {
      return `${value.slice(0, MAX_PAYLOAD_STRING_LENGTH)}... [truncated ${value.length} chars]`;
    }
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const limited = value.slice(0, 25).map((item) => sanitizeLogPayload(item, depth + 1));
    if (value.length > 25) {
      limited.push(`... [+${value.length - 25} items]`);
    }
    return limited;
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        output[k] = "[REDACTED]";
      } else {
        output[k] = sanitizeLogPayload(v, depth + 1);
      }
    }
    return output;
  }

  return String(value);
}

export function parseRequestBodyForLog(body: BodyInit | null | undefined): unknown {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") {
    try {
      return sanitizeLogPayload(JSON.parse(body));
    } catch {
      return sanitizeLogPayload(body);
    }
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const summary: Record<string, unknown> = {};
    body.forEach((val, key) => {
      summary[key] = typeof val === "string" ? sanitizeLogPayload(val) : `[File:${val.name}]`;
    });
    return summary;
  }
  return "[Non-JSON Body]";
}

export async function extractResponsePayload(response: Response): Promise<unknown> {
  try {
    const cloned = response.clone();
    const contentType = cloned.headers.get("content-type") || "";
    const rawText = await cloned.text();
    if (!rawText) return null;

    if (contentType.includes("application/json") || rawText.trim().startsWith("{") || rawText.trim().startsWith("[")) {
      try {
        return sanitizeLogPayload(JSON.parse(rawText));
      } catch {
        return sanitizeLogPayload(rawText);
      }
    }
    return sanitizeLogPayload(rawText);
  } catch (err) {
    return `[Unable to read response payload: ${err instanceof Error ? err.message : String(err)}]`;
  }
}

function buildFailureHint(status: number | null, responsePayload: unknown, errorMessage?: string): string | undefined {
  const payloadMsg =
    responsePayload && typeof responsePayload === "object"
      ? (responsePayload as any).error || (responsePayload as any).message || (responsePayload as any).details
      : typeof responsePayload === "string"
        ? responsePayload
        : undefined;

  if (status === null) {
    return `فشل ارسال الطلب (خطأ اتصال/شبكة): ${errorMessage || "تعذر الوصول للخادم"}`;
  }
  if (status >= 200 && status < 300) {
    return undefined;
  }
  if (status === 400) {
    return `فشل ارسال الطلب (400 Bad Request): ${payloadMsg || "البيانات المرسلة غير مكتملة أو غير صالحة"}`;
  }
  if (status === 401 || status === 403) {
    return `فشل ارسال الطلب (${status} Auth Error): ${payloadMsg || "انتهت صلاحية الجلسة أو لا توجد صلاحية"}`;
  }
  if (status === 404) {
    return `فشل ارسال الطلب (404 Not Found): ${payloadMsg || "المسار أو العنصر غير موجود"}`;
  }
  if (status >= 500) {
    return `فشل ارسال الطلب (${status} Server Error): ${payloadMsg || "خطأ داخلي في الخادم"}`;
  }
  return `فشل ارسال الطلب (HTTP ${status}): ${payloadMsg || "استجابة غير ناجحة"}`;
}

export function logApiRequest(
  entry: Omit<ApiRequestLogEntry, "id" | "timestamp">
): ApiRequestLogEntry {
  const record: ApiRequestLogEntry = {
    ...entry,
    id: `api_log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  const current = loadInitialLogs();
  inMemoryLogs = [record, ...current].slice(0, MAX_LOG_ENTRIES);
  persistLogs(inMemoryLogs);

  const label = `[API ${record.method}] ${record.url} -> ${record.status ?? "NETWORK_ERROR"} (${record.durationMs}ms)`;
  if (record.level === ApiLogLevel.ERROR) {
    console.error(label, {
      status: record.status,
      statusText: record.statusText,
      failureHint: record.failureHint,
      requestPayload: record.requestPayload,
      responsePayload: record.responsePayload,
      errorMessage: record.errorMessage,
    });
  } else if (record.level === ApiLogLevel.WARN) {
    console.warn(label, {
      status: record.status,
      responsePayload: record.responsePayload,
    });
  } else {
    console.debug(label);
  }

  return record;
}

export async function logApiResponse(params: {
  url: string;
  method: string;
  response: Response;
  durationMs: number;
  requestPayload?: unknown;
}): Promise<ApiRequestLogEntry> {
  const { url, method, response, durationMs, requestPayload } = params;
  const responsePayload = !response.ok ? await extractResponsePayload(response) : undefined;
  const failureHint = buildFailureHint(response.status, responsePayload);

  return logApiRequest({
    level: response.ok ? ApiLogLevel.INFO : ApiLogLevel.ERROR,
    method: method.toUpperCase(),
    url,
    status: response.status,
    statusText: response.statusText || "",
    ok: response.ok,
    durationMs: Math.round(durationMs),
    requestPayload,
    responsePayload,
    failureHint,
  });
}

export function logApiNetworkError(params: {
  url: string;
  method: string;
  error: unknown;
  durationMs: number;
  requestPayload?: unknown;
}): ApiRequestLogEntry {
  const { url, method, error, durationMs, requestPayload } = params;
  const errorName = error instanceof Error ? error.name : "";
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isAborted =
    errorName === "AbortError" ||
    errorMessage.toLowerCase().includes("abort") ||
    errorMessage.toLowerCase().includes("timeout");
  const failureHint = buildFailureHint(null, undefined, errorMessage);

  return logApiRequest({
    level: isAborted ? ApiLogLevel.WARN : ApiLogLevel.ERROR,
    method: method.toUpperCase(),
    url,
    status: null,
    statusText: isAborted ? "ABORTED" : "NETWORK_ERROR",
    ok: false,
    durationMs: Math.round(durationMs),
    requestPayload,
    errorMessage,
    failureHint,
  });
}

export function getApiRequestLogs(): ApiRequestLogEntry[] {
  return [...loadInitialLogs()];
}

export function clearApiRequestLogs(): void {
  inMemoryLogs = [];
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
}

export function formatApiFailureSummary(entry: ApiRequestLogEntry): string {
  const statusPart = entry.status !== null ? `HTTP ${entry.status} ${entry.statusText}`.trim() : "Network Error";
  const payloadPart = entry.responsePayload !== undefined
    ? JSON.stringify(entry.responsePayload)
    : entry.errorMessage || "No response body";
  return `${entry.method} ${entry.url} | ${statusPart} | ${payloadPart}`;
}
