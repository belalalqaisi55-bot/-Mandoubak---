import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Share2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ArrowDownCircle,
  HelpCircle,
} from "lucide-react";
import { nativeVibrate, nativePlayClick, nativeSuccessFeedback } from "../utils/nativeBridge";
import { usePWAInstall } from "../hooks/usePWAInstall";

interface DownloadApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl?: string;
}

export const DownloadApkModal: React.FC<DownloadApkModalProps> = ({
  isOpen,
  onClose,
  appUrl = typeof window !== "undefined" ? window.location.origin : "https://ais-pre-oqwx6mdzcwvrhadryzbxjt-13849160368.europe-west1.run.app",
}) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, isInIframe, triggerInstall } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [installStatus, setInstallStatus] = useState<string>("");
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    nativePlayClick();
    nativeVibrate(25);
    const targetUrl = window.location.origin || appUrl;
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeInstall = async () => {
    nativePlayClick();
    nativeVibrate(40);

    if (isInIframe) {
      setInstallStatus("المتصفح يمنع التثبيت من داخل إطار المعاينة. جاري فتح التطبيق في نافذة مستقلة لتثبيته فوراً ↗");
      const targetUrl = window.location.origin || appUrl;
      window.open(targetUrl, "_blank");
      return;
    }

    setInstallStatus("جاري فتح نافذة التثبيت...");

    const outcome = await triggerInstall();
    if (outcome === "accepted") {
      nativeSuccessFeedback();
      setInstallStatus("تم قبول التثبيت بنجاح! جاري تثبيت التطبيق على جهازك 📱✓");
      setTimeout(() => {
        onClose();
      }, 2000);
    } else if (outcome === "dismissed") {
      setInstallStatus("تم إلغاء التثبيت. يمكنك المحاولة في أي وقت.");
    } else if (outcome === "iframe") {
      setInstallStatus("المتصفح يمنع التثبيت من داخل إطار المعاينة. يرجى فتح الرابط في نافذة جديدة.");
      const targetUrl = window.location.origin || appUrl;
      window.open(targetUrl, "_blank");
    } else {
      // Not triggered via beforeinstallprompt
      setInstallStatus("يرجى استخدام قائمة المتصفح (⋮) ثم الضغط على «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».");
    }
  };

  const handleDownloadDirectApk = () => {
    nativePlayClick();
    nativeVibrate(35);
    setDownloadStarted(true);
    const link = document.createElement("a");
    link.href = "/api/download/apk";
    link.setAttribute("download", "MandoubakMed-v2.4.apk");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadStarted(false), 3000);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 text-right flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 px-5 py-4 text-white flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-200 border border-white/20">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight">تثبيت تطبيق مندوبك الطبي</h2>
                <p className="text-2xs text-emerald-100 font-medium">
                  تثبيت كتطبيق هاتف رسمي مستقل (PWA) على الشاشة الرئيسية
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto">
            {/* Status notification if already running in standalone */}
            {isStandalone && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>التطبيق مُثبت ويعمل بوضع التطبيق المستقل على شاشة هاتفك بنجاح!</span>
              </div>
            )}

            {/* Alert if inside iframe (AI Studio preview) */}
            {isInIframe && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2 text-2xs animate-in fade-in">
                <div className="font-bold flex items-center gap-1.5 text-amber-900 text-xs">
                  <ExternalLink className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>تنبيه هام حول التثبيت وإنشاء الاختصار:</span>
                </div>
                <p className="leading-relaxed text-slate-700">
                  أنت تتصفح التطبيق حالياً داخل إطار المعاينة (IFrame). متصفحات الويب (Chrome و Edge و Safari) تمنع تثبيت التطبيقات أو إنشاء اختصار من داخل الإطارات الداخلية.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const targetUrl = window.location.origin || appUrl;
                    window.open(targetUrl, "_blank");
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>فتح التطبيق في نافذة مستقلة للتثبيت بنقرة واحدة ↗</span>
                </button>
              </div>
            )}

            {/* Direct PWA Install Action Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border-2 border-emerald-400/80 shadow-xs space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-3xs font-black">
                    <Sparkles className="h-3 w-3" />
                    <span>تثبيت بنقرة واحدة (One-Click Install)</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    مندوبك الطبي | Mandoubak Med
                  </h3>
                  <p className="text-3xs text-slate-600 font-medium leading-relaxed">
                    يتم تثبيت التطبيق مباشرة كأيقونة تطبيق كامل على هاتفك، يفتح بملء الشاشة، ويعمل بأقصى سرعة حتى دون اتصال بالإنترنت!
                  </p>
                </div>
                <div className="text-left shrink-0 font-mono text-3xs font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200">
                  PWA App
                </div>
              </div>

              {/* Primary Native Install Button */}
              {isInstallable ? (
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/25 active:scale-98 cursor-pointer animate-pulse"
                >
                  <ArrowDownCircle className="h-5 w-5 text-emerald-200 shrink-0" />
                  <span>اضغط هنا لتثبيت التطبيق على هاتفك فوراً 📲</span>
                </button>
              ) : isIOS ? (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-300 space-y-2">
                  <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <span>طريقة التثبيت على أجهزة iPhone / iPad (Safari):</span>
                  </div>
                  <ol className="space-y-1.5 text-3xs text-amber-950 list-decimal list-inside pr-1 leading-relaxed">
                    <li>اضغط على زر المشاركة <span className="font-bold bg-amber-200/80 px-1 py-0.5 rounded">Share ⎋</span> في شريط Safari بالأسفل.</li>
                    <li>مرر للأسفل واختر <span className="font-bold bg-amber-200/80 px-1 py-0.5 rounded">«إضافة إلى الشاشة الرئيسية» (Add to Home Screen)</span>.</li>
                    <li>اضغط «إضافة»، وسيظهر التطبيق بأيقونته الرسمية على شاشة جهازك فوراً.</li>
                  </ol>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer"
                >
                  <ArrowDownCircle className="h-5 w-5 text-emerald-200 shrink-0" />
                  <span>تثبيت التطبيق على الهاتف 📲</span>
                </button>
              )}

              {installStatus && (
                <p className="text-3xs font-bold text-center text-teal-800 bg-teal-100/70 p-2 rounded-lg border border-teal-200">
                  {installStatus}
                </p>
              )}
            </div>

            {/* Android Browser Instructions (Chrome, Vivo, Samsung, Xiaomi) */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-teal-700" />
                <span>طريقة التثبيت عبر متصفح الهاتف (Chrome / متصفح النظام):</span>
              </div>
              <ol className="space-y-1.5 text-3xs text-slate-700 list-decimal list-inside pr-1 leading-relaxed">
                <li>افتح الرابط في متصفح Google Chrome على الهاتف.</li>
                <li>انقر على قائمة المتصفح (زر النقاط الثلاث <b>⋮</b> في الزاوية العلوية).</li>
                <li>اضغط على <span className="font-bold text-teal-900 bg-teal-100 px-1.5 py-0.5 rounded">«تثبيت التطبيق» (Install app)</span> أو <span className="font-bold text-teal-900 bg-teal-100 px-1.5 py-0.5 rounded">«إضافة إلى الشاشة الرئيسية»</span>.</li>
                <li>اضغط «تثبيت»، وسيتم تنزيل الأيقونة الرسمية ويفتح التطبيق كبرنامج مستقل بدون إطار المتصفح.</li>
              </ol>
            </div>

            {/* Copy Link Section */}
            <div className="rounded-2xl border border-slate-200 p-3 space-y-2 bg-white">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-800 text-2xs">رابط فتح وتثبيت التطبيق المباشر:</div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-3xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-teal-200"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "تم النسخ!" : "نسخ الرابط"}</span>
                </button>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 font-mono text-3xs text-slate-700 select-all truncate text-left dir-ltr">
                {typeof window !== "undefined" ? window.location.origin : appUrl}
              </div>
            </div>

            {/* Direct APK Download Alternative */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleDownloadDirectApk}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-3xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>{downloadStarted ? "جاري تحضير ملف APK..." : "أو تحميل ملف حزمة أندرويد المباشر (APK File)"}</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
