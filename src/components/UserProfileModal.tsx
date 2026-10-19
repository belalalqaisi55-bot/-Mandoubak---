import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  User as UserIcon,
  Building,
  Phone,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Cloud
} from "lucide-react";
import { User } from "../types";
import { updateUserProfile } from "../services/userProfileService";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserUpdated: (updatedUser: User) => void;
  isBelalAdmin: boolean;
  googleUser?: any;
}

export const UserProfileModal = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  isBelalAdmin,
  googleUser,
}: UserProfileModalProps) => {
  const [name, setName] = useState("");
  const [entityName, setEntityName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setEntityName(currentUser.entityName || "");
      setPhone(currentUser.phone || "");
      setLocation(currentUser.location || "");
      setNotes(currentUser.notes || "");
      setStatusMessage("");
      setErrorMessage("");
    }
  }, [currentUser, isOpen, isBelalAdmin]);

  if (!isOpen || !currentUser) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("الاسم مطلوب");
      return;
    }
    if (!phone.trim()) {
      setErrorMessage("رقم الهاتف مطلوب");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setStatusMessage("جاري حفظ التعديلات في Firebase... ⏳");

    try {
      const res = await updateUserProfile({
        userId: currentUser.id,
        name,
        entityName,
        phone,
        location,
        notes,
        isDrBelal: isBelalAdmin,
      });

      if (res.success) {
        setStatusMessage("تم التحديث والحفظ بنجاح ومزامنة البيانات! ✓");
        if (res.user) {
          onUserUpdated({
            ...currentUser,
            ...res.user,
          } as User);
        }
        setTimeout(() => {
          onClose();
        }, 900);
      } else {
        setErrorMessage(res.error || "حدث خطأ أثناء حفظ الملف التعريفي");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        id="user-profile-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="user-profile-modal-card"
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 text-right my-auto"
          dir="rtl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-5 relative">
            <button
              id="user-profile-modal-close-btn"
              type="button"
              onClick={onClose}
              className="absolute top-4 left-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Cloud className="h-4 w-4" />
              </span>
              <span className="text-2xs font-bold text-teal-200 uppercase tracking-wide">
                Firebase Cloud Profile
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white mt-1">
              {isBelalAdmin ? "الملف التعريفي للمندوب الطبي (د/ بلال القيسي)" : "الملف التعريفي وبيانات الحساب"}
            </h3>
            <p className="text-xs text-teal-200/90 mt-0.5 font-medium">
              {isBelalAdmin
                ? "تحديث صورتك الرسمية وبياناتك ومزامنتها تلقائياً على كافة الأجهزة والعملاء عبر Firebase"
                : "إدارة وتحديث بيانات الحساب والمنشأة الطبية"}
            </p>
          </div>

          <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">

            {/* Google OAuth Section */}
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 mt-4">
              <h4 className="text-xs font-bold text-sky-900 mb-2">حساب Google المرتبط</h4>
              {googleUser ? (
                <div className="flex items-center gap-3">
                  <img src={googleUser.picture} alt={googleUser.name} className="h-10 w-10 rounded-full" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">{googleUser.name}</p>
                    <p className="text-slate-500">{googleUser.email}</p>
                  </div>
                  <button onClick={() => window.location.href = '/auth/logout'} className="mr-auto text-rose-600 text-xs font-bold">تسجيل الخروج</button>
                </div>
              ) : (
                <button type="button" onClick={() => window.location.href = '/auth/google'} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
                  <span>ربط حساب Google</span>
                </button>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5 text-teal-700" />
                  <span>الاسم الكامل *</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: د/ بلال القيسي أو د/ أحمد"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-teal-700" />
                  <span>اسم المنشأة / الصيدلية / العيادة</span>
                </label>
                <input
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="مثال: صيدلية النور أو المكتب العلمي"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-teal-700" />
                  <span>رقم الهاتف *</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="776600049"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600 text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-700" />
                  <span>الموقع والمدينة</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="مثال: صنعاء - شارع الزبيري"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-teal-700" />
                <span>ملاحظات أو التخصص الطبي</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="معلومات إضافية عن الحساب..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            {/* Status & Error Alerts */}
            {statusMessage && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-amber-300" />
                    <span>جاري الحفظ والمزامنة...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-amber-300" />
                    <span>حفظ التعديلات في Firebase ☁️</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
