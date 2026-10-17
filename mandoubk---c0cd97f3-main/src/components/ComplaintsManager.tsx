import React, { useState, useMemo, useRef } from "react";
import {
  MessageSquareHeart,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  MessageCircle,
  Phone,
  Printer,
  Trash2,
  Edit3,
  Camera,
  X,
  Building2,
  User as UserIcon,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Share2,
  Check,
  Filter,
  EyeOff,
  Inbox,
  Award,
  HelpCircle,
  Pill,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Complaint, ComplaintPriority, ComplaintStatus, ComplaintType, User } from "../types";
import { nativePlayClick, nativeVibrate, nativeSuccessFeedback } from "../utils/nativeBridge";

interface ComplaintsManagerProps {
  complaints: Complaint[];
  currentUser: User | null;
  clients?: User[];
  onSaveComplaint: (complaintData: Partial<Complaint>, complaintId?: string) => Promise<boolean>;
  onDeleteComplaint: (complaintId: string) => Promise<boolean>;
  onUpdateReply?: (complaintId: string, reply: string, status: ComplaintStatus) => Promise<boolean>;
  isAdmin?: boolean;
}

const COMPLAINT_TYPES: { type: ComplaintType; label: string; icon: string; bg: string; text: string; badge: string; desc: string }[] = [
  {
    type: "complaint",
    label: "شكوى عامة",
    icon: "⚠️",
    bg: "bg-rose-50 border-rose-200",
    text: "text-rose-800",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    desc: "شكوى بخصوص الخدمة أو التوصيل أو المعاملة"
  },
  {
    type: "suggestion",
    label: "اقتراح تطوير",
    icon: "💡",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    desc: "فكرة أو اقتراح لتحسين التطبيق أو إضافة خدمات"
  },
  {
    type: "quality_issue",
    label: "ملاحظة جودة صنف",
    icon: "💊",
    bg: "bg-purple-50 border-purple-200",
    text: "text-purple-800",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    desc: "ملاحظة فنية حول فاعلية أو تغليف صنف دوائي"
  },
  {
    type: "financial_bonus",
    label: "ملاحظة مالية / بونص",
    icon: "💰",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-800",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    desc: "استفسار بخصوص الأسعار أو البونص أو الحسابات"
  },
  {
    type: "compliment",
    label: "إشادة وتقدير",
    icon: "🌟",
    bg: "bg-teal-50 border-teal-200",
    text: "text-teal-800",
    badge: "bg-teal-100 text-teal-800 border-teal-200",
    desc: "كلمة شكر أو إشادة بجهود المندوب أو الشركة"
  },
  {
    type: "other",
    label: "موضوع آخر",
    icon: "📝",
    bg: "bg-slate-50 border-slate-200",
    text: "text-slate-800",
    badge: "bg-slate-100 text-slate-800 border-slate-200",
    desc: "أي ملاحظة أو استفسار متنوع"
  }
];

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; icon: string; badge: string; bg: string }> = {
  pending: {
    label: "قيد المراجعة ⏳",
    icon: "⏳",
    badge: "bg-amber-100 text-amber-900 border-amber-300",
    bg: "bg-amber-50"
  },
  in_progress: {
    label: "جاري المعالجة والمتابعة 🛠️",
    icon: "🛠️",
    badge: "bg-blue-100 text-blue-900 border-blue-300",
    bg: "bg-blue-50"
  },
  resolved: {
    label: "تم الرد والمعالجة بنجاح ✅",
    icon: "✅",
    badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
    bg: "bg-emerald-50"
  },
  closed: {
    label: "مغلقة ومؤرشفة 📁",
    icon: "📁",
    badge: "bg-slate-100 text-slate-700 border-slate-300",
    bg: "bg-slate-50"
  }
};

const PRIORITY_CONFIG: Record<ComplaintPriority, { label: string; icon: string; badge: string }> = {
  normal: { label: "أهمية عادية", icon: "🟢", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  medium: { label: "أهمية متوسطة", icon: "🟡", badge: "bg-amber-50 text-amber-800 border-amber-200" },
  urgent: { label: "عاجل وهام جداً", icon: "🔴", badge: "bg-rose-50 text-rose-800 border-rose-300 font-bold" }
};

const CANNED_REPLIES = [
  "شكراً جزيلاً لملاحظتكم القيمة. تم التنسيق مع إدارة المبيعات وتوفير المطلوب فوراً.",
  "تم استلام الملاحظة، وجاري مراجعة الدفعة مع قسم الجودة والمستودع وإبلاغكم بالتفاصيل.",
  "تم تصحيح نسبة البونص والخصم وستصلكم الإضافة في أول طلبيّة أو زيارة قادمة بإذن الله.",
  "تمت معالجة الشكوى واستبدال الصنف، ونعتذر عن أي تأخير غير مقصود. رضاكم أولويتنا دائماً.",
  "سعيدون جداً بكلماتكم الطيبة وإشادتكم الكريمة، ونسعى دوماً لتقديم أفضل خدمة تليق بكم."
];

export const ComplaintsManager: React.FC<ComplaintsManagerProps> = ({
  complaints,
  currentUser,
  clients = [],
  onSaveComplaint,
  onDeleteComplaint,
  onUpdateReply,
  isAdmin = true
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Complaint Form State
  const [newForm, setNewForm] = useState<{
    type: ComplaintType;
    subject: string;
    content: string;
    priority: ComplaintPriority;
    isAnonymous: boolean;
    attachment: string;
    clientId: string;
    clientName: string;
    entityName: string;
    clientPhone: string;
  }>({
    type: "complaint",
    subject: "",
    content: "",
    priority: "normal",
    isAnonymous: false,
    attachment: "",
    clientId: currentUser?.id || "",
    clientName: currentUser?.name || "",
    entityName: currentUser?.entityName || "",
    clientPhone: currentUser?.phone || ""
  });

  // Reply Form in Detail Modal
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<ComplaintStatus>("resolved");
  const [isReplying, setIsReplying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter complaints according to user role:
  // - Rep/Admin sees all complaints.
  // - Doctors / Pharmacies see all or their own, with their own highlighted.
  const visibleComplaints = useMemo(() => {
    let list = [...complaints];

    // For clients (non-rep), prioritize their own complaints, or filter if requested
    if (!isAdmin && currentUser) {
      list = list.filter((c) => c.clientId === currentUser.id || c.clientPhone === currentUser.phone);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((c) =>
        c.subject.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q) ||
        (c.entityName && c.entityName.toLowerCase().includes(q)) ||
        (c.adminReply && c.adminReply.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }

    if (typeFilter !== "all") {
      list = list.filter((c) => c.type === typeFilter);
    }

    if (priorityFilter !== "all") {
      list = list.filter((c) => c.priority === priorityFilter);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [complaints, isAdmin, currentUser, searchQuery, statusFilter, typeFilter, priorityFilter]);

  // Quick statistics
  const stats = useMemo(() => {
    const total = visibleComplaints.length;
    const pending = visibleComplaints.filter((c) => c.status === "pending").length;
    const inProgress = visibleComplaints.filter((c) => c.status === "in_progress").length;
    const resolved = visibleComplaints.filter((c) => c.status === "resolved").length;
    const suggestions = visibleComplaints.filter((c) => c.type === "suggestion").length;
    const complaintsCount = visibleComplaints.filter((c) => c.type === "complaint" || c.type === "quality_issue").length;

    return { total, pending, inProgress, resolved, suggestions, complaintsCount };
  }, [visibleComplaints]);

  // Handle open new form
  const handleOpenNew = () => {
    nativePlayClick();
    setNewForm({
      type: "complaint",
      subject: "",
      content: "",
      priority: "normal",
      isAnonymous: false,
      attachment: "",
      clientId: currentUser?.id || "",
      clientName: currentUser?.name || "",
      entityName: currentUser?.entityName || "",
      clientPhone: currentUser?.phone || ""
    });
    setIsNewModalOpen(true);
  };

  // Handle image upload & base64 conversion
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 4 ميجابايت");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewForm((prev) => ({ ...prev, attachment: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Submit new complaint
  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.subject.trim() || !newForm.content.trim()) {
      alert("يرجى ملء عنوان الملاحظة وتفاصيلها");
      return;
    }

    setIsSubmitting(true);
    nativePlayClick();

    try {
      const typeObj = COMPLAINT_TYPES.find((t) => t.type === newForm.type);
      const success = await onSaveComplaint({
        type: newForm.type,
        typeLabel: typeObj?.label,
        subject: newForm.subject.trim(),
        content: newForm.content.trim(),
        priority: newForm.priority,
        isAnonymous: newForm.isAnonymous,
        attachment: newForm.attachment || undefined,
        clientId: newForm.isAnonymous ? "anon" : (currentUser?.id || "u_guest"),
        clientName: newForm.isAnonymous ? "فاعل خير / مجهول (سري)" : (currentUser?.name || "عميل غير محدد"),
        entityName: newForm.isAnonymous ? "جهة سرية" : (currentUser?.entityName || ""),
        clientPhone: newForm.isAnonymous ? "" : (currentUser?.phone || ""),
        clientRole: currentUser?.role || "pharmacy"
      });

      if (success) {
        nativeSuccessFeedback();
        setIsNewModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle open complaint details
  const handleOpenDetail = (complaint: Complaint) => {
    nativePlayClick();
    setSelectedComplaint(complaint);
    setReplyText(complaint.adminReply || "");
    setReplyStatus(complaint.status === "pending" ? "in_progress" : complaint.status);
  };

  // Submit Rep Reply
  const handleSaveReply = async () => {
    if (!selectedComplaint) return;
    setIsReplying(true);
    nativePlayClick();

    try {
      if (onUpdateReply) {
        await onUpdateReply(selectedComplaint.id, replyText, replyStatus);
      } else {
        await onSaveComplaint(
          {
            adminReply: replyText.trim(),
            status: replyStatus,
            repliedBy: currentUser?.name || "د/ بلال القيسي (المندوب الطبي)",
            repliedAt: new Date().toISOString()
          },
          selectedComplaint.id
        );
      }

      nativeSuccessFeedback();
      setSelectedComplaint((prev) =>
        prev
          ? {
              ...prev,
              adminReply: replyText.trim(),
              status: replyStatus,
              repliedBy: currentUser?.name || "د/ بلال القيسي (المندوب الطبي)",
              repliedAt: new Date().toISOString()
            }
          : null
      );
    } finally {
      setIsReplying(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    nativePlayClick();
    if (confirm("هل أنت متأكد من حذف هذه الشكوى/الملاحظة؟")) {
      const ok = await onDeleteComplaint(id);
      if (ok && selectedComplaint?.id === id) {
        setSelectedComplaint(null);
      }
    }
  };

  // Print Summary
  const handlePrintSummary = () => {
    nativePlayClick();
    window.print();
  };

  return (
    <div className="w-full space-y-4 text-slate-800 font-sans" dir="rtl">
      {/* Top Banner / Hero Card */}
      <div className="rounded-2xl bg-linear-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-4 sm:p-6 shadow-md border border-teal-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-teal-600/40 text-teal-200 border border-teal-500/30">
                <MessageSquareHeart className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">صندوق الشكاوى والاقتراحات 📬</h2>
                <p className="text-xs sm:text-sm text-teal-200/90 font-medium">
                  صوتكم مسموع ورضاكم أولويتنا • تصل رسائلكم مباشرة للمندوب وإدارة الشركة
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOpenNew}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
              id="btn-add-complaint"
            >
              <Plus className="h-4 w-4" />
              <span>تقديم شكوى / اقتراح جديد</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={handlePrintSummary}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                title="طباعة تقرير الشكاوى"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">طباعة التقرير</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-teal-700/50">
          <div className="rounded-xl bg-white/10 p-2.5 text-center backdrop-blur-xs border border-white/10">
            <span className="text-3xs text-teal-200 block font-bold">إجمالي الملاحظات</span>
            <span className="text-lg sm:text-xl font-black text-white">{stats.total}</span>
          </div>

          <div className="rounded-xl bg-amber-500/20 p-2.5 text-center backdrop-blur-xs border border-amber-400/30">
            <span className="text-3xs text-amber-200 block font-bold">قيد المراجعة ⏳</span>
            <span className="text-lg sm:text-xl font-black text-amber-300">{stats.pending}</span>
          </div>

          <div className="rounded-xl bg-blue-500/20 p-2.5 text-center backdrop-blur-xs border border-blue-400/30">
            <span className="text-3xs text-blue-200 block font-bold">جاري المتابعة 🛠️</span>
            <span className="text-lg sm:text-xl font-black text-blue-300">{stats.inProgress}</span>
          </div>

          <div className="rounded-xl bg-emerald-500/20 p-2.5 text-center backdrop-blur-xs border border-emerald-400/30">
            <span className="text-3xs text-emerald-200 block font-bold">تم الرد والحل ✅</span>
            <span className="text-lg sm:text-xl font-black text-emerald-300">{stats.resolved}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl bg-white p-3 shadow-xs border border-slate-200 flex flex-col md:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالعنوان، تفاصيل الملاحظة، اسم العميل أو المنشأة..."
            className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-600 focus:outline-hidden transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:bg-white focus:border-teal-600 cursor-pointer"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد المراجعة ⏳</option>
            <option value="in_progress">جاري المعالجة 🛠️</option>
            <option value="resolved">تم الحل ✅</option>
            <option value="closed">مؤرشفة 📁</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:bg-white focus:border-teal-600 cursor-pointer"
          >
            <option value="all">جميع الأنواع</option>
            <option value="complaint">شكوى عامة ⚠️</option>
            <option value="suggestion">اقتراح تطوير 💡</option>
            <option value="quality_issue">جودة صنف 💊</option>
            <option value="financial_bonus">مالية/بونص 💰</option>
            <option value="compliment">إشادة وشكر 🌟</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:bg-white focus:border-teal-600 cursor-pointer"
          >
            <option value="all">جميع درجات الأهمية</option>
            <option value="urgent">عاجل وهام 🔴</option>
            <option value="medium">متوسط 🟡</option>
            <option value="normal">عادي 🟢</option>
          </select>
        </div>
      </div>

      {/* Complaints List Cards */}
      {visibleComplaints.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center border border-dashed border-slate-300 space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
            <Inbox className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-800">لا توجد شكاوى أو اقتراحات تطابق البحث</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              يمكنك كتابة وتقديم أي شكوى أو ملاحظة بخصوص الأصناف أو الخدمة أو تقديم فكرة جديدة لنطور بها التطبيق.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>تقديم ملاحظة الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {visibleComplaints.map((item) => {
            const typeConfig = COMPLAINT_TYPES.find((t) => t.type === item.type) || COMPLAINT_TYPES[0];
            const statusObj = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            const priorityObj = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.normal;
            const hasReply = !!(item.adminReply && item.adminReply.trim());

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleOpenDetail(item)}
                className={`rounded-2xl bg-white p-4 sm:p-5 border transition-all duration-200 hover:shadow-md cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  item.priority === "urgent" ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-200"
                }`}
              >
                {/* Header info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold border ${typeConfig.badge}`}>
                        <span>{typeConfig.icon}</span>
                        <span>{typeConfig.label}</span>
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-3xs font-black border ${priorityObj.badge}`}>
                        <span>{priorityObj.icon}</span>
                        <span>{priorityObj.label}</span>
                      </span>

                      {item.isAnonymous && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-3xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <EyeOff className="h-3 w-3" />
                          <span>إرسال سري</span>
                        </span>
                      )}
                    </div>

                    <span className={`px-2 py-1 rounded-lg text-3xs font-black border shrink-0 ${statusObj.badge}`}>
                      {statusObj.label}
                    </span>
                  </div>

                  {/* Title & Subject */}
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug line-clamp-2">
                      {item.subject}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                      {item.content}
                    </p>
                  </div>

                  {/* Attachment Thumbnail if exists */}
                  {item.attachment && (
                    <div className="flex items-center gap-2 pt-1">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(item.attachment || null);
                        }}
                        className="relative h-12 w-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0 hover:opacity-90 transition-opacity"
                        title="انقر لتكبير المرفق"
                      >
                        <img
                          src={item.attachment}
                          alt="مرفق الشكوى"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-3xs text-teal-700 font-bold">📎 يوجد صورة مرفقة مع الملاحظة</span>
                    </div>
                  )}

                  {/* Admin Reply Highlight Box */}
                  {hasReply ? (
                    <div className="rounded-xl bg-teal-50/80 p-3 border border-teal-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-3xs font-black text-teal-900">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                          <span>رد المندوب / الإدارة ({item.repliedBy || "د/ بلال القيسي"})</span>
                        </span>
                        {item.repliedAt && (
                          <span className="text-slate-400 font-normal">
                            {new Date(item.repliedAt).toLocaleDateString("ar-YE")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-teal-950 font-medium leading-relaxed bg-white/70 p-2 rounded-lg border border-teal-100">
                        {item.adminReply}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-amber-50/60 p-2 text-3xs text-amber-800 border border-amber-100 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>قيد المراجعة والمتابعة من قبل المندوب الطبي وإدارة المبيعات</span>
                    </div>
                  )}
                </div>

                {/* Footer Sender and Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 font-bold text-slate-700">
                      <Building2 className="h-3 w-3 text-slate-400" />
                      <span>{item.entityName || item.clientName}</span>
                    </div>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleDateString("ar-YE")}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Quick Rep Call / WhatsApp */}
                    {isAdmin && !item.isAnonymous && item.clientPhone && (
                      <a
                        href={`https://wa.me/967${item.clientPhone.replace(/^0+/, "").replace(/\D/g, "")}?text=${encodeURIComponent(
                          `مرحباً دكتور، بخصوص ملاحظتكم الكريمة في التطبيق: (${item.subject})...`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        title="مراسلة العميل واتساب للمتابعة"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="حذف الملاحظة"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. Modal: Submit New Complaint / Suggestion */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                    <MessageSquareHeart className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">تقديم شكوى أو اقتراح جديد</h3>
                    <p className="text-2xs text-slate-500">نرحب بجميع آرائكم وملاحظاتكم لتطوير العمل وتقديم أفضل خدمة</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitNew} className="space-y-4 text-xs">
                {/* Category Type Picker */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">نوع الملاحظة:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COMPLAINT_TYPES.map((t) => (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => {
                          nativePlayClick();
                          setNewForm((prev) => ({ ...prev, type: t.type }));
                        }}
                        className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                          newForm.type === t.type
                            ? "bg-teal-50/90 border-teal-600 ring-2 ring-teal-500/20 text-teal-950 font-black shadow-xs"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{t.icon}</span>
                          {newForm.type === t.type && <Check className="h-3.5 w-3.5 text-teal-600" />}
                        </div>
                        <span className="text-xs font-bold">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority Selection */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">درجة الأهمية والاستعجال:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["normal", "medium", "urgent"] as ComplaintPriority[]).map((p) => {
                      const pObj = PRIORITY_CONFIG[p];
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            nativePlayClick();
                            setNewForm((prev) => ({ ...prev, priority: p }));
                          }}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                            newForm.priority === p
                              ? p === "urgent"
                                ? "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-300"
                                : "bg-teal-50 border-teal-600 text-teal-950 ring-2 ring-teal-300"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          <span className="ml-1">{pObj.icon}</span>
                          <span>{pObj.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject / Title */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">عنوان الملاحظة / الصنف المعني:</label>
                  <input
                    type="text"
                    required
                    value={newForm.subject}
                    onChange={(e) => setNewForm((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="مثال: استفسار حول بونص سيبلوكس 500، أو ملاحظة على مواعيد التوصيل..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-teal-600 focus:outline-hidden text-xs sm:text-sm font-medium"
                  />
                </div>

                {/* Content / Details */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">تفاصيل الشكوى أو الاقتراح بالتفصيل:</label>
                  <textarea
                    required
                    rows={4}
                    value={newForm.content}
                    onChange={(e) => setNewForm((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="اكتب هنا جميع التفاصيل والملاحظات بوضوح لنتمكن من المتابعة وحل المشكلة في أسرع وقت..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-teal-600 focus:outline-hidden text-xs sm:text-sm leading-relaxed"
                  />
                </div>

                {/* Attachment Uploader */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">إرفاق صورة اختيارية (صورة المنتج، الفاتورة، أو المشكلة):</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {newForm.attachment ? (
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-teal-50 border border-teal-200">
                      <img
                        src={newForm.attachment}
                        alt="المرفق"
                        className="h-12 w-12 rounded-lg object-cover border border-teal-300 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-2xs font-bold text-teal-900 block truncate">تم إرفاق الصورة بنجاح ✓</span>
                        <span className="text-3xs text-teal-700">ستظهر مع الملاحظة للمندوب والإدارة</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewForm((prev) => ({ ...prev, attachment: "" }))}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                        title="إلغاء المرفق"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Camera className="h-4 w-4 text-teal-600" />
                      <span>التقاط أو اختيار صورة من الهاتف</span>
                    </button>
                  )}
                </div>

                {/* Anonymous Checkbox */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="chk-anonymous"
                    checked={newForm.isAnonymous}
                    onChange={(e) => setNewForm((prev) => ({ ...prev, isAnonymous: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 text-teal-600 rounded-sm border-slate-300 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="chk-anonymous" className="cursor-pointer">
                    <span className="font-bold text-slate-800 block text-xs">إرسال سري (بدون إظهار اسمي أو رقم هاتفي) 🔒</span>
                    <span className="text-3xs text-slate-500 block">
                      ستصل الملاحظة للإدارة والمندوب باسم "فاعل خير مجهول" للحفاظ على كامل الخصوصية.
                    </span>
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSubmitting ? "جاري الإرسال..." : "إرسال الملاحظة الآن"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2. Modal: Complaint Details & Rep Reply */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-2xs font-bold border ${STATUS_CONFIG[selectedComplaint.status]?.badge}`}>
                      {STATUS_CONFIG[selectedComplaint.status]?.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-3xs font-bold border ${PRIORITY_CONFIG[selectedComplaint.priority]?.badge}`}>
                      {PRIORITY_CONFIG[selectedComplaint.priority]?.label}
                    </span>
                  </div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 pt-1">
                    {selectedComplaint.subject}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Sender Details */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Building2 className="h-4 w-4 text-teal-600" />
                    <span>{selectedComplaint.entityName || selectedComplaint.clientName}</span>
                    {selectedComplaint.isAnonymous && <span className="text-3xs text-rose-600 font-bold">(سري ومجهول)</span>}
                  </div>
                  <div className="text-3xs text-slate-500 flex items-center gap-2">
                    <span>المرسل: {selectedComplaint.clientName}</span>
                    <span>•</span>
                    <span>التاريخ: {new Date(selectedComplaint.createdAt).toLocaleString("ar-YE")}</span>
                  </div>
                </div>

                {/* Direct Rep Actions (Call & WhatsApp) */}
                {isAdmin && !selectedComplaint.isAnonymous && selectedComplaint.clientPhone && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${selectedComplaint.clientPhone}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 font-bold text-2xs transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>اتصال</span>
                    </a>

                    <a
                      href={`https://wa.me/967${selectedComplaint.clientPhone.replace(/^0+/, "").replace(/\D/g, "")}?text=${encodeURIComponent(
                        `مرحباً دكتور، بخصوص ملاحظتكم الكريمة في التطبيق: (${selectedComplaint.subject})...`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-2xs shadow-xs transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>واتساب</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Complaint Text Details */}
              <div className="space-y-1.5">
                <label className="font-bold text-xs text-slate-700 block">نص وتفاصيل الملاحظة:</label>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedComplaint.content}
                </div>
              </div>

              {/* Attachment Full View */}
              {selectedComplaint.attachment && (
                <div className="space-y-1.5">
                  <label className="font-bold text-xs text-slate-700 block">المرفق والصور التوضيحية:</label>
                  <div
                    onClick={() => setPreviewImage(selectedComplaint.attachment || null)}
                    className="relative max-h-48 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer group flex items-center justify-center"
                  >
                    <img
                      src={selectedComplaint.attachment}
                      alt="مرفق"
                      className="max-h-48 w-auto object-contain transition-transform group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                      انقر لتكبير الصورة 🔍
                    </div>
                  </div>
                </div>
              )}

              {/* Rep / Admin Reply Section */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-teal-600" />
                    <span>الرد والحل الرسمي (يظهر للعميل فوراً):</span>
                  </label>

                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <span className="text-3xs font-bold text-slate-500">تحديث الحالة:</span>
                      <select
                        value={replyStatus}
                        onChange={(e) => setReplyStatus(e.target.value as ComplaintStatus)}
                        className="px-2 py-1 text-2xs font-bold rounded-lg border border-slate-300 bg-white cursor-pointer"
                      >
                        <option value="pending">قيد المراجعة ⏳</option>
                        <option value="in_progress">جاري المعالجة 🛠️</option>
                        <option value="resolved">تم الحل ✅</option>
                        <option value="closed">إغلاق وأرشفة 📁</option>
                      </select>
                    </div>
                  )}
                </div>

                {isAdmin ? (
                  <div className="space-y-2">
                    {/* Quick Canned Replies */}
                    <div className="space-y-1">
                      <span className="text-3xs text-slate-400 font-bold">ردود سريعة جاهزة:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {CANNED_REPLIES.map((cr, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              nativePlayClick();
                              setReplyText(cr);
                            }}
                            className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-3xs font-semibold border border-teal-200 transition-colors text-right cursor-pointer"
                          >
                            {cr.slice(0, 32)}...
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="اكتب ردك ومتابعتك هنا، وسيصل فوراً للعميل مع تنبيه..."
                      className="w-full p-2.5 rounded-xl border border-teal-300 bg-teal-50/30 focus:bg-white focus:border-teal-600 focus:outline-hidden text-xs sm:text-sm leading-relaxed"
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleSaveReply}
                        disabled={isReplying}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        <span>{isReplying ? "جاري الحفظ..." : "اعتماد الرد وتحديث الحالة"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {selectedComplaint.adminReply ? (
                      <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 space-y-1">
                        <div className="flex items-center justify-between text-3xs font-black text-teal-900">
                          <span>بواسطة: {selectedComplaint.repliedBy || "د/ بلال القيسي"}</span>
                          {selectedComplaint.repliedAt && (
                            <span>{new Date(selectedComplaint.repliedAt).toLocaleString("ar-YE")}</span>
                          )}
                        </div>
                        <p className="text-xs text-teal-950 font-medium leading-relaxed">
                          {selectedComplaint.adminReply}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                        لم يتم الرد على الملاحظة بعد، جاري المتابعة من قبل المندوب الطبي.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 3. Modal: Image Zoom Preview */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {previewImage && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden bg-black shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 left-3 z-10 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={previewImage}
                alt="معاينة الصورة بالحجم الكامل"
                className="w-auto h-auto max-h-[80vh] object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
