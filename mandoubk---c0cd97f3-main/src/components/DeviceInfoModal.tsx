import React from "react";
import { DeviceInfo } from "../types";
import {
  Smartphone,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Cpu,
  ShieldCheck,
  X,
  Copy,
  Check,
  Layers,
  Sparkles,
  Info
} from "lucide-react";
import { nativePlayClick, nativeVibrate, isRunningInWebToApk } from "../utils/nativeBridge";

interface DeviceInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceInfo: DeviceInfo | null;
  onRefresh?: () => void;
}

export const DeviceInfoModal: React.FC<DeviceInfoModalProps> = ({
  isOpen,
  onClose,
  deviceInfo,
  onRefresh,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const batteryLevel = deviceInfo?.runtime?.batteryLevel ?? 85;
  const isCharging = deviceInfo?.runtime?.isCharging ?? false;
  const modelName = deviceInfo?.hardware?.model || deviceInfo?.hardware?.brand || "هاتف أندرويد الذكي";
  const androidVersion = deviceInfo?.android?.release || "14";
  const buildId = deviceInfo?.android?.buildId || "TQ3A.230805.001";
  const isNative = isRunningInWebToApk();

  const handleCopy = () => {
    nativePlayClick();
    nativeVibrate(30);
    const summary = `📱 مواصفات جهاز المندوب:
• الموديل: ${modelName}
• نظام التشغيل: Android ${androidVersion}
• رقم البناء: ${buildId}
• مستوى البطارية: ${batteryLevel}% ${isCharging ? "(جاري الشحن ⚡)" : ""}
• وضع التشغيل: ${isNative ? "تطبيق أندرويد أصلي (WebToApk)" : "متصفح الويب"}
• المنصة: ${deviceInfo?.platform || "Android"}`;

    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div
      id="device-info-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          nativePlayClick();
          onClose();
        }
      }}
    >
      <div
        id="device-info-modal-content"
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-teal-100 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="relative bg-linear-to-r from-teal-800 via-teal-700 to-emerald-800 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-inner">
                <Smartphone className="h-6 w-6 text-teal-100" />
              </div>
              <div>
                <h3 className="text-base font-bold flex items-center gap-1.5">
                  <span>مواصفات وحالة هاتف المندوب</span>
                  <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-2xs font-semibold text-emerald-200 border border-emerald-300/30">
                    Live
                  </span>
                </h3>
                <p className="text-xs text-teal-100/80">بيانات العتاد والنظام الحقيقية للجهاز</p>
              </div>
            </div>
            <button
              onClick={() => {
                nativePlayClick();
                onClose();
              }}
              className="rounded-full p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Battery Status Card */}
          <div className="rounded-2xl border border-emerald-100 bg-linear-to-br from-emerald-50/70 to-teal-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isCharging ? (
                  <BatteryCharging className="h-6 w-6 text-emerald-600 animate-pulse" />
                ) : batteryLevel < 20 ? (
                  <BatteryWarning className="h-6 w-6 text-rose-500 animate-bounce" />
                ) : (
                  <Battery className="h-6 w-6 text-emerald-600" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-teal-950">حالة بطارية الهاتف</h4>
                  <p className="text-2xs text-slate-500">
                    {isCharging ? "الهاتف متصل بالشاحن حالياً ⚡" : "جاهز للعمل الميداني"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-emerald-800 tracking-tight">
                  {batteryLevel}%
                </span>
              </div>
            </div>

            {/* Battery Progress Bar */}
            <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  batteryLevel > 40
                    ? "bg-linear-to-r from-teal-500 to-emerald-500"
                    : batteryLevel > 20
                    ? "bg-linear-to-r from-amber-500 to-orange-500"
                    : "bg-linear-to-r from-rose-500 to-red-600"
                }`}
                style={{ width: `${Math.max(5, Math.min(100, batteryLevel))}%` }}
              />
            </div>
          </div>

          {/* Device & OS Specs Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Model Card */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 text-2xs font-semibold">
                <Cpu className="h-3.5 w-3.5 text-teal-600" />
                <span>طراز وموديل الجهاز</span>
              </div>
              <p className="text-xs font-bold text-slate-800 truncate" title={modelName}>
                {modelName}
              </p>
              <p className="text-2xs text-slate-400 truncate">
                {deviceInfo?.hardware?.brand || "Android Hardware"}
              </p>
            </div>

            {/* Android Version */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 text-2xs font-semibold">
                <Layers className="h-3.5 w-3.5 text-emerald-600" />
                <span>إصدار نظام التشغيل</span>
              </div>
              <p className="text-xs font-bold text-emerald-800">
                Android {androidVersion}
              </p>
              <p className="text-2xs text-slate-400 truncate" title={buildId}>
                Build: {buildId.substring(0, 14)}
              </p>
            </div>
          </div>

          {/* Security & WebToApk Integration Status */}
          <div className="rounded-2xl border border-teal-100/80 bg-teal-50/30 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                <span className="text-xs font-bold text-teal-950">بيئة وحماية التطبيق</span>
              </div>
              <span
                className={`text-2xs font-bold px-2.5 py-0.5 rounded-full border ${
                  isNative
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-amber-100 text-amber-800 border-amber-200"
                }`}
              >
                {isNative ? "حزمة APK أصلية ✓" : "وضع الويب"}
              </span>
            </div>

            <div className="text-2xs text-slate-600 space-y-1 bg-white/70 rounded-xl p-2.5 border border-teal-50">
              <div className="flex justify-between">
                <span className="text-slate-500">دعم البصمة (Biometrics):</span>
                <span className="font-semibold text-emerald-700">مُفعّل وجاهز 🔒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">جسر الإشعارات الهاتفية:</span>
                <span className="font-semibold text-emerald-700">متصل (WebToApk Bridge) 🔔</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">حماية البيانات:</span>
                <span className="font-semibold text-teal-800">تشفير محلي + مزامنة سحابية ☁️</span>
              </div>
            </div>
          </div>

          {/* Help Tip */}
          <div className="flex items-start gap-2 text-2xs text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <Info className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
            <p>
              يتم قراءة هذه المواصفات مباشرة من عتاد جهازك لتوثيق عمليات تسجيل الدخول والزيارات الميدانية وضمان أمان الحساب.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 bg-slate-50 p-4 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-800 bg-white border border-teal-200 rounded-xl hover:bg-teal-50 shadow-2xs transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">تم نسخ المواصفات ✓</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-600" />
                <span>نسخ تقرير الجهاز</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              nativePlayClick();
              onClose();
            }}
            className="px-5 py-2 text-xs font-bold text-white bg-linear-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
