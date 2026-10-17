import React, { useState, useEffect } from "react";
import { Cookie, ShieldCheck, Check, Settings, X, ExternalLink, HardDrive } from "lucide-react";
import { areCookiesEnabled, isStorageAvailable, getCookieConsent, saveCookieConsent } from "../utils/cookieManager";

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [cookiesOk, setCookiesOk] = useState(true);
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    const consent = getCookieConsent();
    setCookiesOk(areCookiesEnabled());
    setStorageOk(isStorageAvailable());

    // Show banner only if user hasn't explicitly answered yet
    if (!consent.hasAnswered) {
      // Delay slightly for smooth page entrance
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    saveCookieConsent(true, false);
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    saveCookieConsent(true, true);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="إشعار ملفات تعريف الارتباط والخصوصية"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="rounded-2xl border border-teal-200/80 bg-white/95 backdrop-blur-md p-4 sm:p-5 shadow-2xl ring-1 ring-slate-900/5 text-slate-800">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
            <Cookie className="h-5 w-5" />
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span>ملفات تعريف الارتباط والذاكرة (Cookies)</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-3xs font-bold text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  <span>آمن ومشفر</span>
                </span>
              </h3>
              <button
                type="button"
                onClick={handleAcceptEssential}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
                title="إغلاق الإشعار"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-2xs sm:text-xs text-slate-600 leading-relaxed">
              يستخدم تطبيق <strong>مندوبك الطبي</strong> ملفات تعريف الارتباط (SameSite=None و Partitioned) والذاكرة الآمنة لحفظ جلستك وطلبياتك الدوائية محلياً حتى في وضع عدم الاتصال (Offline).
            </p>

            {/* Diagnostics indicators */}
            <div className="flex items-center gap-2 pt-1 text-3xs text-slate-500 font-mono">
              <span className={`inline-flex items-center gap-1 ${cookiesOk ? "text-emerald-700" : "text-amber-600 font-bold"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cookiesOk ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                الكوكيز: {cookiesOk ? "مفعلة ✓" : "وضع الذاكرة الآمنة"}
              </span>
              <span>•</span>
              <span className={`inline-flex items-center gap-1 ${storageOk ? "text-emerald-700" : "text-amber-600 font-bold"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${storageOk ? "bg-emerald-500" : "bg-amber-500"}`} />
                الذاكرة المحلية: {storageOk ? "نشطة ✓" : "ذاكرة الجلسة"}
              </span>
            </div>

            {showDetails && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-3xs text-slate-600 space-y-1.5 animate-in fade-in duration-200">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <HardDrive className="h-3 w-3 text-teal-600" />
                  <span>البيانات المحفوظة في جهازك:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 pr-1">
                  <li>معرف الجلسة وحالة تسجيل الدخول الآمن للمندوب والعملاء</li>
                  <li>كتالوج الأدوية والأسعار للعمل بدون إنترنت</li>
                  <li>مسودات الطلبيات المؤقتة في السلة حتى لا تضيع عند إغلاق التطبيق</li>
                </ul>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white px-3 py-1.5 text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>قبول ومتابعة</span>
              </button>

              <button
                type="button"
                onClick={handleAcceptEssential}
                className="inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer"
              >
                <span>الضرورية فقط</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-3xs text-teal-700 hover:text-teal-900 font-bold underline px-1 py-1"
              >
                {showDetails ? "إخفاء التفاصيل" : "تفاصيل الخصوصية"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
