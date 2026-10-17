import React, { useState, useEffect } from "react";
import {
  Mail,
  Send,
  X,
  CheckCircle2,
  Clock,
  Building,
  User as UserIcon,
  ShoppingBag,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  FileText,
  Sparkles,
  Phone
} from "lucide-react";
import { Order, User } from "../types";

export interface SendOrderEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  clients?: User[];
  repName?: string;
  repPhone?: string;
  onSendSuccess?: (message: string) => void;
}

export const SendOrderEmailModal: React.FC<SendOrderEmailModalProps> = ({
  isOpen,
  onClose,
  order,
  clients = [],
  repName = "د. بلال القيسي",
  repPhone = "776600049",
  onSendSuccess,
}) => {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [statusForUpdate, setStatusForUpdate] = useState<"pending" | "approved" | "completed" | "cancelled">("approved");
  const [subject, setSubject] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-populate when order changes
  useEffect(() => {
    if (!order) return;

    setStatusForUpdate(order.status || "approved");

    // Look for client email in registered clients list
    const matchedClient = clients.find(
      (c) => c.id === order.clientId || c.name === order.clientName || (order.entityName && c.entityName === order.entityName)
    );

    const email = (order as any).clientEmail || matchedClient?.email || "";
    setRecipientEmail(email);
    setCustomNotes("");
    setErrorMsg("");
  }, [order, clients]);

  // Status Arabic labels and badge styles
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "approved":
        return {
          label: "مقبول ومؤكد (جاري التجهيز للتوريد)",
          badgeBg: "bg-cyan-100 text-cyan-800 border-cyan-200",
          summaryText: "تم قبول وتأكيد طلبيتكم الطبية بنجاح وجاري تجهيز الأصناف المطلوبة لتسليمها بأسرع وقت.",
        };
      case "completed":
        return {
          label: "تم التوصيل والتسليم بنجاح",
          badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
          summaryText: "تم تسليم طلبيتكم الطبية بالكامل واعتماد السند واستلام الكميات.",
        };
      case "cancelled":
        return {
          label: "ملغي",
          badgeBg: "bg-rose-100 text-rose-800 border-rose-200",
          summaryText: "تم إلغاء الطلبية، يرجى التواصل مع المندوب لمزيد من التفاصيل.",
        };
      case "pending":
      default:
        return {
          label: "قيد المراجعة والتدقيق",
          badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
          summaryText: "طلبيتكم الطبية مسجلة وقيد المراجعة والتدقيق من قبل المندوب الطبي.",
        };
    }
  };

  const statusInfo = getStatusInfo(statusForUpdate);

  // Update subject when status or order changes
  useEffect(() => {
    if (!order) return;
    const shortId = order.id ? order.id.slice(-6) : "---";
    const statusLabel = getStatusInfo(statusForUpdate).label;
    setSubject(`تحديث بخصوص طلبيتكم رقم #${shortId} (${statusLabel}) - مندوبك الطبي`);
  }, [order, statusForUpdate]);

  if (!isOpen || !order) return null;

  // Generate Email Body
  const generateEmailBodyText = (): string => {
    const totalQty = order.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const dateFormatted = new Date(order.createdAt || Date.now()).toLocaleString("ar-YE");

    const itemsListText = order.items
      .map((item, idx) => `  ${idx + 1}. ${item.productName} — الكمية: ${item.quantity}`)
      .join("\n");

    return `تحية طيبة،\nالسادة / ${order.entityName || order.clientName}\nعناية: ${order.clientName}\n\nنود إفادتكم بآخر تحديث لطلبيتكم الطبية المسجلة في تطبيق "مندوبك الطبي":\n\n📌 تفاصيل الطلب:\n• رقم الطلبية: #${order.id}\n• تاريخ الإرسال: ${dateFormatted}\n• الحالة الحالية: [ ${statusInfo.label} ]\n• ملاحظة الحالة: ${statusInfo.summaryText}\n${customNotes ? `• ملاحظات إضافية من المندوب: ${customNotes}\n` : ""}\n📦 الأصناف المطلوبة (${order.items.length} صنف - مجموع الكمية: ${totalQty}):\n${itemsListText}\n\nلأي استفسار أو تنسيق إضافي، يسعدنا تواصلكم المباشر مع المندوب الطبي:\n• المندوب: ${repName}\n• هاتف / واتساب: ${repPhone}\n\nمع خالص الشكر والتقدير،\nفريق مندوبك الطبي - منظومة التوريد الدوائي المعتمدة.`;
  };

  const fullEmailBody = generateEmailBodyText();

  // 1. Direct Mailto link launcher
  const handleOpenMailClient = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullEmailBody)}`;
    window.location.href = mailtoUrl;
    if (onSendSuccess) {
      onSendSuccess("تم فتح تطبيق البريد لإرسال الإشعار للعميل 📧✓");
    }
  };

  // 2. Server API Send / Log
  const handleSendViaApi = async () => {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      setErrorMsg("يرجى إدخال عنوان بريد إلكتروني صالح للعميل (مثال: pharmacy@example.com)");
      return;
    }

    setIsSending(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/orders/${order.id}/email-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail,
          recipientName: order.clientName,
          entityName: order.entityName,
          status: statusForUpdate,
          subject,
          message: fullEmailBody,
          repName,
          repPhone,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        if (onSendSuccess) {
          onSendSuccess(`تم إرسال إشعار التحديث بالبريد بنجاح إلى: ${recipientEmail} ✉️✓`);
        }
        onClose();
      } else {
        // Fallback to mail client if SMTP backend is unconfigured
        setErrorMsg(data.error || "تعذر الإرسال المباشر عبر السيرفر. يمكنك الضغط على 'فتح في تطبيق البريد' لإرسالها فوراً.");
      }
    } catch (err: any) {
      setErrorMsg("تعذر الاتصال بخادم البريد. يمكنك استخدام خيار 'فتح في تطبيق البريد'.");
    } finally {
      setIsSending(false);
    }
  };

  // Copy text to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(fullEmailBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-right dir-rtl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-linear-to-r from-teal-50/70 via-cyan-50/50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <Mail className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <span>إرسال تحديث بالبريد الإلكتروني للعميل</span>
                <span className="text-3xs font-mono px-2 py-0.5 rounded-full bg-teal-100/70 text-teal-800 border border-teal-200/60 font-bold">
                  طلب #{order.id.slice(-6)}
                </span>
              </h2>
              <p className="text-2xs sm:text-xs text-slate-500 font-medium">
                إشعار فوري للعميل بحالة الطلبية وتفاصيل الأصناف المعتمدة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-2xs animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Customer & Order Summary Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-teal-600" />
                <span className="font-black text-slate-900">{order.entityName || "المنشأة الطبية"}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 font-bold">{order.clientName}</span>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-3xs font-bold border ${statusInfo.badgeBg}`}>
                <CheckCircle2 className="h-3 w-3" />
                <span>{statusInfo.label}</span>
              </span>
            </div>

            <div className="flex items-center gap-3 text-3xs text-slate-500 font-mono">
              <span>عدد الأصناف: {order.items.length}</span>
              <span>•</span>
              <span>مجموع الكميات: {order.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} وحدة</span>
              <span>•</span>
              <span>التاريخ: {new Date(order.createdAt).toLocaleDateString("ar-YE")}</span>
            </div>
          </div>

          {/* Form Controls */}
          <div className="space-y-3.5">
            {/* Recipient Email Input */}
            <div>
              <label className="block text-2xs font-bold text-slate-700 mb-1.5">
                البريد الإلكتروني للعميل (المستلم): <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  dir="ltr"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="pharmacy@example.com"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 pl-9 text-xs font-mono focus:border-teal-600 focus:outline-hidden focus:ring-2 focus:ring-teal-600/20 text-left"
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
              <p className="text-3xs text-slate-400 mt-1">
                يتم جلب البريد تلقائياً من سجل الصيدلية أو حسابه المعتمد، ويمكنك تعديله يدوياً.
              </p>
            </div>

            {/* Status Selector */}
            <div>
              <label className="block text-2xs font-bold text-slate-700 mb-1.5">
                حالة الطلب المراد إشعار العميل بها:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { key: "pending", label: "معلق ⏳", bg: "hover:border-amber-400", active: "border-amber-500 bg-amber-50 text-amber-900 font-bold" },
                    { key: "approved", label: "مقبول ومؤكد ✓", bg: "hover:border-cyan-400", active: "border-cyan-500 bg-cyan-50 text-cyan-900 font-bold" },
                    { key: "completed", label: "تم التسليم 📦", bg: "hover:border-emerald-400", active: "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold" },
                    { key: "cancelled", label: "ملغي ✕", bg: "hover:border-rose-400", active: "border-rose-500 bg-rose-50 text-rose-900 font-bold" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStatusForUpdate(s.key)}
                    className={`p-2 rounded-xl border text-2xs text-center transition-all cursor-pointer ${
                      statusForUpdate === s.key ? s.active : `border-slate-200 bg-white text-slate-700 ${s.bg}`
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Line */}
            <div>
              <label className="block text-2xs font-bold text-slate-700 mb-1.5">
                عنوان رسالة البريد (Subject):
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 focus:border-teal-600 focus:outline-hidden focus:ring-2 focus:ring-teal-600/20"
              />
            </div>

            {/* Custom Representative Note */}
            <div>
              <label className="block text-2xs font-bold text-slate-700 mb-1.5">
                ملاحظة إضافية من المندوب (اختياري):
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="مثال: سيتم التوصيل غداً في الفترة الصباحية مع هدية البونص..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs focus:border-teal-600 focus:outline-hidden focus:ring-2 focus:ring-teal-600/20"
              />
            </div>

            {/* Full Email Message Preview */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-2xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-teal-600" />
                  <span>معاينة نص الإيميل الجاهز للإرسال:</span>
                </label>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-3xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? "تم النسخ بنجاح ✓" : "نسخ النص"}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={7}
                value={fullEmailBody}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-3xs font-mono leading-relaxed text-slate-700 focus:outline-hidden resize-none select-all"
              />
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2.5 shrink-0">
          <div className="text-3xs text-slate-500 font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>يتضمن الإشعار شعار مندوبك الطبي وتفاصيل المندوب د. بلال القيسي</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleOpenMailClient}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              title="فتح تطبيق Gmail أو برنامج البريد الافتراضي على هاتفك لإرسال الرسالة فوراً"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>فتح في تطبيق البريد (Gmail)</span>
            </button>

            <button
              type="button"
              disabled={isSending}
              onClick={handleSendViaApi}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-4 py-2 text-xs font-black shadow-md shadow-teal-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري الإرسال...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>إرسال إشعار فوري 🚀</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
