import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Smartphone,
  Search,
  CheckSquare,
  Square,
  Users,
  Building2,
  Stethoscope,
  X,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Phone,
  UserCheck,
  ChevronLeft
} from "lucide-react";
import { DeviceContact, User } from "../types";
import { requestDeviceContacts, isContactPickerSupported, nativeSuccessFeedback, nativeVibrate } from "../utils/nativeBridge";

interface DeviceContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportBatch: (contacts: DeviceContact[]) => Promise<void>;
  onSelectSingle: (contact: DeviceContact) => void;
  existingPhones: Set<string>;
}

export const DeviceContactsModal: React.FC<DeviceContactsModalProps> = ({
  isOpen,
  onClose,
  onImportBatch,
  onSelectSingle,
  existingPhones,
}) => {
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterRole, setFilterRole] = useState<"all" | "pharmacy" | "doctor">("all");
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [sourceType, setSourceType] = useState<"webtoapk" | "web_api" | "error" | "">("");

  // Manual Quick Input fallback
  const [manualText, setManualText] = useState<string>("");
  const [showManualPaste, setShowManualPaste] = useState<boolean>(false);

  const loadContactsFromDevice = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setShowManualPaste(false);

    try {
      const res = await requestDeviceContacts(300);
      setSourceType(res.source);

      if (res.error && res.contacts.length === 0) {
        setErrorMessage(res.error);
      } else {
        // Pre-mark existing phones
        const mapped = res.contacts.map((c) => ({
          ...c,
          // Check if already registered
          isExisting: existingPhones.has(c.phone),
          selected: !existingPhones.has(c.phone),
        }));
        setContacts(mapped);
      }
    } catch (err) {
      setErrorMessage("حدث خطأ غير متوقع أثناء طلب جهات الاتصال من الهاتف.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadContactsFromDevice();
    } else {
      setContacts([]);
      setSearchQuery("");
      setErrorMessage("");
      setShowManualPaste(false);
    }
  }, [isOpen]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.entityName && c.entityName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRole =
        filterRole === "all" || (filterRole === "pharmacy" ? c.role === "pharmacy" : c.role === "doctor");

      return matchSearch && matchRole;
    });
  }, [contacts, searchQuery, filterRole]);

  const selectedCount = useMemo(() => {
    return contacts.filter((c) => c.selected).length;
  }, [contacts]);

  const toggleSelectAll = (select: boolean) => {
    nativeVibrate(15);
    setContacts((prev) =>
      prev.map((c) => ({
        ...c,
        selected: select,
      }))
    );
  };

  const toggleContact = (id?: string, phone?: string) => {
    nativeVibrate(10);
    setContacts((prev) =>
      prev.map((c) => {
        if ((id && c.id === id) || (phone && c.phone === phone)) {
          return { ...c, selected: !c.selected };
        }
        return c;
      })
    );
  };

  const updateContactRole = (id: string | undefined, phone: string, role: "pharmacy" | "doctor") => {
    nativeVibrate(10);
    setContacts((prev) =>
      prev.map((c) => {
        if ((id && c.id === id) || c.phone === phone) {
          return { ...c, role };
        }
        return c;
      })
    );
  };

  const updateContactEntityName = (id: string | undefined, phone: string, entityName: string) => {
    setContacts((prev) =>
      prev.map((c) => {
        if ((id && c.id === id) || c.phone === phone) {
          return { ...c, entityName };
        }
        return c;
      })
    );
  };

  const handleBatchSubmit = async () => {
    const selected = contacts.filter((c) => c.selected);
    if (selected.length === 0) return;

    setIsImporting(true);
    try {
      await onImportBatch(selected);
      nativeSuccessFeedback();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  const parseManualPastedText = () => {
    if (!manualText.trim()) return;
    const lines = manualText.split("\n").filter((l) => l.trim());
    const parsed: DeviceContact[] = [];

    lines.forEach((line, idx) => {
      // Split by tab, comma, or semicolon
      const parts = line.split(/[\t,;]/).map((p) => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const phone = parts[1].replace(/\D/g, "");
        const entity = parts[2] || name;
        const role = parts[3]?.includes("طبيب") || parts[3]?.includes("doctor") ? "doctor" : "pharmacy";
        if (name && phone) {
          parsed.push({
            id: `manual_${idx}_${Date.now()}`,
            name,
            phone,
            entityName: entity,
            role,
            selected: true,
          });
        }
      } else if (parts.length === 1 && line.includes(" - ")) {
        const sub = line.split(" - ");
        const name = sub[0].trim();
        const phone = sub[1]?.replace(/\D/g, "") || "";
        if (name && phone) {
          parsed.push({
            id: `manual_${idx}_${Date.now()}`,
            name,
            phone,
            entityName: name,
            role: name.includes("د.") || name.includes("طبيب") ? "doctor" : "pharmacy",
            selected: true,
          });
        }
      }
    });

    if (parsed.length > 0) {
      setContacts(parsed);
      setShowManualPaste(false);
      setErrorMessage("");
      nativeSuccessFeedback();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 text-right flex flex-col max-h-[90vh] overflow-hidden"
          dir="rtl"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-linear-to-r from-emerald-50 via-teal-50/50 to-white px-5 py-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    استيراد جهات الاتصال من الهاتف 📱
                  </h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-4xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                    <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                    WebToApk Bridge
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  قراءة قائمة الأطباء والصيدليات المسجلة في هاتفك وإضافتها كعملاء معتمدين
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600"></div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                  جاري طلب وقراءة جهات الاتصال من هاتفك...
                </h4>
                <p className="text-2xs text-slate-500 max-w-sm">
                  يرجى الموافقة على إذن قراءة جهات الاتصال في هاتفك إذا ظهرت لك رسالة النظام.
                </p>
              </div>
            )}

            {/* Error or No Direct Support Notice */}
            {!isLoading && errorMessage && contacts.length === 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-3 text-right">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                  <span>تنبيه الوصول إلى جهات الاتصال:</span>
                </div>
                <p className="text-2xs text-amber-800 leading-relaxed">
                  {errorMessage}
                </p>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200/60">
                  <button
                    onClick={loadContactsFromDevice}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 transition-all cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>إعادة المحاولة 🔄</span>
                  </button>

                  <button
                    onClick={() => setShowManualPaste(!showManualPaste)}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100/50 transition-all cursor-pointer"
                  >
                    <span>أو لصق الأسماء والأرقام يدوياً 📋</span>
                  </button>
                </div>

                {showManualPaste && (
                  <div className="mt-3 space-y-2 rounded-xl bg-white p-3.5 border border-amber-200">
                    <label className="block text-2xs font-bold text-slate-700">
                      الصق قائمة الأسماء والأرقام هنا (كل سطر: الاسم - الرقم أو مفصولة بفاصلة):
                    </label>
                    <textarea
                      rows={4}
                      placeholder="صيدلية الشفاء - 771234567&#10;د. محمد أحمد - 770000000"
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-right font-mono focus:border-teal-500 focus:outline-none"
                    />
                    <button
                      onClick={parseManualPastedText}
                      disabled={!manualText.trim()}
                      className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50 cursor-pointer"
                    >
                      معالجة وإدراج الأسماء المنسوخة
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Contacts Table & Control Bar */}
            {!isLoading && contacts.length > 0 && (
              <div className="space-y-3">
                {/* Search and Role Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="بحث بالاسم أو رقم الهاتف..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pr-9 pl-3 py-2 text-xs text-right focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Role Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                    <button
                      onClick={() => setFilterRole("all")}
                      className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
                        filterRole === "all"
                          ? "bg-white text-teal-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      الكل ({contacts.length})
                    </button>
                    <button
                      onClick={() => setFilterRole("pharmacy")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
                        filterRole === "pharmacy"
                          ? "bg-white text-emerald-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Building2 className="h-3 w-3 text-emerald-600" />
                      <span>صيدليات</span>
                    </button>
                    <button
                      onClick={() => setFilterRole("doctor")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
                        filterRole === "doctor"
                          ? "bg-white text-teal-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Stethoscope className="h-3 w-3 text-teal-600" />
                      <span>أطباء وعيادات</span>
                    </button>
                  </div>
                </div>

                {/* Selection Counter and Bulk Buttons */}
                <div className="flex items-center justify-between text-2xs text-slate-600 bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      تم تحديد: <strong className="text-teal-700 font-mono text-xs">{selectedCount}</strong> من أصل {contacts.length} جهة اتصال
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSelectAll(true)}
                      className="text-teal-700 hover:text-teal-900 font-bold hover:underline cursor-pointer"
                    >
                      تحديد الكل
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => toggleSelectAll(false)}
                      className="text-slate-500 hover:text-slate-800 font-bold hover:underline cursor-pointer"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>

                {/* Contacts List */}
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden max-h-[380px] overflow-y-auto">
                  {filteredContacts.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      لا توجد جهات اتصال مطابقة لبحثك.
                    </div>
                  ) : (
                    filteredContacts.map((contact, idx) => {
                      const isRegistered = existingPhones.has(contact.phone);
                      return (
                        <div
                          key={contact.id || `contact_${idx}`}
                          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 gap-2.5 transition-colors ${
                            contact.selected ? "bg-teal-50/30" : "hover:bg-slate-50"
                          } ${isRegistered ? "opacity-75" : ""}`}
                        >
                          {/* Checkbox and Name info */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleContact(contact.id, contact.phone)}
                              className="text-teal-600 hover:text-teal-700 shrink-0 cursor-pointer p-0.5"
                            >
                              {contact.selected ? (
                                <CheckSquare className="h-5 w-5 fill-teal-600 text-white" />
                              ) : (
                                <Square className="h-5 w-5 text-slate-300" />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {contact.name}
                                </span>
                                {isRegistered && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.2 text-4xs font-bold text-slate-600 border border-slate-200 shrink-0">
                                    مسجل مسبقاً
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-2xs text-slate-500 font-mono mt-0.5">
                                <Phone className="h-3 w-3 text-slate-400" />
                                <span>{contact.phone}</span>
                              </div>
                            </div>
                          </div>

                          {/* Editable Role and Facility name */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-between sm:justify-end">
                            {/* Role selector */}
                            <select
                              value={contact.role || "pharmacy"}
                              onChange={(e) =>
                                updateContactRole(contact.id, contact.phone, e.target.value as any)
                              }
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-2xs font-bold text-slate-700 focus:border-teal-500 focus:outline-none"
                            >
                              <option value="pharmacy">💊 صيدلية</option>
                              <option value="doctor">🩺 دكتور/عيادة</option>
                            </select>

                            {/* Quick Autofill single */}
                            <button
                              type="button"
                              onClick={() => {
                                onSelectSingle(contact);
                                nativeSuccessFeedback();
                                onClose();
                              }}
                              className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-2xs font-bold text-teal-800 hover:bg-teal-100 transition-colors flex items-center gap-1 cursor-pointer"
                              title="تعبئة بيانات هذا العميل في النموذج"
                            >
                              <UserCheck className="h-3 w-3 text-teal-600" />
                              <span>اختيار للنموذج</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadContactsFromDevice}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">تحديث الأسماء</span>
              </button>

              <button
                type="button"
                onClick={handleBatchSubmit}
                disabled={selectedCount === 0 || isImporting}
                className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 disabled:opacity-40 transition-all cursor-pointer active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span>
                  {isImporting
                    ? "جاري الاستيراد..."
                    : `استيراد (${selectedCount}) عميل إلى السجل 🚀`}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
