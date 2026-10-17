import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Gift,
  PackageCheck,
  Share2,
  MessageCircle,
  Printer,
  Trash2,
  Edit3,
  Camera,
  X,
  Building2,
  Phone,
  ShieldCheck,
  FileCheck2,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Agreement, AgreementStatus, AgreementType, User } from "../types";

interface AgreementsManagerProps {
  agreements: Agreement[];
  clients: User[];
  currentUser: User | null;
  onSaveAgreement: (agreementData: Partial<Agreement>, agreementId?: string) => Promise<boolean>;
  onDeleteAgreement: (agreementId: string) => Promise<boolean>;
  isAdmin?: boolean;
}

const AGREEMENT_TYPES: { type: AgreementType; label: string; icon: string; bg: string; text: string }[] = [
  { type: "bonus", label: "بونص إضافي", icon: "🎁", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800" },
  { type: "samples", label: "عينات مجانية", icon: "🧪", bg: "bg-blue-50 border-blue-200", text: "text-blue-800" },
  { type: "gift_support", label: "دعم وهدايا ترويجية", icon: "🤝", bg: "bg-purple-50 border-purple-200", text: "text-purple-800" },
  { type: "discount_terms", label: "شروط توريد وخصم كميات", icon: "📦", bg: "bg-amber-50 border-amber-200", text: "text-amber-800" },
  { type: "other", label: "اتفاقية خاصة أخرى", icon: "📋", bg: "bg-slate-50 border-slate-200", text: "text-slate-800" }
];

export const AgreementsManager: React.FC<AgreementsManagerProps> = ({
  agreements,
  clients,
  currentUser,
  onSaveAgreement,
  onDeleteAgreement,
  isAdmin = true
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedAgreementId, setExpandedAgreementId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedPrintAgreement, setSelectedPrintAgreement] = useState<Agreement | null>(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    clientId: "",
    clientName: "",
    entityName: "",
    clientPhone: "",
    type: "bonus" as AgreementType,
    typeLabel: "بونص إضافي",
    details: "",
    agreementDate: new Date().toISOString().split("T")[0],
    status: "pending" as AgreementStatus,
    deliveredDetails: "",
    deliveredAt: "",
    deliveredBy: "د/ بلال القيسي",
    invoiceNumber: "",
    invoiceAttachment: "",
    notes: ""
  });

  const activeClients = useMemo(() => {
    return clients.filter((c) => c.role !== "rep");
  }, [clients]);

  // Open Modal for New Agreement
  const handleOpenCreateModal = () => {
    const today = new Date().toISOString().split("T")[0];
    setEditingAgreement(null);
    setFormData({
      clientId: activeClients.length > 0 ? activeClients[0].id : "",
      clientName: activeClients.length > 0 ? activeClients[0].name : "",
      entityName: activeClients.length > 0 ? (activeClients[0].entityName || activeClients[0].name) : "",
      clientPhone: activeClients.length > 0 ? activeClients[0].phone : "",
      type: "bonus",
      typeLabel: "بونص إضافي",
      details: "",
      agreementDate: today,
      status: "pending",
      deliveredDetails: "",
      deliveredAt: "",
      deliveredBy: "د/ بلال القيسي",
      invoiceNumber: "",
      invoiceAttachment: "",
      notes: ""
    });
    setIsModalOpen(true);
  };

  // Open Modal to Edit or Document Delivery
  const handleOpenEditModal = (agr: Agreement, markAsDelivered = false) => {
    setEditingAgreement(agr);
    const nowIso = new Date().toISOString().split("T")[0];
    const newStatus = markAsDelivered ? "delivered" : agr.status;

    setFormData({
      clientId: agr.clientId,
      clientName: agr.clientName,
      entityName: agr.entityName,
      clientPhone: agr.clientPhone || "",
      type: agr.type,
      typeLabel: agr.typeLabel || "",
      details: agr.details,
      agreementDate: agr.agreementDate || nowIso,
      status: newStatus,
      deliveredDetails: agr.deliveredDetails || (markAsDelivered ? agr.details : ""),
      deliveredAt: agr.deliveredAt ? agr.deliveredAt.split("T")[0] : (newStatus === "delivered" ? nowIso : ""),
      deliveredBy: agr.deliveredBy || "د/ بلال القيسي",
      invoiceNumber: agr.invoiceNumber || "",
      invoiceAttachment: agr.invoiceAttachment || "",
      notes: agr.notes || ""
    });
    setIsModalOpen(true);
  };

  // Handle Client Selection in Form
  const handleClientChange = (clientId: string) => {
    const found = activeClients.find((c) => c.id === clientId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        clientId: found.id,
        clientName: found.name,
        entityName: found.entityName || found.name,
        clientPhone: found.phone
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        clientId,
        clientName: "",
        entityName: "",
        clientPhone: ""
      }));
    }
  };

  // Handle Image Upload / Attachment for Invoice
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميغابايت.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, invoiceAttachment: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Save Agreement
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.details.trim()) {
      alert("يرجى اختيار المنشأة وكتابة تفاصيل وبنود الاتفاق.");
      return;
    }

    if (formData.status === "delivered" && !formData.deliveredDetails.trim()) {
      alert("عند تحديد حالة 'تم تسليم الاتفاق'، يرجى كتابة ما تم تسليمه فعلياً للتوثيق.");
      return;
    }

    setIsSaving(true);
    const selectedTypeObj = AGREEMENT_TYPES.find((t) => t.type === formData.type);
    const typeLabel = selectedTypeObj ? selectedTypeObj.label : "اتفاقية خاصة";

    const payload: Partial<Agreement> = {
      ...formData,
      typeLabel,
      deliveredDetails: formData.status === "delivered" ? formData.deliveredDetails.trim() : undefined,
      deliveredAt: formData.status === "delivered" ? (formData.deliveredAt || new Date().toISOString()) : undefined,
      deliveredBy: formData.status === "delivered" ? (formData.deliveredBy || "د/ بلال القيسي") : undefined
    };

    const success = await onSaveAgreement(payload, editingAgreement ? editingAgreement.id : undefined);
    setIsSaving(false);
    if (success) {
      setIsModalOpen(false);
      setEditingAgreement(null);
    }
  };

  // Share Agreement via WhatsApp
  const handleShareWhatsApp = (agr: Agreement) => {
    const cleanPhone = (agr.clientPhone || "").replace(/\D/g, "");
    const waPhone = cleanPhone.startsWith("967") ? cleanPhone : cleanPhone ? `967${cleanPhone}` : "";
    
    const statusText = agr.status === "delivered" ? "✅ تم تسليم وتوثيق الاتفاق" : agr.status === "cancelled" ? "❌ ملغي" : "⏳ قيد الانتظار والتجهيز";

    let message = `🏥 *سند وتوثيق اتفاقية تجارية / بونص - تطبيق مندوبك الطبي*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `👤 *المنشأة الطبية:* ${agr.entityName || agr.clientName}\n`;
    message += `👨‍⚕️ *المسؤول:* ${agr.clientName}\n`;
    message += `📅 *تاريخ الاتفاق:* ${agr.agreementDate}\n`;
    message += `🏷️ *نوع الاتفاق:* ${agr.typeLabel || "بونص / عينات"}\n`;
    message += `📋 *تفاصيل وبنود الاتفاق الأصلي:*\n${agr.details}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📊 *حالة التنفيذ:* ${statusText}\n`;

    if (agr.status === "delivered") {
      message += `📦 *ما تم تسليمه وتوثيقه فعلياً:*\n${agr.deliveredDetails || agr.details}\n`;
      if (agr.deliveredAt) message += `🕒 *تاريخ ووقت التسليم:* ${new Date(agr.deliveredAt).toLocaleDateString("ar-YE")}\n`;
      if (agr.deliveredBy) message += `👨‍💼 *المندوب المسلّم:* ${agr.deliveredBy}\n`;
      if (agr.invoiceNumber) message += `🧾 *رقم الفاتورة / السند:* ${agr.invoiceNumber}\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `مع تحيات المندوب الطبي: د/ بلال القيسي (776600049)\n`;
    message += `🌐 تطبيق مندوبك الطبي`;

    const encoded = encodeURIComponent(message);
    const url = waPhone ? `https://wa.me/${waPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  // Filtered Agreements
  const filteredAgreements = useMemo(() => {
    return agreements.filter((agr) => {
      // If user is client, only show their agreements
      if (!isAdmin && currentUser && agr.clientId !== currentUser.id && agr.clientPhone !== currentUser.phone) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== "all" && agr.status !== selectedStatusFilter) {
        return false;
      }

      // Type filter
      if (selectedTypeFilter !== "all" && agr.type !== selectedTypeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesClient = (agr.entityName || "").toLowerCase().includes(q) ||
                              (agr.clientName || "").toLowerCase().includes(q) ||
                              (agr.clientPhone || "").toLowerCase().includes(q);
        const matchesDetails = (agr.details || "").toLowerCase().includes(q) ||
                               (agr.deliveredDetails || "").toLowerCase().includes(q) ||
                               (agr.invoiceNumber || "").toLowerCase().includes(q);
        return matchesClient || matchesDetails;
      }

      return true;
    });
  }, [agreements, isAdmin, currentUser, selectedStatusFilter, selectedTypeFilter, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = agreements.length;
    const pending = agreements.filter((a) => a.status === "pending").length;
    const delivered = agreements.filter((a) => a.status === "delivered").length;
    const bonusCount = agreements.filter((a) => a.type === "bonus").length;
    const sampleCount = agreements.filter((a) => a.type === "samples").length;

    return { total, pending, delivered, bonusCount, sampleCount };
  }, [agreements]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Header & Quick Metrics */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 p-4 sm:p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 opacity-10 pointer-events-none">
          <ShieldCheck className="h-56 w-56 text-white" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/30 text-teal-200 border border-teal-400/30">
                <FileCheck2 className="h-5 w-5" />
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-tight">إدارة وتوثيق الاتفاقيات (Agreements Management)</h2>
            </div>
            <p className="text-xs text-teal-100/80 max-w-xl leading-relaxed">
              توثيق بنود الاتفاقيات المسبقة (بونص إضافي، عينات مجانية، هدايا ترويجية) وإثبات التسليم الفعلي لضمان مطابقة الالتزامات ومنع أي تلاعب.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 text-xs font-black shadow-md shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer shrink-0"
              id="btn-create-agreement"
            >
              <Plus className="h-4 w-4" />
              <span>إبرام اتفاقية جديدة ✨</span>
            </button>
          )}
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-teal-700/50">
          <div className="rounded-xl bg-white/10 backdrop-blur-xs p-2.5 border border-white/10">
            <span className="text-3xs text-teal-200 font-bold block">إجمالي الاتفاقيات</span>
            <span className="text-base sm:text-lg font-black text-white">{metrics.total}</span>
          </div>

          <div className="rounded-xl bg-amber-500/20 backdrop-blur-xs p-2.5 border border-amber-400/30">
            <span className="text-3xs text-amber-200 font-bold flex items-center gap-1">
              <Clock className="h-3 w-3" />
              قيد التجهيز / انتظار
            </span>
            <span className="text-base sm:text-lg font-black text-amber-300">{metrics.pending}</span>
          </div>

          <div className="rounded-xl bg-emerald-500/20 backdrop-blur-xs p-2.5 border border-emerald-400/30">
            <span className="text-3xs text-emerald-200 font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              تم التسليم والتوثيق
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-300">{metrics.delivered}</span>
          </div>

          <div className="rounded-xl bg-purple-500/20 backdrop-blur-xs p-2.5 border border-purple-400/30">
            <span className="text-3xs text-purple-200 font-bold flex items-center gap-1">
              <Gift className="h-3 w-3" />
              بونص & عينات
            </span>
            <span className="text-base sm:text-lg font-black text-purple-200">{metrics.bonusCount + metrics.sampleCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم المنشأة، الطبيب، رقم الهاتف، أو تفاصيل البونص..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-3 text-xs text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
            <button
              onClick={() => setSelectedStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all cursor-pointer ${
                selectedStatusFilter === "all" ? "bg-white text-teal-800 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              الكل ({agreements.length})
            </button>
            <button
              onClick={() => setSelectedStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedStatusFilter === "pending" ? "bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="h-3 w-3 text-amber-600" />
              قيد الانتظار ({metrics.pending})
            </button>
            <button
              onClick={() => setSelectedStatusFilter("delivered")}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedStatusFilter === "delivered" ? "bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              تم التسليم ({metrics.delivered})
            </button>
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 text-3xs">
          <span className="text-slate-400 font-bold">نوع الاتفاق:</span>
          <button
            onClick={() => setSelectedTypeFilter("all")}
            className={`px-2.5 py-1 rounded-full font-bold transition-colors cursor-pointer ${
              selectedTypeFilter === "all" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            جميع الأنواع
          </button>
          {AGREEMENT_TYPES.map((t) => (
            <button
              key={`filter-${t.type}`}
              onClick={() => setSelectedTypeFilter(t.type)}
              className={`px-2.5 py-1 rounded-full font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                selectedTypeFilter === t.type ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Agreements Cards List */}
      {filteredAgreements.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
            <FileText className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">لا توجد اتفاقيات مسجلة مطابقة للبحث</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isAdmin
              ? "يمكنك البدء بإضافة اتفاقية جديدة وتوثيق بنود البونص أو العينات للعملاء عبر زر 'إبرام اتفاقية جديدة'."
              : "لم يتم تسجيل أي اتفاقيات أو عينات ممنوحة لمنشأتك حتى الآن."}
          </p>
          {isAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 text-white px-4 py-2 text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة اتفاقية أولى الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAgreements.map((agr, idx) => {
            const isExpanded = expandedAgreementId === agr.id;
            const typeConfig = AGREEMENT_TYPES.find((t) => t.type === agr.type) || AGREEMENT_TYPES[0];

            return (
              <motion.div
                key={`agreement-${agr.id || idx}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border transition-all ${
                  agr.status === "delivered"
                    ? "border-emerald-200 bg-gradient-to-br from-white via-emerald-50/10 to-white shadow-2xs hover:border-emerald-300"
                    : agr.status === "cancelled"
                    ? "border-slate-200 bg-slate-50/70 opacity-75"
                    : "border-amber-200 bg-gradient-to-br from-white via-amber-50/15 to-white shadow-2xs hover:border-amber-300"
                }`}
              >
                {/* Main Card Header & Quick Summary */}
                <div className="p-3.5 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-start sm:items-center gap-2.5">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold border shadow-2xs ${typeConfig.bg} ${typeConfig.text}`}>
                        {typeConfig.icon}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-teal-600" />
                            {agr.entityName || agr.clientName}
                          </h3>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-4xs font-black border ${typeConfig.bg} ${typeConfig.text}`}>
                            {typeConfig.icon} {agr.typeLabel || typeConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-3xs text-slate-500 font-medium mt-0.5 flex-wrap">
                          <span>المسؤول: <strong>{agr.clientName}</strong></span>
                          {agr.clientPhone && (
                            <>
                              <span>•</span>
                              <span className="font-mono dir-ltr flex items-center gap-0.5 text-slate-700">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {agr.clientPhone}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-slate-600">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            تاريخ الاتفاق: {agr.agreementDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {agr.status === "delivered" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-3xs font-black text-emerald-800 shadow-2xs">
                          <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                          تم تسليم الاتفاق وتوثيقه ✓
                        </span>
                      ) : agr.status === "cancelled" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 border border-slate-300 px-3 py-1 text-3xs font-bold text-slate-700">
                          <X className="h-3.5 w-3.5 text-slate-500" />
                          ملغي
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-3xs font-black text-amber-900 animate-pulse shadow-2xs">
                          <Clock className="h-3.5 w-3.5 text-amber-700" />
                          قيد الانتظار والتجهيز ⏳
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Two Main Columns: Step 1 (Original Terms) & Step 2 (Delivered Proof) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* STEP 1: Original Terms Box */}
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-2xs font-bold text-slate-700 border-b border-slate-200 pb-1">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-teal-600" />
                          1. تفاصيل الاتفاق الأصلي
                        </span>
                        <span className="text-4xs text-slate-400 font-mono">{agr.agreementDate}</span>
                      </div>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-slate-100">
                        {agr.details}
                      </p>
                    </div>

                    {/* STEP 2: Proof of Delivery Box */}
                    <div className={`rounded-xl border p-3 space-y-1.5 ${
                      agr.status === "delivered"
                        ? "border-emerald-200 bg-emerald-50/40 text-emerald-950"
                        : "border-slate-200 bg-slate-50/40 text-slate-500"
                    }`}>
                      <div className="flex items-center justify-between text-2xs font-bold border-b pb-1 border-slate-200">
                        <span className="flex items-center gap-1">
                          <PackageCheck className={`h-3.5 w-3.5 ${agr.status === "delivered" ? "text-emerald-600" : "text-slate-400"}`} />
                          2. إثبات وتوثيق التسليم الفعلي
                        </span>
                        {agr.status === "delivered" && (
                          <span className="text-4xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            موثق ومسلّم ✓
                          </span>
                        )}
                      </div>

                      {agr.status === "delivered" ? (
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-900 font-bold leading-relaxed whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-emerald-100">
                            {agr.deliveredDetails || agr.details}
                          </p>

                          <div className="grid grid-cols-2 gap-1.5 text-4xs text-slate-600 pt-0.5">
                            {agr.deliveredAt && (
                              <div className="bg-white/80 p-1 rounded border border-emerald-100">
                                <strong>تاريخ التسليم:</strong> {new Date(agr.deliveredAt).toLocaleDateString("ar-YE")}
                              </div>
                            )}
                            {agr.deliveredBy && (
                              <div className="bg-white/80 p-1 rounded border border-emerald-100">
                                <strong>المسلّم:</strong> {agr.deliveredBy}
                              </div>
                            )}
                            {agr.invoiceNumber && (
                              <div className="bg-white/80 p-1 rounded border border-emerald-100 col-span-2">
                                <strong>رقم الفاتورة / السند:</strong> <span className="font-mono font-bold text-slate-900">{agr.invoiceNumber}</span>
                              </div>
                            )}
                          </div>

                          {/* Invoice Attachment Preview Button */}
                          {agr.invoiceAttachment && (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(agr.invoiceAttachment!)}
                              className="w-full flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-1 px-2 text-3xs font-bold shadow-2xs transition-colors cursor-pointer"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                              <span>عرض صورة سند الاستلام / الفاتورة 🖼️</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400 italic bg-white/60 rounded-lg border border-dashed border-slate-200">
                          بانتظار تسليم وتوثيق الاتفاق من قبل المندوب د/ بلال القيسي.
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenEditModal(agr, true)}
                              className="mt-2 block mx-auto text-2xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
                            >
                              توثيق وتسليم الاتفاق الآن 📦✓
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleShareWhatsApp(agr)}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 text-3xs font-black transition-colors cursor-pointer"
                        title="إرسال توثيق الاتفاقية للعميل عبر الواتساب"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        <span>مشاركة واتساب 📲</span>
                      </button>

                      <button
                        onClick={() => setSelectedPrintAgreement(agr)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 text-3xs font-bold transition-colors cursor-pointer"
                        title="طباعة سند اتفاقية رسمي"
                      >
                        <Printer className="h-3.5 w-3.5 text-slate-500" />
                        <span>طباعة سند 🖨️</span>
                      </button>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        {agr.status === "pending" ? (
                          <button
                            onClick={() => handleOpenEditModal(agr, true)}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-3xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            <span>توثيق التسليم</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenEditModal(agr, false)}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-3xs font-bold transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                            <span>تعديل</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm("هل أنت متأكد من رغبتك في حذف هذه الاتفاقية؟")) {
                              onDeleteAgreement(agr.id);
                            }
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف الاتفاقية"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CREATE & EDIT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                    <FileCheck2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {editingAgreement ? "تعديل وتوثيق الاتفاقية" : "إبرام اتفاقية جديدة مع العميل"}
                    </h3>
                    <p className="text-3xs text-slate-500 font-medium">
                      وثّق البنود والتفاهمات المتبادلة بدقة لضمان الشفافية وحماية حقوق العميل والمندوب
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmitForm} className="space-y-4">
                {/* SECTION 1: ORIGINAL AGREEMENT DETAILS */}
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-black text-teal-900 border-b border-slate-200 pb-1.5">
                    <FileText className="h-4 w-4 text-teal-700" />
                    <span>الخطوة 1: تفاصيل الاتفاق الأصلي (عند المندوب والعميل)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Client Selector */}
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 mb-1">المنشأة الطبية / العميل *</label>
                      <select
                        value={formData.clientId}
                        onChange={(e) => handleClientChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                        required
                      >
                        <option value="">-- اختر العميل أو المنشأة --</option>
                        {activeClients.map((c) => (
                          <option key={`client-opt-${c.id}`} value={c.id}>
                            {c.entityName ? `${c.entityName} (${c.name})` : c.name} - {c.phone}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Agreement Type */}
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 mb-1">نوع الاتفاق *</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as AgreementType })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                      >
                        {AGREEMENT_TYPES.map((t) => (
                          <option key={`opt-type-${t.type}`} value={t.type}>
                            {t.icon} {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Agreement Date */}
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 mb-1">تاريخ الاتفاق *</label>
                      <input
                        type="date"
                        value={formData.agreementDate}
                        onChange={(e) => setFormData({ ...formData, agreementDate: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-teal-500 focus:outline-none text-right"
                        required
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 mb-1">رقم هاتف المنشأة للتواصل</label>
                      <input
                        type="tel"
                        value={formData.clientPhone}
                        onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                        placeholder="770000000"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-teal-500 focus:outline-none text-right"
                      />
                    </div>
                  </div>

                  {/* Details Text Area */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">
                      تفاصيل وبنود الاتفاق المتفق عليها * (حقل نصي مفصل)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                      placeholder="مثال: تم الاتفاق على منح صيدلية النور بونص إضافي 3 علب سيبلوكس 500 + شريطين ديراد إم مجاناً عند سداد طلبية شهر يوليو بقيمة..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 font-medium focus:border-teal-500 focus:outline-none leading-relaxed"
                      required
                    />
                  </div>
                </div>

                {/* SECTION 2: PROOF & DELIVERY DOCUMENTATION */}
                <div className={`rounded-xl p-4 border transition-all space-y-3 ${
                  formData.status === "delivered"
                    ? "bg-emerald-50/50 border-emerald-200"
                    : "bg-slate-50 border-slate-200/80"
                }`}>
                  <div className="flex items-center justify-between border-b pb-1.5 border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                      <PackageCheck className="h-4 w-4 text-emerald-700" />
                      <span>الخطوة 2: إثبات وتوثيق التسليم (تم تسليم الاتفاق)</span>
                    </div>

                    {/* Status Radio Pills */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().split("T")[0];
                          setFormData({
                            ...formData,
                            status: "pending"
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-3xs font-bold transition-all cursor-pointer ${
                          formData.status === "pending"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200"
                        }`}
                      >
                        ⏳ قيد الانتظار
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().split("T")[0];
                          setFormData({
                            ...formData,
                            status: "delivered",
                            deliveredAt: formData.deliveredAt || today,
                            deliveredDetails: formData.deliveredDetails || formData.details
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-3xs font-black transition-all cursor-pointer ${
                          formData.status === "delivered"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white text-slate-600 border border-slate-200"
                        }`}
                      >
                        ✓ تم تسليم الاتفاق
                      </button>
                    </div>
                  </div>

                  {formData.status === "delivered" ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-3 overflow-hidden"
                    >
                      {/* What was delivered text area */}
                      <div>
                        <label className="block text-2xs font-bold text-emerald-950 mb-1">
                          ما تم تسليمه فعلياً للعميل * (للتوثيق والمطابقة)
                        </label>
                        <textarea
                          rows={2}
                          value={formData.deliveredDetails}
                          onChange={(e) => setFormData({ ...formData, deliveredDetails: e.target.value })}
                          placeholder="اكتب هنا بالتفصيل ما تم تسليمه في اليد (الكميات، أسماء الأصناف، أرقام التشغيلات إن وجدت)..."
                          className="w-full rounded-xl border border-emerald-300 bg-white p-2.5 text-xs text-slate-900 font-medium focus:border-emerald-500 focus:outline-none"
                          required={formData.status === "delivered"}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Delivery Date */}
                        <div>
                          <label className="block text-3xs font-bold text-slate-700 mb-1">تاريخ التسليم</label>
                          <input
                            type="date"
                            value={formData.deliveredAt}
                            onChange={(e) => setFormData({ ...formData, deliveredAt: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 text-right"
                          />
                        </div>

                        {/* Delivered By */}
                        <div>
                          <label className="block text-3xs font-bold text-slate-700 mb-1">المندوب المسلّم</label>
                          <input
                            type="text"
                            value={formData.deliveredBy}
                            onChange={(e) => setFormData({ ...formData, deliveredBy: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
                          />
                        </div>

                        {/* Invoice Number */}
                        <div>
                          <label className="block text-3xs font-bold text-slate-700 mb-1">رقم الفاتورة / السند</label>
                          <input
                            type="text"
                            value={formData.invoiceNumber}
                            onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                            placeholder="مثال: INV-9840"
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900"
                          />
                        </div>
                      </div>

                      {/* Photo / Invoice Attachment */}
                      <div>
                        <label className="block text-3xs font-bold text-slate-700 mb-1">
                          إرفاق صورة سند الاستلام أو الفاتورة (اختياري)
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-white py-2 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer">
                            <Camera className="h-4 w-4 text-emerald-600" />
                            <span>{formData.invoiceAttachment ? "تغيير صورة السند / الفاتورة" : "التقاط أو رفع صورة الفاتورة"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                          {formData.invoiceAttachment && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewImage(formData.invoiceAttachment)}
                                className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-3xs font-bold"
                              >
                                معاينة
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, invoiceAttachment: "" })}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                                title="إزالة الصورة"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <p className="text-3xs text-slate-500 italic">
                      💡 ملاحظة: عند تسليم البونص أو العينات للعميل، قم بتحديد 'تم تسليم الاتفاق' لتوثيق ما تم تسليمه وتاريخ التسليم ورقم الفاتورة.
                    </p>
                  )}
                </div>

                {/* Modal Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 text-xs font-black shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
                  >
                    {isSaving ? "جاري الحفظ والتوثيق..." : editingAgreement ? "حفظ التعديلات والتوثيق ✓" : "اعتماد وإبرام الاتفاقية 🚀"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMAGE PREVIEW MODAL */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
            <div className="relative max-w-xl w-full bg-white rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-bold text-xs text-slate-900">معاينة صورة الفاتورة / سند الاستلام</h4>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-[70vh] overflow-auto flex items-center justify-center">
                <img
                  src={previewImage}
                  alt="سند الاستلام"
                  className="max-w-full max-h-[65vh] rounded-lg object-contain shadow-md"
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINTABLE VOUCHER MODAL */}
      <AnimatePresence>
        {selectedPrintAgreement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-slate-900 print:m-0 print:p-0">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-black text-base text-slate-900">سند توثيق اتفاقية تجارية</h3>
                <button
                  onClick={() => setSelectedPrintAgreement(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 print:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Printable Body */}
              <div className="border-2 border-slate-900 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                  <div>
                    <h4 className="font-black text-sm text-teal-800">تطبيق مندوبك الطبي</h4>
                    <p className="text-3xs text-slate-500">المندوب المعتمد: د/ بلال القيسي (776600049)</p>
                  </div>
                  <div className="text-left font-mono text-3xs">
                    <div>التاريخ: {selectedPrintAgreement.agreementDate}</div>
                    <div>الرقم المرجعي: {selectedPrintAgreement.id}</div>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <div><strong>المنشأة الطبية:</strong> {selectedPrintAgreement.entityName || selectedPrintAgreement.clientName}</div>
                  <div><strong>المسؤول:</strong> {selectedPrintAgreement.clientName}</div>
                  <div><strong>رقم الهاتف:</strong> <span className="font-mono">{selectedPrintAgreement.clientPhone || "غير مسجل"}</span></div>
                  <div><strong>نوع الاتفاق:</strong> {selectedPrintAgreement.typeLabel || "بونص / عينات"}</div>
                </div>

                <div className="space-y-1">
                  <strong className="block text-slate-800">1. بنود الاتفاق الأصلي:</strong>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 leading-relaxed font-medium">
                    {selectedPrintAgreement.details}
                  </div>
                </div>

                {selectedPrintAgreement.status === "delivered" && (
                  <div className="space-y-1">
                    <strong className="block text-emerald-800">2. ما تم تسليمه وتوثيقه فعلياً:</strong>
                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 leading-relaxed font-bold text-slate-900">
                      {selectedPrintAgreement.deliveredDetails || selectedPrintAgreement.details}
                    </div>
                    <div className="flex justify-between text-3xs text-slate-600 pt-1">
                      <span>تاريخ التسليم: {selectedPrintAgreement.deliveredAt ? new Date(selectedPrintAgreement.deliveredAt).toLocaleDateString("ar-YE") : "موثق"}</span>
                      <span>المسلّم: {selectedPrintAgreement.deliveredBy || "د/ بلال القيسي"}</span>
                      {selectedPrintAgreement.invoiceNumber && <span>رقم الفاتورة: {selectedPrintAgreement.invoiceNumber}</span>}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-300 grid grid-cols-2 text-center text-xs font-bold">
                  <div>توقيع واستلام العميل / المنشأة<br /><br />............................</div>
                  <div>توقيع واعتماد المندوب الطبي<br /><br />د/ بلال القيسي</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedPrintAgreement(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-black text-white hover:bg-teal-700 shadow-md flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>طباعة السند الآن</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default AgreementsManager;
