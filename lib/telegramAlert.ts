export interface TelegramAlertOptions {
  token?: string;
  chatId?: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  disableNotification?: boolean;
  timeoutMs?: number;
}

export function isTelegramConfigured(options: Pick<TelegramAlertOptions, "token" | "chatId"> = {}): boolean {
  const token = (options.token || process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = (options.chatId || process.env.TELEGRAM_CHAT_ID || "").trim();
  return Boolean(token && chatId);
}

export async function sendTelegramAlert(message: string, options: TelegramAlertOptions = {}) {
  const token = (options.token || process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = (options.chatId || process.env.TELEGRAM_CHAT_ID || "").trim();

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN غير مضبوط في متغيرات البيئة.");
  }
  if (!chatId) {
    throw new Error("TELEGRAM_CHAT_ID غير مضبوط في متغيرات البيئة.");
  }
  const normalizedMessage = String(message ?? "").trim();
  if (!normalizedMessage) {
    throw new Error("نص الرسالة فارغ.");
  }

  // Telegram Bot API caps message text at 4096 characters
  const safeMessage =
    normalizedMessage.length > 4000
      ? `${normalizedMessage.slice(0, 3997)}...`
      : normalizedMessage;

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  const params = new URLSearchParams({
    chat_id: chatId,
    text: safeMessage,
  });

  if (options.parseMode) {
    params.set("parse_mode", options.parseMode);
  }
  if (options.disableNotification) {
    params.set("disable_notification", "true");
  }

  const timeoutMs = options.timeoutMs ?? 4500;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    signal: typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(timeoutMs)
      : undefined,
  });

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
    result?: unknown;
  };

  if (!response.ok || !data.ok) {
    throw new Error(`فشل إرسال تنبيه تيليجرام: ${data.description || response.statusText}`);
  }

  return data.result;
}

export async function notifyTelegramSafely(message: string, options: TelegramAlertOptions = {}) {
  if (!isTelegramConfigured(options)) {
    return null;
  }
  try {
    return await sendTelegramAlert(message, options);
  } catch (err: any) {
    console.warn("Telegram alert notice:", err?.message || "Failed to send Telegram alert");
    return null;
  }
}
