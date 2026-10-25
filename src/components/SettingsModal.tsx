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
  Check,
  ExternalLink
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
  onOpenDiagnostics?: () => void;
  onOpenGoogleCalendar?: () => void;
  onOpenGoogleSheetsContacts?: () => void;
  onOpenGoogleChat?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isBelalAdmin,
  isBiometricEnabled,
  onToggleBiometric,
  onOpenApkModal,
  onOpenDiagnostics,
  onOpenGoogleCalendar,
  onOpenGoogleSheetsContacts,
  onOpenGoogleChat,
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
    requireApprovalForNewAccounts: true,
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

                    {/* Manual Approval for New Accounts toggle */}
                    <div className="pt-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-800">الاعتماد اليدوي للحسابات الجديدة (Manual Account Approval)</div>
                        <p className="text-3xs text-slate-500 font-medium mt-0.5">
                          تمكين أو تعطيل المراجعة الإدارية اليدوية لكل الحسابات الجديدة قبل منح صلاحية الوصول الكامل
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={adminSettings.requireApprovalForNewAccounts}
                          onChange={(e) =>
                            setAdminSettings((prev) => ({
                              ...prev,
                              requireApprovalForNewAccounts: e.target.checked,
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

            {/* Google Calendar Button */}
            {onOpenGoogleCalendar && (
              <button
                type="button"
                onClick={() => {
                  onOpenGoogleCalendar();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-xs font-bold hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
              >
                <span>📅 إدارة تقويم جوجل (Google Calendar)</span>
              </button>
            )}

            {/* Google Sheets & Contacts Button */}
            {onOpenGoogleSheetsContacts && (
              <button
                type="button"
                onClick={() => {
                  onOpenGoogleSheetsContacts();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
              >
                <span>📊 ربط Google Sheets و Google Contacts</span>
              </button>
            )}

            {/* Google Chat Button */}
            {onOpenGoogleChat && (
              <button
                type="button"
                onClick={() => {
                  onOpenGoogleChat();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 text-xs font-bold hover:bg-teal-100 transition-colors shadow-2xs cursor-pointer"
              >
                <span>💬 إدارة ومراسلات Google Chat</span>
              </button>
            )}

            {/* قسم خاص بالمسؤول د. بلال القيسي فقط: مراقبة الخوادم وحالة النظام وStatuspage */}
            {isBelalAdmin && (
              <div className="space-y-3 pt-3 border-t border-slate-200/90">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-3xs font-black uppercase text-slate-500 tracking-wider">
                    أدوات المراقبة وإدارة الخوادم (خاص بالمسؤول د. بلال القيسي 🔒)
                  </span>
                </div>

                {onOpenDiagnostics && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDiagnostics();
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 text-xs font-bold hover:bg-teal-100 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Server className="h-4 w-4 text-teal-700" />
                    <span>فحص الشبكة وتأكيد الاتصال (Diagnostics & Live Probe)</span>
                  </button>
                )}

                {/* Official Uptime & Status Page Link */}
                <a
                  href="https://mandoubakmed1.statuspage.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 text-xs font-black hover:bg-emerald-100/70 transition-all shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>لوحة مراقبة الخوادم والحوادث (Statuspage)</span>
                        <span className="bg-emerald-600 text-white text-4xs px-1.5 py-0.2 rounded font-mono">100% Online</span>
                      </div>
                      <p className="text-3xs text-emerald-700 font-medium">mandoubakmed1.statuspage.io</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-emerald-700 shrink-0" />
                </a>

                {/* Atlassian & Jira Service Management Subscription Card */}
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-3xs">
                        Atlassian
                      </div>
                      <div>
                        <div className="font-black text-blue-950">اشتراكات Atlassian & Jira Service</div>
                        <div className="text-3xs text-blue-700 font-mono">طلب رقم: R-454-DDC-WTJ-5H2</div>
                      </div>
                    </div>
                    <span className="bg-blue-600 text-white text-4xs font-bold px-2 py-0.5 rounded-full shadow-2xs">
                      نشط ومؤكد ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                      <div className="text-4xs text-blue-700 font-bold">Customer Service</div>
                      <div className="font-extrabold text-slate-800 text-3xs mt-0.5">Management (Free)</div>
                      <div className="text-4xs text-slate-500 font-mono mt-0.5">E-454-DDC-XUU-KWZ</div>
                    </div>
                    <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                      <div className="text-4xs text-blue-700 font-bold">Service Collection</div>
                      <div className="font-extrabold text-slate-800 text-3xs mt-0.5">Collection & Sync</div>
                      <div className="text-4xs text-slate-500 font-mono mt-0.5">E-454-DDC-XB9-V2P</div>
                    </div>
                    <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                      <div className="text-4xs text-blue-700 font-bold">Jira Service Mgmt</div>
                      <div className="font-extrabold text-slate-800 text-3xs mt-0.5">1,250 steps/month</div>
                      <div className="text-4xs text-slate-500 font-mono mt-0.5">E-454-DDC-XUP-RG8</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
