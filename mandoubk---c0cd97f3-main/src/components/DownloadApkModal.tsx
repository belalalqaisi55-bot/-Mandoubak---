import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Download,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
  Share2,
  QrCode
} from "lucide-react";
import { nativeVibrate, nativePlayClick } from "../utils/nativeBridge";

interface DownloadApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl?: string;
}

export const DownloadApkModal: React.FC<DownloadApkModalProps> = ({
  isOpen,
  onClose,
  appUrl = "https://ais-pre-oqwx6mdzcwvrhadryzbxjt-13849160368.europe-west1.run.app",
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    nativePlayClick();
    nativeVibrate(25);
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    nativePlayClick();
    nativeVibrate(35);
    setDownloadStarted(true);

    // Trigger direct APK download route or generate dynamic android installation package
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
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 text-right flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 px-5 py-4 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-200 border border-white/20">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight">تثبيت تطبيق مندوبك الطبي</h2>
                <p className="text-2xs text-emerald-100 font-medium">
                  تثبيت فوري على شاشة الهاتف (بدون ملفات APK معقدة)
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

          {/* Content */}
          <div className="p-4 sm:p-5 space-y-4 text-xs">
            {/* Direct Install Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border-2 border-emerald-300 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-3xs font-black">
                    <span>تثبيت التطبيق على الشاشة الرئيسية (PWA)</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900">مندوبك الطبي - Mandoubak Med v2.4</h3>
                  <p className="text-3xs text-slate-600 font-medium leading-relaxed">
                    هذا التطبيق مصمم بأحدث تقنيات الويب المتقدمة (PWA). بدلاً من ملفات APK التقليدية التي قد تتطلب صلاحيات معقدة، يمكنك تثبيته مباشرة على هاتفك (Vivo, Samsung, Xiaomi) ليصبح تطبيقاً مستقلاً تماماً على شاشتك الرئيسية ويعمل بدون إنترنت!
                  </p>
                </div>
                <div className="text-left shrink-0 font-mono text-3xs font-bold text-emerald-800 bg-emerald-100/70 px-2 py-1 rounded-lg border border-emerald-200">
                  Android & iOS
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2">
                <div className="font-bold text-slate-900 text-2xs flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-teal-700" />
                  <span>طريقة التثبيت الفوري بنقرة واحدة:</span>
                </div>
                <ol className="space-y-1.5 text-3xs text-slate-700 list-decimal list-inside pr-1 leading-relaxed">
                  <li>افتح هذا الرابط من متصفح هاتفك المحمول (مثل Chrome أو متصفح Vivo).</li>
                  <li>انقر على قائمة المتصفح (النقاط الثلاث <b>⋮</b> في أعلى اليمين أو اليسار).</li>
                  <li>اختر <span className="font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">«تثبيت التطبيق» (Install app)</span> أو <span className="font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">«إضافة إلى الشاشة الرئيسية» (Add to Home Screen)</span>.</li>
                  <li>اضغط «تثبيت»، وستظهر أيقونة التطبيق الرسمية فوراً على شاشة هاتفك مع دعم التشغيل دون إنترنت!</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-5 w-5 text-emerald-200" />
                    <span>تم نسخ رابط التثبيت بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    <span>نسخ رابط التطبيق لفتحه في متصفح الهاتف</span>
                  </>
                )}
              </button>
            </div>

            {/* Browser Shortcut Alternative */}
            <div className="rounded-2xl border border-slate-200 p-3.5 space-y-2 bg-white">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-800 text-2xs">رابط النظام الرسمي المعتمد:</div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-3xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-teal-200"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? "تم النسخ!" : "نسخ"}</span>
                </button>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 font-mono text-3xs text-slate-700 select-all truncate text-left dir-ltr">
                {appUrl}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
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
