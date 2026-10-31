import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { QrCode, Download, Copy, Check, ExternalLink, X, Shield, Printer, Sparkles, Smartphone, Eye } from "lucide-react";

interface CVBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (message: string, type?: "success" | "error") => void;
}

export const CVBarcodeModal: React.FC<CVBarcodeModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // The permanent official shared URL or current host
  const getSecretUrl = () => {
    const origin = typeof window !== "undefined" && window.location.origin 
      ? window.location.origin 
      : "https://ais-pre-oqwx6mdzcwvrhadryzbxjt-13849160368.europe-west1.run.app";
    return `${origin}/cv/belal-cv-secret-link`;
  };

  const secretUrl = getSecretUrl();

  useEffect(() => {
    if (!isOpen) return;

    // Generate real, high-resolution scannable QR Code
    QRCode.toDataURL(
      secretUrl,
      {
        width: 600,
        margin: 2,
        color: {
          dark: "#0f172a", // slate-900 for optimal phone camera contrast
          light: "#ffffff",
        },
        errorCorrectionLevel: "H", // High error correction
      },
      (err, url) => {
        if (err) {
          console.error("QR Code generation error:", err);
        } else {
          setQrDataUrl(url);
        }
      }
    );
  }, [isOpen, secretUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(secretUrl);
    setCopied(true);
    if (showToast) showToast("تم نسخ رابط السيرة الذاتية السري بنجاح", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "باركود_السيرة_الذاتية_د_بلال_القيسي.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast("تم تنزيل صورة الباركود بجودة عالية (PNG)", "success");
  };

  const handlePrintCard = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>بطاقة باركود السيرة الذاتية - د. بلال القيسي</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; background: #fff; }
            .card { max-width: 400px; margin: 0 auto; border: 2px solid #0f766e; border-radius: 20px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            h2 { color: #0f172a; margin-bottom: 5px; font-size: 20px; }
            p { color: #475569; font-size: 13px; margin-top: 0; }
            img { width: 260px; height: 260px; margin: 15px 0; border: 1px solid #e2e8f0; border-radius: 12px; }
            .badge { background: #ccfbf1; color: #0f766e; padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 12px; display: inline-block; }
            .footer { font-size: 11px; color: #64748b; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">دكتور صيدلي | مطور مندوبك الطبي</span>
            <h2>د. بلال يحيى أحمد القيسي</h2>
            <p>امسح الباركود للاطلاع على السيرة الذاتية والدخول للتطبيق</p>
            <img src="${qrDataUrl}" alt="QR Code" />
            <div class="footer">هاتف / واتساب: +967 776 600 049</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-amber-300">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-teal-500/20 px-2.5 py-0.5 rounded-full text-3xs font-bold text-teal-200 border border-teal-500/30 mb-1">
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span>خاص بالدكتور بلال القيسي</span>
              </div>
              <h3 className="text-lg font-black text-white">باركود السيرة الذاتية (CV QR Code)</h3>
              <p className="text-xs text-teal-100/80 font-medium">امسح الباركود بكاميرا الهاتف لفتح السيرة الذاتية الذكية</p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* QR Code Display Container */}
          <div className="bg-gradient-to-b from-slate-50 to-slate-100 p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center shadow-inner">
            <div className="relative bg-white p-3 rounded-2xl border-2 border-teal-500/30 shadow-md">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="باركود السيرة الذاتية"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                  جاري توليد الباركود...
                </div>
              )}
              <div className="absolute inset-0 border-2 border-teal-500/20 rounded-2xl pointer-events-none" />
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Smartphone className="h-4 w-4 text-teal-600 animate-pulse" />
              <span>جاهز للمسح المباشر بأي كاميرا أو قارئ باركود</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handleDownloadQR}
              className="w-full inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs px-4 py-3 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>تحميل صورة الباركود (PNG)</span>
            </button>

            <button
              onClick={handlePrintCard}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-3 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="h-4 w-4 text-teal-400" />
              <span>طباعة بطاقة الباركود</span>
            </button>
          </div>

          {/* Link Box & Copy */}
          <div className="space-y-1.5">
            <label className="block text-2xs font-bold text-slate-600">
              رابط السيرة الذاتية السري والمشفر:
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-3xs font-mono text-slate-700 truncate dir-ltr select-all">
                {secretUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="shrink-0 p-2.5 bg-slate-200 hover:bg-teal-100 hover:text-teal-800 text-slate-700 rounded-xl transition-all cursor-pointer font-bold text-xs inline-flex items-center gap-1"
                title="نسخ الرابط"
              >
                {copied ? <Check className="h-4 w-4 text-teal-600" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">{copied ? "تم النسخ" : "نسخ"}</span>
              </button>
              <a
                href={secretUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl border border-teal-200 transition-all font-bold text-xs inline-flex items-center gap-1"
                title="معاينة الصفحة"
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">معاينة</span>
              </a>
            </div>
          </div>

          {/* Security & Feature explanation */}
          <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-3xs text-amber-900 leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-black text-amber-950 text-2xs">
              <Shield className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>خصوصية تامة وتحكم كامل:</span>
            </div>
            <p>
              • <strong>خاص بمن يمسح الباركود فقط:</strong> هذا الباركود والرابط السري لا يظهران لأي مستخدم عادي يدخل على التطبيق الرئيسي.
            </p>
            <p>
              • <strong>مباشر وبدون تسجيل دخول:</strong> يستطيع أي مسؤول توظيف أو دكتور أو شركة أدوية مسح الباركود ومشاهدة سيرتك الذاتية فوراً، وفي أسفل السيرة زر لدخول تطبيق مندوبك الطبي.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
