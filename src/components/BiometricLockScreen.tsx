import React, { useState, useEffect } from "react";
import { User } from "../types";
import {
  Fingerprint,
  Lock,
  Unlock,
  ShieldAlert,
  Smartphone,
  LogOut,
  Sparkles,
  RefreshCw
} from "lucide-react";
import {
  authenticateBiometricNative,
  nativePlayClick,
  nativeVibrate,
  nativeSuccessFeedback
} from "../utils/nativeBridge";

interface BiometricLockScreenProps {
  isLocked: boolean;
  user: User | null;
  onUnlock: () => void;
  onLogout: () => void;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({
  isLocked,
  user,
  onUnlock,
  onLogout,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");

  const triggerBiometric = async () => {
    nativePlayClick();
    nativeVibrate(40);
    setIsAuthenticating(true);
    setAuthError("");

    try {
      const res = await authenticateBiometricNative({
        title: "فتح قفل تطبيق مندوبك الطبي 🔒",
        subtitle: `مرحباً ${user?.name || "بك"}، يرجى مسح البصمة للمتابعة`,
        allowDeviceCredential: true,
      });

      if (res.success) {
        nativeSuccessFeedback();
        onUnlock();
      } else {
        setAuthError(res.error || "تعذر التحقق من البصمة، يرجى المحاولة مرة أخرى");
      }
    } catch (err: any) {
      setAuthError("حدث خطأ أثناء الاتصال بمستشعر البصمة");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Automatically trigger biometric authentication when the lock screen appears
  useEffect(() => {
    if (isLocked) {
      const timer = setTimeout(() => {
        triggerBiometric();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLocked]);

  if (!isLocked) return null;

  return (
    <div
      id="biometric-lock-screen"
      className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-white backdrop-blur-xl animate-fade-in select-none"
    >
      {/* Decorative ambient gradients */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm flex flex-col items-center text-center space-y-6">
        {/* App Logo & Lock Badge */}
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-tr from-teal-600 to-emerald-500 shadow-xl shadow-teal-500/30 border border-white/20">
            <Lock className="h-10 w-10 text-white animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-md">
            <Fingerprint className="h-4 w-4" />
          </div>
        </div>

        {/* Title & Welcome info */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>التطبيق مقفل للحماية 🔐</span>
          </h2>
          <p className="text-xs text-teal-200/80">
            {user ? `حساب المندوب: ${user.name} (${user.entityName || user.role})` : "يرجى التحقق من الهوية للمتابعة"}
          </p>
        </div>

        {/* Biometric Trigger Action Button */}
        <div className="flex flex-col items-center space-y-4 w-full pt-2">
          <button
            onClick={triggerBiometric}
            disabled={isAuthenticating}
            className="group relative flex h-28 w-28 items-center justify-center rounded-full bg-linear-to-br from-teal-500/20 to-emerald-500/10 border-2 border-teal-400/50 hover:border-emerald-400 p-3 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="انقر للمسح بالبصمة"
          >
            {/* Pulsing ring animation */}
            <div className="absolute inset-0 rounded-full border border-teal-400/30 animate-ping opacity-60 pointer-events-none" />

            <div className="flex flex-col items-center justify-center">
              {isAuthenticating ? (
                <RefreshCw className="h-12 w-12 text-teal-300 animate-spin" />
              ) : (
                <Fingerprint className="h-14 w-14 text-teal-300 group-hover:text-emerald-300 group-hover:scale-110 transition-all" />
              )}
            </div>
          </button>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-teal-100">
              {isAuthenticating ? "جاري انتظار مسح البصمة..." : "المس مستشعر البصمة بالهاتف أو انقر هنا"}
            </p>
            <p className="text-2xs text-slate-400">
              يدعم بصمة الإصبع، التعرف على الوجه، أو رمز قفل الشاشة
            </p>
          </div>
        </div>

        {/* Auth Error Banner if failed */}
        {authError && (
          <div className="w-full rounded-2xl bg-rose-500/15 border border-rose-500/30 p-3 flex items-center gap-2 text-2xs text-rose-200 animate-shake">
            <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
            <span className="text-right flex-1">{authError}</span>
          </div>
        )}

        {/* Actions / Fallbacks */}
        <div className="w-full pt-4 border-t border-white/10 flex items-center justify-between gap-3 text-2xs">
          <button
            onClick={() => {
              nativePlayClick();
              onLogout();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>تسجيل الخروج والتبديل</span>
          </button>

          <button
            onClick={triggerBiometric}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600/80 hover:bg-teal-500 text-white font-bold transition-colors cursor-pointer"
          >
            <Unlock className="h-3.5 w-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
