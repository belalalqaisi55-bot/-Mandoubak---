import React, { useState, useMemo } from "react";
import {
  Archive,
  Trash2,
  RotateCcw,
  Search,
  Download,
  AlertTriangle,
  Clock,
  Building,
  User as UserIcon,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Printer,
  Mail,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Coins,
  Truck,
  CheckCheck,
  CheckSquare,
  Square,
  X,
  Sparkles,
  ArrowUpDown,
  Calendar,
} from "lucide-react";
import { Order } from "../types";

export interface CompletedOrdersArchiveViewProps {
  archivedOrders: Order[];
  activeOrders?: Order[];
  isAdmin?: boolean;
  isRep?: boolean;
  adminName?: string;
  onArchiveOrder?: (orderId: string) => Promise<void>;
  onRestoreOrder: (orderId: string) => Promise<void>;
  onPermanentDeleteOrder: (order: Order) => Promise<void> | void;
  onClearAllArchived: () => Promise<void>;
  onRestoreAllArchived: () => Promise<void>;
  onExportCSV: (ordersToExport: Order[]) => void;
  onNavigateToActiveOrders?: () => void;
  onPrintOrder?: (order: Order) => void;
  onEmailOrder?: (order: Order) => void;
}

// Safe string slicing helper (never crashes on numeric or undefined IDs)
const safeSlice = (val: any, len: number): string => {
  if (val === null || val === undefined) return "—";
  const str = String(val);
  return str.length > len ? str.slice(-len) : str || "—";
};

// Safe date formatter helper
const formatSafeDate = (val: any): string => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("ar-YE");
  } catch {
    return "—";
  }
};

// Helper: Check if an order was completed or archived today
export const isOrderArchivedToday = (order: Order | null | undefined): boolean => {
  if (!order) return false;
  const val = order.archivedAt || order.completedAt || order.createdAt;
  if (!val) return false;
  const d = new Date(val);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

export const CompletedOrdersArchiveView: React.FC<CompletedOrdersArchiveViewProps> = ({
  archivedOrders = [],
  activeOrders = [],
  isAdmin = true,
  isRep = true,
  adminName = "د. بلال القيسي",
  onArchiveOrder,
  onRestoreOrder,
  onPermanentDeleteOrder,
  onClearAllArchived,
  onRestoreAllArchived,
  onExportCSV,
  onNavigateToActiveOrders,
  onPrintOrder,
  onEmailOrder,
}) => {
  // Tabs for separating delivered vs completed/archived
  const [subTab, setSubTab] = useState<"all" | "delivered" | "completed" | "archived">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [sortBy, setSortBy] = useState<
    "date_newest" | "date_oldest" | "client_asc" | "client_desc" | "highest_value" | "highest_qty" | "newest" | "oldest"
  >("date_newest");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Modal states for in-app confirmations (replaces window.confirm/alert)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "delete_single" | "restore_single" | "clear_all" | "restore_all" | "delete_selected" | "restore_selected";
    title: string;
    message: string;
    targetOrder?: Order;
    confirmText: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    type: "clear_all",
    title: "",
    message: "",
    confirmText: "",
  });

  const [modalLoading, setModalLoading] = useState(false);

  // Full authorization for both medical representative and administrator
  const isAuthorized = Boolean(isAdmin || isRep);

  // Pool of orders to show: combine archived orders and any completed active orders (deduplicated by ID)
  const allCompletedOrders = useMemo(() => {
    const map = new Map<string, Order>();

    // Add archived orders safely
    (Array.isArray(archivedOrders) ? archivedOrders : []).forEach((o, idx) => {
      if (!o) return;
      const id = String(o.id || `arch-${idx}`);
      map.set(id, { ...o, id, isArchived: true });
    });

    // Also include active orders that have status completed or delivered
    (Array.isArray(activeOrders) ? activeOrders : []).forEach((o, idx) => {
      if (!o) return;
      const id = String(o.id || `act-${idx}`);
      const st = String(o.status || "").toLowerCase();
      if (st === "completed" || st === "delivered") {
        if (!map.has(id)) {
          map.set(id, { ...o, id });
        }
      }
    });

    return Array.from(map.values());
  }, [archivedOrders, activeOrders]);

  // Determine order category helper
  const isDeliveredOrder = (order: Order) => {
    if (!order) return false;
    const s = String(order.status || "").toLowerCase();
    const notes = String(order.notes || "").toLowerCase();
    return s === "completed" || s === "delivered" || notes.includes("تسليم") || notes.includes("توصيل");
  };

  const isArchivedOrder = (order: Order) => {
    if (!order) return false;
    return Boolean(order.isArchived);
  };

  // Toggle order expanded card
  const toggleExpand = (orderId: string) => {
    const id = String(orderId || "");
    setExpandedOrders((prev) => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }));
  };

  // Toggle select order
  const toggleSelectOrder = (orderId: string) => {
    const id = String(orderId || "");
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter orders by subTab, search term, and date
  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const now = new Date();

    let list = allCompletedOrders.filter((order) => {
      if (!order) return false;

      // 1. Separation SubTab filter
      if (subTab === "delivered") {
        if (!isDeliveredOrder(order)) return false;
      } else if (subTab === "completed") {
        if (String(order.status || "").toLowerCase() !== "completed") return false;
      } else if (subTab === "archived") {
        if (!isArchivedOrder(order)) return false;
      }

      // 2. Date filter
      if (dateFilter !== "all") {
        const dateVal = order.archivedAt || order.createdAt;
        const orderDate = dateVal ? new Date(dateVal) : null;
        if (orderDate && !isNaN(orderDate.getTime())) {
          const diffMs = now.getTime() - orderDate.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (dateFilter === "today" && diffHours > 24) return false;
          if (dateFilter === "week" && diffHours > 24 * 7) return false;
          if (dateFilter === "month" && diffHours > 24 * 30) return false;
        }
      }

      // 3. Search term
      if (!term) return true;
      const matchEntity = String(order.entityName || "").toLowerCase().includes(term);
      const matchClient = String(order.clientName || "").toLowerCase().includes(term);
      const matchId = String(order.id || "").toLowerCase().includes(term);
      const matchNotes = String(order.notes || "").toLowerCase().includes(term);
      const matchItems = Array.isArray(order.items) && order.items.some((it) =>
        it && String(it.productName || "").toLowerCase().includes(term)
      );

      return matchEntity || matchClient || matchId || matchNotes || matchItems;
    });

    // Sort order: by Date (newest/oldest) or Customer Name (A-Z/Z-A) or Monetary Value or Quantity
    list.sort((a, b) => {
      const dateA = new Date(a?.archivedAt || a?.completedAt || a?.createdAt || 0).getTime() || 0;
      const dateB = new Date(b?.archivedAt || b?.completedAt || b?.createdAt || 0).getTime() || 0;

      const clientA = String(a?.entityName || a?.clientName || "").trim();
      const clientB = String(b?.entityName || b?.clientName || "").trim();

      const calcAmount = (ord: Order) =>
        (Array.isArray(ord?.items) ? ord.items : []).reduce((s, it) => {
          if (!it) return s;
          const q = Number(it.quantity) || 0;
          const p = parseFloat(String(it.price || "0").replace(/[^0-9.]/g, "")) || 0;
          return s + q * p;
        }, 0);

      const calcQty = (ord: Order) =>
        (Array.isArray(ord?.items) ? ord.items : []).reduce((s, it) => {
          if (!it) return s;
          return s + (Number(it.quantity) || 0);
        }, 0);

      // Date Sorting
      if (sortBy === "date_newest" || sortBy === "newest") return dateB - dateA;
      if (sortBy === "date_oldest" || sortBy === "oldest") return dateA - dateB;

      // Customer Name Sorting (Arabic locale aware)
      if (sortBy === "client_asc") return clientA.localeCompare(clientB, "ar");
      if (sortBy === "client_desc") return clientB.localeCompare(clientA, "ar");

      // Monetary Value & Package Quantity
      if (sortBy === "highest_value") return calcAmount(b) - calcAmount(a);
      if (sortBy === "highest_qty") return calcQty(b) - calcQty(a);

      return dateB - dateA;
    });

    return list;
  }, [allCompletedOrders, subTab, searchTerm, dateFilter, sortBy]);

  // Aggregate statistics including daily completed archive counter
  const stats = useMemo(() => {
    const totalCount = allCompletedOrders.length;
    let deliveredCount = 0;
    let completedCount = 0;
    let archivedCount = 0;
    let archivedTodayCount = 0;
    let totalItemsQty = 0;
    let totalMonetaryValue = 0;
    const uniqueEntities = new Set<string>();

    allCompletedOrders.forEach((order) => {
      if (!order) return;
      if (isDeliveredOrder(order)) deliveredCount++;
      if (String(order.status || "").toLowerCase() === "completed") completedCount++;
      if (isArchivedOrder(order)) archivedCount++;
      if (isOrderArchivedToday(order)) archivedTodayCount++;

      if (order.entityName) uniqueEntities.add(String(order.entityName));
      (Array.isArray(order.items) ? order.items : []).forEach((item) => {
        if (!item) return;
        const qty = Number(item.quantity) || 0;
        const price = parseFloat(String(item.price || "0").replace(/[^0-9.]/g, "")) || 0;
        totalItemsQty += qty;
        totalMonetaryValue += qty * price;
      });
    });

    return {
      totalCount,
      deliveredCount,
      completedCount,
      archivedCount,
      archivedTodayCount,
      totalItemsQty,
      totalMonetaryValue,
      uniqueEntitiesCount: uniqueEntities.size,
    };
  }, [allCompletedOrders]);

  // Select all / Deselect all
  const handleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map((o) => String(o.id))));
    }
  };

  // Execute confirmed modal action
  const handleConfirmModalAction = async () => {
    setModalLoading(true);
    try {
      if (confirmModal.type === "delete_single" && confirmModal.targetOrder) {
        await onPermanentDeleteOrder(confirmModal.targetOrder);
      } else if (confirmModal.type === "restore_single" && confirmModal.targetOrder) {
        await onRestoreOrder(String(confirmModal.targetOrder.id));
      } else if (confirmModal.type === "clear_all") {
        await onClearAllArchived();
        setSelectedOrderIds(new Set());
      } else if (confirmModal.type === "restore_all") {
        await onRestoreAllArchived();
        setSelectedOrderIds(new Set());
      } else if (confirmModal.type === "restore_selected") {
        for (const orderId of Array.from(selectedOrderIds)) {
          await onRestoreOrder(orderId);
        }
        setSelectedOrderIds(new Set());
      } else if (confirmModal.type === "delete_selected") {
        const ordersToDelete = allCompletedOrders.filter((o) => selectedOrderIds.has(String(o.id)));
        for (const order of ordersToDelete) {
          await onPermanentDeleteOrder(order);
        }
        setSelectedOrderIds(new Set());
      }
    } catch (e) {
      console.error("Error executing modal action:", e);
    } finally {
      setModalLoading(false);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Authorization Guard: Only block if user is neither rep nor admin
  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-rose-200 shadow-xl text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shadow-inner">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
            🔒 قسم محمي وخاص بالمندوب والمسؤول
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            أرشيف الطلبيات المكتملة مخصص للمندوب والإدارة
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
            عذراً، هذا الأرشيف وقاعدة بيانات التوريدات المسلمة مخصصة فقط للمندوب الطبي والمشرف العام ({adminName}).
          </p>
        </div>

        {onNavigateToActiveOrders && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onNavigateToActiveOrders}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" />
              <span>العودة للطلبيات النشطة</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-5 sm:p-7 text-white shadow-xl border border-teal-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-teal-500/20 text-teal-300 border border-teal-400/30">
                <Archive className="h-3.5 w-3.5" />
                <span>أرشيف الطلبيات المسلمة والمكتملة</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>خاص بالمندوب الطبي والإدارة 🛡️</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-extrabold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                <span>المشرف / المندوب: {adminName}</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <span>أرشيف وسجل الطلبيات المسلمة والمكتملة</span>
              <span className="px-3 py-0.5 rounded-full text-xs sm:text-sm font-black bg-teal-500 text-slate-950 font-mono shadow-xs">
                {allCompletedOrders.length} طلبية
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-teal-100/80 font-medium leading-relaxed">
              واجهة متكاملة تتيح للمندوب استعراض الطلبيات المسلمة والمكتملة بشكل منفصل، مع إمكانية استعادة الطلبيات النشطة أو حذفها نهائياً مع حفظ نسخة احتياطية في سلة المحذوفات.
            </p>
          </div>

          {/* Quick Nav & Batch Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {onNavigateToActiveOrders && (
              <button
                type="button"
                onClick={onNavigateToActiveOrders}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <ArrowRight className="h-4 w-4" />
                <span>العودة للطلبيات النشطة</span>
              </button>
            )}

            {filteredOrders.length > 0 && (
              <button
                type="button"
                onClick={() => onExportCSV(filteredOrders)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                title="تصدير كشف الطلبيات المسلمة إلى Excel"
              >
                <Download className="h-4 w-4" />
                <span>تصدير Excel ({filteredOrders.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient Decorative glow */}
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Visual Indicator: Daily Completed Orders Archive Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-4 shadow-sm border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shrink-0 shadow-inner">
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <Sparkles className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-3xs font-extrabold uppercase tracking-wider text-emerald-300">
                مؤشر الأرشفة اليومية (Daily Archive Indicator)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-4xs font-black bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                مباشر 🟢
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
              <span>الطلبيات المكتملة المؤرشفة خلال تاريخ اليوم:</span>
              <span className="font-mono text-base sm:text-lg font-black text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-lg border border-amber-400/30 shadow-xs">
                {stats.archivedTodayCount}
              </span>
              <span className="text-xs text-emerald-200 font-bold">طلبية مكتملة</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setDateFilter(dateFilter === "today" ? "all" : "today")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
              dateFilter === "today"
                ? "bg-amber-400 hover:bg-amber-300 text-slate-950 font-black ring-2 ring-amber-300/50 shadow-md"
                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 hover:border-emerald-300"
            }`}
            title="تصفية فورية لعرض طلبيات اليوم فقط"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{dateFilter === "today" ? "عرض كافة الفترات" : "عرض مؤرشفات اليوم فقط ⚡"}</span>
          </button>
        </div>
      </div>

      {/* KPI & Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-3xs sm:text-2xs font-bold">الطلبيات المنتهية</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Archive className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono">
            {stats.totalCount} <span className="text-xs font-sans font-bold text-slate-500">طلبية</span>
          </div>
          <div className="flex items-center gap-1.5 text-4xs text-slate-500 pt-1 flex-wrap">
            <span className="text-emerald-700 font-bold">🚚 {stats.deliveredCount} مسلمة</span>
            <span>•</span>
            <span className="text-teal-700 font-bold">🗄️ {stats.archivedCount} مؤرشفة</span>
          </div>
        </div>

        {/* Visual Indicator KPI Card: Today's Completed Archives */}
        <div
          onClick={() => setDateFilter(dateFilter === "today" ? "all" : "today")}
          className={`p-4 rounded-2xl border shadow-2xs space-y-1 transition-all cursor-pointer ${
            dateFilter === "today"
              ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
              : "bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 border-emerald-300/80 hover:border-emerald-400 hover:shadow-xs"
          }`}
          title="انقر لتصفية طلبيات اليوم"
        >
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-3xs sm:text-2xs font-bold flex items-center gap-1">
              <span>أُرشفت اليوم</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
            </span>
            <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-700">
              <Sparkles className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-900 font-mono flex items-baseline gap-1">
            {stats.archivedTodayCount}{" "}
            <span className="text-xs font-sans font-bold text-emerald-700">طلبية</span>
          </div>
          <p className="text-4xs text-emerald-700 font-bold">
            {stats.archivedTodayCount > 0 ? "🌟 مكتملة خلال اليوم" : "لم تؤرشف طلبيات اليوم بعد"}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-3xs sm:text-2xs font-bold">إجمالي العبوات المسلمة</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-700 font-mono">
            {stats.totalItemsQty.toLocaleString()}{" "}
            <span className="text-xs font-sans font-bold text-slate-500">عبوة</span>
          </div>
          <p className="text-4xs text-emerald-700 font-medium">مجموع الكميات الموردة للعملاء</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-3xs sm:text-2xs font-bold">إجمالي المبيعات المكتملة</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-indigo-900 font-mono">
            {stats.totalMonetaryValue.toLocaleString()}{" "}
            <span className="text-xs font-sans font-bold text-slate-500">ر.ي</span>
          </div>
          <p className="text-4xs text-indigo-700 font-medium">قيمة التوريدات المحصلة</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-3xs sm:text-2xs font-bold">المنشآت المستفيدة</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-blue-900 font-mono">
            {stats.uniqueEntitiesCount}{" "}
            <span className="text-xs font-sans font-bold text-slate-500">منشأة</span>
          </div>
          <p className="text-4xs text-blue-700 font-medium">صيدليات ومراكز طبية مسجلة</p>
        </div>
      </div>

      {/* SEPARATION TABS: Delivered vs Completed vs Archived */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          <button
            type="button"
            onClick={() => setSubTab("all")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              subTab === "all"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>كافة الطلبيات المنتهية</span>
            <span className={`px-2 py-0.5 rounded-full text-3xs font-mono font-bold ${
              subTab === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {stats.totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("delivered")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              subTab === "delivered"
                ? "bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500/30"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60"
            }`}
          >
            <Truck className="h-4 w-4 text-emerald-500" />
            <span>الطلبيات المسلمة (Delivered)</span>
            <span className={`px-2 py-0.5 rounded-full text-3xs font-mono font-bold ${
              subTab === "delivered" ? "bg-white/20 text-white" : "bg-emerald-200 text-emerald-900"
            }`}>
              {stats.deliveredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("completed")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              subTab === "completed"
                ? "bg-teal-700 text-white shadow-md ring-2 ring-teal-500/30"
                : "bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/60"
            }`}
          >
            <CheckCheck className="h-4 w-4 text-teal-500" />
            <span>الطلبيات المكتملة (Completed)</span>
            <span className={`px-2 py-0.5 rounded-full text-3xs font-mono font-bold ${
              subTab === "completed" ? "bg-white/20 text-white" : "bg-teal-200 text-teal-900"
            }`}>
              {stats.completedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("archived")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              subTab === "archived"
                ? "bg-indigo-700 text-white shadow-md ring-2 ring-indigo-500/30"
                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/60"
            }`}
          >
            <Archive className="h-4 w-4 text-indigo-500" />
            <span>الأرشيف المالي والإداري (Archived)</span>
            <span className={`px-2 py-0.5 rounded-full text-3xs font-mono font-bold ${
              subTab === "archived" ? "bg-white/20 text-white" : "bg-indigo-200 text-indigo-900"
            }`}>
              {stats.archivedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="البحث باسم الصيدلية، المسؤول، الصنف الدوائي، أو رقم الطلب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-2xs transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                مسح
              </button>
            )}
          </div>

          {/* Time Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 shrink-0">
            <span className="text-3xs font-bold text-slate-400 ml-1">الفترة:</span>
            {(
              [
                { id: "all", label: "كافة الفترات" },
                { id: "today", label: "اليوم" },
                { id: "week", label: "هذا الأسبوع" },
                { id: "month", label: "هذا الشهر" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDateFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  dateFilter === f.id
                    ? "bg-teal-700 text-white shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                <span>{f.label}</span>
                {f.id === "today" && stats.archivedTodayCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-4xs font-mono font-black ${
                    dateFilter === "today" ? "bg-amber-300 text-slate-950" : "bg-emerald-600 text-white"
                  }`}>
                    {stats.archivedTodayCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Dual Sort Controls: Quick Toggle Buttons + Detailed Select */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setSortBy(sortBy === "date_newest" || sortBy === "newest" ? "date_oldest" : "date_newest");
                }}
                className={`px-2.5 py-1 rounded-lg text-3xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  sortBy === "date_newest" || sortBy === "date_oldest" || sortBy === "newest" || sortBy === "oldest"
                    ? "bg-teal-700 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="فرز فوري حسب التاريخ (تنازلي / تصاعدي)"
              >
                <Calendar className="h-3 w-3" />
                <span>التاريخ {sortBy === "date_oldest" || sortBy === "oldest" ? "⬆️" : "⬇️"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSortBy(sortBy === "client_asc" ? "client_desc" : "client_asc");
                }}
                className={`px-2.5 py-1 rounded-lg text-3xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  sortBy === "client_asc" || sortBy === "client_desc"
                    ? "bg-teal-700 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="فرز فوري حسب اسم العميل أو المنشأة الطبية (أ-ي أو ي-أ)"
              >
                <UserIcon className="h-3 w-3" />
                <span>العميل {sortBy === "client_desc" ? "ي-أ" : "أ-ي"}</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-100 hover:bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
                title="خيارات الفرز الشاملة"
              >
                <option value="date_newest">📅 التاريخ: الأحدث أولاً (تنازلي)</option>
                <option value="date_oldest">📅 التاريخ: الأقدم أولاً (تصاعدي)</option>
                <option value="client_asc">👤 اسم العميل: أ - ي (تصاعدي)</option>
                <option value="client_desc">👤 اسم العميل: ي - أ (تنازلي)</option>
                <option value="highest_value">💰 القيمة المالية: الأعلى أولاً</option>
                <option value="highest_qty">📦 كمية العبوات: الأكثر أولاً</option>
              </select>
            </div>
          </div>

          {/* Global Batch Controls */}
          {isAuthorized && allCompletedOrders.length > 0 && (
            <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 lg:border-r lg:pr-3 border-slate-100 pt-2 lg:pt-0">
              <button
                type="button"
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    type: "restore_all",
                    title: "استعادة كافة الطلبيات إلى القائمة النشطة 🔄",
                    message: `هل أنت متأكد من استعادة كافة الطلبيات (${allCompletedOrders.length} طلبية) إلى قائمة العمل النشطة ليتسنى للمندوب استكمال ومتابعة الإجراءات؟`,
                    confirmText: "نعم، استعادة الكل الآن",
                    isDestructive: false,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                title="استعادة كافة الطلبيات المؤرشفة للقائمة النشطة"
              >
                <RotateCcw className="h-3.5 w-3.5 text-teal-700" />
                <span>استعادة الكل 🔄</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    type: "clear_all",
                    title: "حذف نهائي وإفراغ الأرشيف 🗑️",
                    message: `تحذير: سيتم حذف جميع الطلبيات المسلمة والمؤرشفة بالكامل من هذا القسم وإزالتها، مع حفظ نسخة احتياطية آمنة تلقائياً في سلة محذوفات الإدارة.`,
                    confirmText: "نعم، إفراغ الأرشيف نهائياً",
                    isDestructive: true,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                title="حذف نهائي لكافة الطلبيات المؤرشفة ونقلها لسلة المحذوفات"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                <span>إفراغ الأرشيف 🗑️</span>
              </button>
            </div>
          )}
        </div>

        {/* Multi-Selection Sticky Bar */}
        {filteredOrders.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                {selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-teal-600" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400" />
                )}
                <span>
                  {selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0
                    ? "إلغاء تحديد الكل"
                    : "تحديد كل المعروض"}
                </span>
              </button>

              {selectedOrderIds.size > 0 && (
                <span className="font-extrabold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  تم تحديد {selectedOrderIds.size} طلبية
                </span>
              )}
            </div>

            {selectedOrderIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmModal({
                      isOpen: true,
                      type: "restore_selected",
                      title: "استعادة الطلبيات المحددة 🔄",
                      message: `هل تريد استعادة ${selectedOrderIds.size} طلبية محددة إلى قائمة العمل النشطة؟`,
                      confirmText: "استعادة المحددة",
                      isDestructive: false,
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>استعادة المحددة ({selectedOrderIds.size})</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setConfirmModal({
                      isOpen: true,
                      type: "delete_selected",
                      title: "حذف نهائي للطلبيات المحددة 🗑️",
                      message: `هل تريد حذف ${selectedOrderIds.size} طلبية محددة نهائياً من الأرشيف ونقلها إلى سلة المحذوفات؟`,
                      confirmText: "حذف المحددة",
                      isDestructive: true,
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>حذف المحددة ({selectedOrderIds.size})</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Orders List View */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center shadow-inner">
            <Archive className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h4 className="font-black text-slate-900 text-base">
              {searchTerm || dateFilter !== "all" || subTab !== "all"
                ? "لا توجد نتائج مطابقة لبحثك في هذا القسم"
                : "أرشيف الطلبيات المسلمة والمكتملة فارغ حالياً"}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {searchTerm || dateFilter !== "all" || subTab !== "all"
                ? "جرّب تغيير كلمات البحث أو اختيار تبويب أو فترة زمنية مختلفة لعرض النتائج."
                : "عند قيامك بتسليم أي طلبية أو اكتمالها، سيتم إدراجها تلقائياً وبشكل فوري في هذا القسم لتنظيم شاشة العمل وسجلات التوريد."}
            </p>
          </div>
          {onNavigateToActiveOrders && (
            <button
              type="button"
              onClick={onNavigateToActiveOrders}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <span>الانتقال لطلبيات العملاء النشطة</span>
              <ArrowRight className="h-4 w-4 rotate-180" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order, orderIdx) => {
            const orderIdStr = String(order?.id || `arch-${orderIdx}`);
            const isExpanded = expandedOrders[orderIdStr] !== false; // expanded by default
            const isSelected = selectedOrderIds.has(orderIdStr);
            const isDelivered = isDeliveredOrder(order);
            const isArchived = isArchivedOrder(order);

            const orderTotalQty = (Array.isArray(order?.items) ? order.items : []).reduce(
              (sum, item) => sum + (item ? (Number(item.quantity) || 0) : 0),
              0
            );
            const orderTotalAmount = (Array.isArray(order?.items) ? order.items : []).reduce((sum, item) => {
              if (!item) return sum;
              const qty = Number(item.quantity) || 0;
              const price = parseFloat(String(item.price || "0").replace(/[^0-9.]/g, "")) || 0;
              return sum + qty * price;
            }, 0);
            const isLoading = actionLoadingId === orderIdStr;

            return (
              <div
                key={`completed-arch-order-${orderIdStr}-${orderIdx}`}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isSelected
                    ? "border-teal-500 ring-2 ring-teal-500/20 shadow-md"
                    : isDelivered
                    ? "border-emerald-200/90 shadow-2xs hover:shadow-xs"
                    : "border-teal-200/80 shadow-2xs hover:shadow-xs"
                }`}
              >
                {/* Order Card Top Header */}
                <div className={`p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isDelivered
                    ? "bg-gradient-to-r from-emerald-50/40 via-slate-50 to-white"
                    : "bg-gradient-to-r from-slate-50 via-teal-50/30 to-white"
                }`}>
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Checkbox for batch selection */}
                    <button
                      type="button"
                      onClick={() => toggleSelectOrder(orderIdStr)}
                      className="pt-1 text-slate-400 hover:text-teal-600 cursor-pointer"
                      title={isSelected ? "إلغاء التحديد" : "تحديد الطلبية"}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-teal-600" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-300" />
                      )}
                    </button>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-base sm:text-lg">
                          {order?.entityName || "منشأة طبية"}
                        </span>
                        {order?.clientName && (
                          <span className="text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            <span>{order.clientName}</span>
                          </span>
                        )}

                        {/* Separate Visual Status Badges */}
                        {isDelivered && (
                          <span className="inline-flex items-center gap-1 text-3xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <Truck className="h-3 w-3 text-emerald-600" />
                            <span>تم التسليم والتوريد 🚚</span>
                          </span>
                        )}

                        {String(order?.status || "").toLowerCase() === "completed" && (
                          <span className="inline-flex items-center gap-1 text-3xs font-extrabold bg-teal-100 text-teal-800 border border-teal-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <CheckCheck className="h-3 w-3 text-teal-600" />
                            <span>مكتملة ✅</span>
                          </span>
                        )}

                        {isArchived && (
                          <span className="inline-flex items-center gap-1 text-3xs font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <Archive className="h-3 w-3 text-indigo-600" />
                            <span>مؤرشفة 🗄️</span>
                          </span>
                        )}

                        {/* Visual Indicator: Archived Today Badge */}
                        {isOrderArchivedToday(order) && (
                          <span className="inline-flex items-center gap-1 text-3xs font-black bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 text-amber-950 border border-amber-400 px-2.5 py-0.5 rounded-full shadow-2xs">
                            <Sparkles className="h-3 w-3 text-amber-600 shrink-0" />
                            <span>أُرشفت اليوم 🌟</span>
                          </span>
                        )}

                        <span className="text-3xs font-mono text-slate-400">
                          ID: #{safeSlice(orderIdStr, 8)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 text-3xs text-slate-500 font-medium flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>تاريخ الطلب: {formatSafeDate(order?.createdAt)}</span>
                        </span>
                        {order?.archivedAt && (
                          <span className="flex items-center gap-1 text-teal-800 font-bold">
                            <Archive className="h-3 w-3 text-teal-600" />
                            <span>تاريخ الأرشفة: {formatSafeDate(order.archivedAt)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-black text-teal-900 font-mono">
                        {orderTotalAmount > 0 ? `${orderTotalAmount.toLocaleString()} ر.ي` : "—"}
                      </div>
                      <div className="text-3xs text-slate-400 font-medium">
                        {(order?.items || []).length} صنف ({orderTotalQty} عبوة)
                      </div>
                    </div>

                    {isAuthorized && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={async () => {
                            setActionLoadingId(orderIdStr);
                            try {
                              await onRestoreOrder(orderIdStr);
                            } finally {
                              setActionLoadingId(null);
                            }
                          }}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-2xs transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          title="استعادة هذه الطلبية من الأرشيف وإعادتها فوراً للقائمة النشطة"
                          id={`btn-quick-restore-${orderIdStr}`}
                        >
                          <RotateCcw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                          <span>{isLoading ? "جاري..." : "استعادة 🔄"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              type: "delete_single",
                              title: "تأكيد الحذف النهائي للطلبية 🗑️",
                              message: `هل أنت متأكد من حذف الطلبية رقم (${safeSlice(orderIdStr, 6)}) الخاصة بـ "${order?.entityName || order?.clientName || 'العميل'}" نهائياً من الأرشيف؟ سيتم حفظ نسخة احتياطية آمنة في سلة محذوفات الإدارة.`,
                              targetOrder: order,
                              confirmText: "نعم، حذف نهائي",
                              isDestructive: true,
                            });
                          }}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 font-bold text-2xs transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          title="حذف نهائي للطلبية المؤرشفة ونقلها لسلة المحذوفات"
                          id={`btn-quick-delete-${orderIdStr}`}
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>حذف نهائي 🗑️</span>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpand(orderIdStr)}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      title={isExpanded ? "طي التفاصيل" : "عرض تفاصيل الأصناف"}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Order Products Body */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 space-y-3.5 animate-in fade-in duration-150">
                    {/* Products Table */}
                    <div className="border border-slate-200/80 rounded-xl bg-slate-50/50 p-2.5 sm:p-3 overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="text-slate-400 font-bold border-b border-slate-200/80 pb-2 text-3xs">
                            <th className="pb-2 pl-3">الصنف الدوائي</th>
                            <th className="pb-2 px-2 text-center">الكمية المسلمة</th>
                            <th className="pb-2 px-2 text-center">السعر الفردي</th>
                            <th className="pb-2 pr-3 text-left">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(Array.isArray(order?.items) ? order.items : []).map((item, itemIdx) => {
                            if (!item) return null;
                            const qty = Number(item.quantity) || 0;
                            const price =
                              parseFloat(String(item.price || "0").replace(/[^0-9.]/g, "")) || 0;
                            const lineTotal = qty * price;

                            return (
                              <tr
                                key={`arch-table-item-${orderIdStr}-${itemIdx}`}
                                className="text-slate-800 font-medium"
                              >
                                <td className="py-2 pl-3 font-bold text-slate-900 text-xs">
                                  {item.productName || "صنف غير محدد"}
                                </td>
                                <td className="py-2 px-2 text-center font-mono font-black text-teal-800 bg-teal-50/80 rounded">
                                  {item.quantity ?? "0"}
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-slate-600">
                                  {price > 0 ? `${price.toLocaleString()} ر.ي` : "—"}
                                </td>
                                <td className="py-2 pr-3 text-left font-mono font-bold text-slate-900">
                                  {lineTotal > 0 ? `${lineTotal.toLocaleString()} ر.ي` : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Order Notes if present */}
                    {order?.notes && (
                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-2xs text-amber-950 flex items-start gap-2">
                        <span className="font-black shrink-0">ملاحظات الطلبية:</span>
                        <span>{order.notes}</span>
                      </div>
                    )}

                    {/* Card Actions Bottom Bar */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-2xs text-slate-500 font-medium">
                        <span>
                          عدد الأصناف: <strong className="text-slate-900">{(order?.items || []).length}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          إجمالي العبوات:{" "}
                          <strong className="text-teal-700 font-mono font-black">
                            {orderTotalQty} عبوة
                          </strong>
                        </span>
                        {orderTotalAmount > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              القيمة:{" "}
                              <strong className="text-slate-900 font-mono font-black">
                                {orderTotalAmount.toLocaleString()} ر.ي
                              </strong>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Action Buttons: Restore & Permanent Delete */}
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {onPrintOrder && (
                          <button
                            type="button"
                            onClick={() => onPrintOrder(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                            title="طباعة كشف الطلبية"
                            id={`btn-rep-print-order-${order.id}`}
                          >
                            <Printer className="h-3.5 w-3.5 text-slate-600" />
                            <span>طباعة 🖨️</span>
                          </button>
                        )}

                        {onEmailOrder && (
                          <button
                            type="button"
                            onClick={() => onEmailOrder(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 font-bold text-xs transition-colors cursor-pointer group"
                            title="إرسال تحديث بالبريد الإلكتروني للعميل"
                            id={`btn-rep-email-update-${order.id}`}
                          >
                            <Mail className="h-3.5 w-3.5 text-indigo-600 group-hover:text-white transition-colors" />
                            <span>إرسال تحديث بالبريد ✉️</span>
                          </button>
                        )}

                        {isAuthorized && (
                          <>
                            {/* Archive toggle button if active */}
                            {onArchiveOrder && !isArchived && (
                              <button
                                type="button"
                                onClick={async () => {
                                  setActionLoadingId(orderIdStr);
                                  try {
                                    await onArchiveOrder(orderIdStr);
                                  } finally {
                                    setActionLoadingId(null);
                                  }
                                }}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs border border-indigo-200 transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                                title="نقل الطلبية للأرشيف"
                              >
                                <Archive className="h-3.5 w-3.5 text-indigo-600" />
                                <span>أرشفة 🗄️</span>
                              </button>
                            )}

                            {/* Restore Button (استعادة) */}
                            <button
                              type="button"
                              onClick={async () => {
                                setActionLoadingId(orderIdStr);
                                try {
                                  await onRestoreOrder(orderIdStr);
                                } finally {
                                  setActionLoadingId(null);
                                }
                              }}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                              title="استعادة هذه الطلبية من الأرشيف وإعادتها للقائمة النشطة"
                              id={`btn-restore-order-${orderIdStr}`}
                            >
                              <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                              <span>{isLoading ? "جاري الاستعادة..." : "استعادة للقائمة النشطة 🔄"}</span>
                            </button>

                            {/* Permanent Delete Button (الحذف النهائي) */}
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  type: "delete_single",
                                  title: "تأكيد الحذف النهائي للطلبية 🗑️",
                                  message: `هل أنت متأكد من حذف الطلبية رقم (${safeSlice(orderIdStr, 6)}) الخاصة بـ "${order?.entityName || order?.clientName || 'العميل'}" نهائياً من الأرشيف؟ سيتم حفظ نسخة احتياطية آمنة في سلة محذوفات الإدارة.`,
                                  targetOrder: order,
                                  confirmText: "نعم، حذف نهائي",
                                  isDestructive: true,
                                });
                              }}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 hover:border-rose-600 font-bold text-xs transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                              title="حذف الطلبية نهائياً من الأرشيف ونقلها لسلة المحذوفات"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>حذف نهائي 🗑️</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* IN-APP MODAL CONFIRMATION DIALOG (No window.alert/confirm) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`p-2.5 rounded-2xl ${
                  confirmModal.isDestructive
                    ? "bg-rose-100 text-rose-700"
                    : "bg-teal-100 text-teal-700"
                }`}>
                  {confirmModal.isDestructive ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <RotateCcw className="h-5 w-5" />
                  )}
                </div>
                <h3 className="font-black text-slate-900 text-base">
                  {confirmModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {confirmModal.message}
            </p>

            {confirmModal.targetOrder && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-3xs space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>العميل: {confirmModal.targetOrder.entityName || confirmModal.targetOrder.clientName || "العميل"}</span>
                  <span className="font-mono">ID: #{safeSlice(confirmModal.targetOrder.id, 8)}</span>
                </div>
                <div className="text-slate-500">
                  {(confirmModal.targetOrder.items || []).length} صنف دوائي مسجل
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleConfirmModalAction}
                disabled={modalLoading}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black text-white shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                  confirmModal.isDestructive
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-teal-600 hover:bg-teal-700"
                }`}
              >
                {modalLoading ? "جاري التنفيذ..." : confirmModal.confirmText}
              </button>

              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={modalLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletedOrdersArchiveView;
