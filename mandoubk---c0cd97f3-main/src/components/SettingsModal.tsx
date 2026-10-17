import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Settings,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Bell,
  Volume2,
  Lock,
  Download,
  Database,
  Moon,
  Sun,
  Eye,
  RefreshCw,
  Info,
  Server,
  Save,
  Check
} from "lucide-react";
import { User, AppSettings } from "../types";
import { nativeVibrate, nativePlayClick } from "../utils/nativeBridge";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  isBelalAdmin: boolean;
  isBiometricEnabled: boolean;
  onToggleBiometric: (enabled: boolean) => void;
  onOpenApkModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isBelalAdmin,
  isBiometricEnabled,
  onToggleBiometric,
  onOpenApkModal,
}) => {
  // App preferences state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem("mandoubak_sound_enabled") !== "false";
  });
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(() => {
    return localStorage.getItem("mandoubak_haptic_enabled") !== "false";
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("mandoubak_notif_pref") !== "false";
  });
  const [compactDensity, setCompactDensity] = useState<boolean>(() => {
    return localStorage.getItem("mandoubak_compact_density") === "true";
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem("mandoubak_auto_sync") !== "false";
  });

  // Admin specific settings fetched from server
  const [adminSettings, setAdminSettings] = useState<AppSettings>({
    requireApprovalForNewClients: true,
    singlePhonePerDevice: true,
    autoApproveKnownNumbers: false,
    enableVisitTracking: true,
  });
  const [isLoadingAdminSettings, setIsLoadingAdminSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && isBelalAdmin) {
      setIsLoadingAdminSettings(true);
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data: AppSettings) => {
          if (data && typeof data === "object") {
            setAdminSettings((prev) => ({ ...prev, ...data }));
          }
        })
        .catch((err) => console.warn("Could not load server settings:", err))
        .finally(() => setIsLoadingAdminSettings(false));
    }
  }, [isOpen, isBelalAdmin]);

  if (!isOpen) return null;

  const handleSavePreferences = async () => {
    nativePlayClick();
    if (hapticEnabled) nativeVibrate(25);
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      localStorage.setItem("mandoubak_sound_enabled", soundEnabled ? "true" : "false");
      localStorage.setItem("mandoubak_haptic_enabled", hapticEnabled ? "true" : "false");
      localStorage.setItem("mandoubak_notif_pref", notificationsEnabled ? "true" : "false");
      localStorage.setItem("mandoubak_compact_density", compactDensity ? "true" : "false");
      localStorage.setItem("mandoubak_auto_sync", autoSyncEnabled ? "true" : "false");

      if (isBelalAdmin) {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(adminSettings),
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error("Save settings error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 text-right flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 px-5 py-4 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-teal-200 border border-white/20">
                <Settings className="h-5 w-5 animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight">إعدادات التطبيق والنظام</h2>
                <p className="text-2xs text-teal-100 font-medium">
                  تخصيص التفضيلات، الأمان، وتنزيل حزمة Android (APK)
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50/50">
            {/* Direct APK Banner inside Settings */}
            <div className="rounded-2xl p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/60 border-2 border-emerald-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-emerald-950 flex items-center gap-1.5">
                    <span>تطبيق أندرويد المستقل (APK)</span>
                    <span className="bg-emerald-600 text-white text-4xs font-bold px-1.5 py-0.5 rounded-full">جاهز للتحميل</span>
                  </h4>
                  <p className="text-3xs text-emerald-800 font-medium mt-0.5">
                    قم بتثبيت التطبيق مباشرة على هاتفك أو محاكي أندرويد (Vivo, Samsung, Xiaomi)
                  </p>
                </div>
              </div>
              {onOpenApkModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenApkModal();
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Download className="h-4 w-4" />
                  <span>تنزيل APK والتعليمات</span>
                </button>
              )}
            </div>

            {/* General Preferences Section */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Smartphone className="h-4 w-4 text-teal-700" />
                <h3 className="text-xs font-black text-slate-800">تفضيلات الاستخدام وتجربة المستخدم</h3>
              </div>

              <div className="space-y-3 divide-y divide-slate-100 text-xs">
                {/* Biometric Security */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-teal-700" />
                      <span>قفل التطبيق بالبصمة / رمز الجهاز (Biometric Lock)</span>
                    </div>
                    <p className="text-3xs text-slate-500 font-medium mt-0.5">
                      طلب بصمة الإصبع أو بصمة الوجه عند فتح التطبيق لحماية الطلبيات والبيانات
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isBiometricEnabled}
                      onChange={(e) => {
                        nativePlayClick();
                        onToggleBiometric(e.target.checked);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>

                {/* Haptic Feedback */}
                <div className="pt-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-800">الاهتزاز والتفاعل اللمسي (Haptic Feedback)</div>
                    <p className="text-3xs text-slate-500 font-medium mt-0.5">
                      اهتزاز خفيف للأزرار والعمليات الناجحة في تطبيق الهاتف
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={hapticEnabled}
                      onChange={(e) => setHapticEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>

                {/* Sound Effects */}
                <div className="pt-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Volume2 className="h-3.5 w-3.5 text-slate-600" />
                      <span>الأصوات والنغمات التفاعلية</span>
                    </div>
                    <p className="text-3xs text-slate-500 font-medium mt-0.5">
                      تشغيل نقرة صوتية لطيفة عند إرسال الطلبيات وإجراء العمليات
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => setSoundEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>

                {/* Auto Cloud Sync */}
                <div className="pt-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-teal-700" />
                      <span>المزامنة التلقائية مع السحابة (Auto Sync)</span>
                    </div>
                    <p className="text-3xs text-slate-500 font-medium mt-0.5">
                      مزامنة تلقائية في الخلفية عند توفر الإنترنت وحفظ البيانات في IndexedDB عند انقطاعه
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={autoSyncEnabled}
                      onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Admin Exclusive System Rules (Only visible to Dr. Belal Alqaisi) */}
            {isBelalAdmin && (
              <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-2xs space-y-3 bg-gradient-to-br from-white via-amber-50/20 to-white">
                <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-700" />
                    <h3 className="text-xs font-black text-slate-900">سياسات وإعدادات النظام الإداري (خاص بالمسؤول)</h3>
                  </div>
                  <span className="bg-amber-100 text-amber-900 text-4xs font-bold px-2 py-0.5 rounded-full border border-amber-200">
                    د/ بلال القيسي
                  </span>
                </div>

                {isLoadingAdminSettings ? (
                  <div className="py-4 text-center text-xs text-slate-500">جاري تحميل سياسات الخادم...</div>
                ) : (
                  <div className="space-y-3 divide-y divide-slate-100 text-xs">
                    {/* Require approval */}
                    <div className="pt-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-800">اشتراط اعتماد المشرف للعملاء الجدد</div>
                        <p className="text-3xs text-slate-500 font-medium mt-0.5">
                          توجيه أي عميل يسجل رقمه لأول مرة إلى حالة الانتظار لحين مراجعته واعتماده
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={adminSettings.requireApprovalForNewClients}
                          onChange={(e) =>
                            setAdminSettings((prev) => ({
                              ...prev,
                              requireApprovalForNewClients: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>

                    {/* Single phone per device */}
                    <div className="pt-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-800">تقييد الجهاز برقم هاتف واحد (Device Lock)</div>
                        <p className="text-3xs text-slate-500 font-medium mt-0.5">
                          منع التبديل المتكرر للحسابات لمنع التلاعب في الطلبيات والجرد
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={adminSettings.singlePhonePerDevice}
                          onChange={(e) =>
                            setAdminSettings((prev) => ({
                              ...prev,
                              singlePhonePerDevice: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>

                    {/* Enable visit tracking */}
                    <div className="pt-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-800">تتبع الزيارات الميدانية بالذكاء الاصطناعي</div>
                        <p className="text-3xs text-slate-500 font-medium mt-0.5">
                          تمكين نماذج Gemini لاستخراج المهام والتلخيص التلقائي للملاحظات الميدانية
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={adminSettings.enableVisitTracking ?? true}
                          onChange={(e) =>
                            setAdminSettings((prev) => ({
                              ...prev,
                              enableVisitTracking: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Version & Technical Info */}
            <div className="rounded-2xl bg-slate-100/80 p-3.5 text-3xs text-slate-500 space-y-1.5 border border-slate-200/70">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>إصدار التطبيق الرسمي:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">v2.4.0 (2026 Edition)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>المشرف والمندوب المعتمد:</span>
                <span className="font-bold text-teal-700">د/ بلال القيسي (776600049)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>تخزين البيانات:</span>
                <span>سحابي (Firebase Firestore) ومحلي (IndexedDB Offline)</span>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="h-4 w-4 text-emerald-200" />
                  <span>تم الحفظ بنجاح ✓</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>حفظ التعديلات والتفضيلات</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
