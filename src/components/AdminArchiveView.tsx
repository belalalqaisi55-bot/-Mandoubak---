import React, { useState, useEffect, useMemo } from "react";
import {
  Archive,
  Trash2,
  RotateCcw,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Phone,
  Building,
  Package,
  FileCheck2,
  MessageSquareHeart,
  ShoppingCart,
  Pill,
  Sparkles,
  Download,
  ShieldAlert,
  ArrowUpDown,
  RefreshCw,
  X,
  Layers,
  ChevronRight,
  Info,
  DollarSign,
  Printer,
  Mail,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Order } from "../types";

export interface TrashItem {
  id: string;
  itemType: "order" | "agreement" | "product" | "client" | "complaint" | "category" | "other";
  title: string;
  subtitle?: string;
  originalId: string;
  deletedAt: string;
  deletedBy?: string;
  details?: Record<string, any>;
  data: any;
}

// Safe string slicing helper (never crashes on numeric or undefined IDs)
const safeSlice = (val: any, len: number): string => {
  if (val === null || val === undefined) return "—";
  const str = String(val);
  return str.length > len ? str.slice(-len) : str || "—";
};

// Safe date formatter helper
const formatSafeDate = (val: any, options?: Intl.DateTimeFormatOptions): string => {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "—";
    return options ? d.toLocaleString("ar-YE", options) : d.toLocaleString("ar-YE");
  } catch {
    return "—";
  }
};

interface AdminArchiveViewProps {
  isAdmin?: boolean;
  isRep?: boolean;
  adminName?: string;
  archivedOrders?: Order[];
  onArchiveOrder?: (orderId: string) => Promise<void>;
  onUpdateOrderStatus?: (orderId: string, status: "pending" | "approved" | "completed" | "cancelled") => Promise<void>;
  onRestoreOrder?: (orderId: string) => Promise<void>;
  onPermanentDeleteOrder?: (order: Order) => void;
  onClearAllArchived?: () => Promise<void>;
  onRestoreAllArchived?: () => Promise<void>;
  onExportCSV?: (ordersToExport: Order[]) => void;
  onNavigateToActiveOrders?: () => void;
  onPrintOrder?: (order: Order) => void;
  onEmailOrder?: (order: Order) => void;
  onRestoreSuccess?: (itemType: string, restoredData: any) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export const AdminArchiveView: React.FC<AdminArchiveViewProps> = ({
  isAdmin = true,
  isRep = true,
  adminName = "د. بلال القيسي",
  archivedOrders = [],
  onArchiveOrder,
  onUpdateOrderStatus,
  onRestoreOrder,
  onPermanentDeleteOrder,
  onClearAllArchived,
  onRestoreAllArchived,
  onExportCSV,
  onNavigateToActiveOrders,
  onPrintOrder,
  onEmailOrder,
  onRestoreSuccess,
  showToast
}) => {
  const isAuthorized = Boolean(isAdmin || isRep);
  // Default to completed_orders so archived orders list is displayed immediately
  const [mainViewMode, setMainViewMode] = useState<"completed_orders" | "trash">("completed_orders");

  // Archived orders filter, search, and sort state
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>("");
  const [orderDateFilter, setOrderDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [orderSortBy, setOrderSortBy] = useState<
    "date_newest" | "date_oldest" | "client_asc" | "client_desc" | "highest_value" | "highest_qty"
  >("date_newest");
  const [orderActionLoadingId, setOrderActionLoadingId] = useState<string | null>(null);
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<Order | null>(null);
  const [isConfirmClearAllOrdersOpen, setIsConfirmClearAllOrdersOpen] = useState<boolean>(false);
  const [isBatchActionLoading, setIsBatchActionLoading] = useState<boolean>(false);

  // Trash archive state
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loadingTrash, setLoadingTrash] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "type">("newest");
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<TrashItem | null>(null);
  const [confirmDeleteTrashId, setConfirmDeleteTrashId] = useState<string | null>(null);
  const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState<boolean>(false);
  const [trashActionInProgress, setTrashActionInProgress] = useState<string | null>(null);

  const notify = (msg: string, type: "success" | "error" | "info" = "info") => {
    if (showToast) {
      showToast(msg, type);
    } else {
      console.log(`[Toast ${type}]:`, msg);
    }
  };

  // Fetch trash items from server and sync with localStorage fallback
  const fetchTrash = async () => {
    setLoadingTrash(true);
    try {
      const res = await fetch("/api/trash");
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.items)) {
          setItems(json.items);
          localStorage.setItem("mandoubak_trash_archive", JSON.stringify(json.items));
          setLoadingTrash(false);
          return;
        }
      }
      throw new Error("Server fetch failed");
    } catch (e) {
      try {
        const saved = localStorage.getItem("mandoubak_trash_archive");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        }
      } catch (err) {}
    } finally {
      setLoadingTrash(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchTrash();
    }
  }, [isAuthorized]);

  // Handle single order restore
  const handleRestoreArchivedOrder = async (orderId: string) => {
    setOrderActionLoadingId(orderId);
    try {
      if (onRestoreOrder) {
        await onRestoreOrder(orderId);
      }
      notify("تمت استعادة الطلبية للقائمة النشطة بنجاح 🔄", "success");
    } catch (err) {
      notify("حدث خطأ أثناء استعادة الطلبية للقائمة النشطة", "error");
    } finally {
      setOrderActionLoadingId(null);
    }
  };

  // Handle permanent order delete
  const handleExecutePermanentDeleteOrder = (order: Order) => {
    try {
      if (onPermanentDeleteOrder) {
        onPermanentDeleteOrder(order);
      }
      notify("تم حذف الطلبية نهائياً من الأرشيف 🗑️", "success");
    } catch (err) {
      notify("تعذر حذف الطلبية نهائياً", "error");
    } finally {
      setConfirmDeleteOrder(null);
    }
  };

  // Filtered and sorted archived orders
  const filteredArchivedOrders = useMemo(() => {
    const term = orderSearchQuery.trim().toLowerCase();
    const now = new Date();

    const list = (Array.isArray(archivedOrders) ? archivedOrders : []).filter((order) => {
      if (!order) return false;

      // Date filter
      if (orderDateFilter !== "all") {
        const dateVal = order.archivedAt || order.createdAt;
        const orderDate = dateVal ? new Date(dateVal) : null;
        if (orderDate && !isNaN(orderDate.getTime())) {
          const diffMs = now.getTime() - orderDate.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (orderDateFilter === "today" && diffHours > 24) return false;
          if (orderDateFilter === "week" && diffHours > 24 * 7) return false;
          if (orderDateFilter === "month" && diffHours > 24 * 30) return false;
        }
      }

      // Search term
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

    // Sorting by date (newest/oldest) or customer name (A-Z/Z-A) or value or quantity
    list.sort((a, b) => {
      const dateA = new Date(a?.archivedAt || a?.createdAt || 0).getTime() || 0;
      const dateB = new Date(b?.archivedAt || b?.createdAt || 0).getTime() || 0;

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

      if (orderSortBy === "date_newest") return dateB - dateA;
      if (orderSortBy === "date_oldest") return dateA - dateB;
      if (orderSortBy === "client_asc") return clientA.localeCompare(clientB, "ar");
      if (orderSortBy === "client_desc") return clientB.localeCompare(clientA, "ar");
      if (orderSortBy === "highest_value") return calcAmount(b) - calcAmount(a);
      if (orderSortBy === "highest_qty") return calcQty(b) - calcQty(a);
      return dateB - dateA;
    });

    return list;
  }, [archivedOrders, orderSearchQuery, orderDateFilter, orderSortBy]);

  // Archived orders statistics including today's archives counter
  const orderStats = useMemo(() => {
    const safeOrders = Array.isArray(archivedOrders) ? archivedOrders : [];
    const totalCount = safeOrders.length;
    let archivedTodayCount = 0;
    let totalItemsQty = 0;
    let totalMonetaryValue = 0;
    const uniqueEntities = new Set<string>();
    const today = new Date();

    safeOrders.forEach((order) => {
      if (!order) return;
      const val = order.archivedAt || order.createdAt;
      if (val) {
        const d = new Date(val);
        if (
          !isNaN(d.getTime()) &&
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear()
        ) {
          archivedTodayCount++;
        }
      }

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
      archivedTodayCount,
      totalItemsQty,
      totalMonetaryValue,
      uniqueEntitiesCount: uniqueEntities.size,
    };
  }, [archivedOrders]);

  // Export CSV for archived orders
  const handleExportArchivedOrdersCSV = () => {
    if (onExportCSV) {
      onExportCSV(filteredArchivedOrders);
      return;
    }
    if (filteredArchivedOrders.length === 0) {
      notify("لا توجد طلبيات للتصدير في الأرشيف", "info");
      return;
    }
    const headers = ["رقم الطلبية", "المنشأة / العميل", "التاريخ", "تاريخ الأرشفة", "عدد الأصناف", "إجمالي القيمة"];
    const rows = filteredArchivedOrders.map((o) => {
      const total = (Array.isArray(o?.items) ? o.items : []).reduce((sum, it) => {
        if (!it) return sum;
        const qty = Number(it.quantity) || 0;
        const pr = parseFloat(String(it.price || "0").replace(/[^0-9.]/g, "")) || 0;
        return sum + qty * pr;
      }, 0);
      return [
        String(o?.id || "—"),
        `"${String(o?.entityName || o?.clientName || "").replace(/"/g, '""')}"`,
        formatSafeDate(o?.createdAt),
        o?.archivedAt ? formatSafeDate(o.archivedAt) : "—",
        (o?.items || []).length,
        total
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ارشيف_الطلبيات_المكتملة_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("تم تصدير كشف الطلبيات المؤرشفة بنجاح 📥", "success");
  };

  // Trash handlers
  const handleRestoreTrash = async (item: TrashItem) => {
    setTrashActionInProgress(item.id);
    try {
      const res = await fetch(`/api/trash/${item.id}/restore`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(prev => prev.filter(t => t.id !== item.id));
        const updated = items.filter(t => t.id !== item.id);
        localStorage.setItem("mandoubak_trash_archive", JSON.stringify(updated));
        notify(data.message || `تم استرجاع "${item.title}" بنجاح 🔄`, "success");
        if (onRestoreSuccess) {
          onRestoreSuccess(item.itemType, item.data);
        }
        if (selectedItemForDetails?.id === item.id) {
          setSelectedItemForDetails(null);
        }
      } else {
        notify(data.error || data.message || "تعذر استرجاع العنصر", "error");
      }
    } catch (err: any) {
      notify("حدث خطأ في الاتصال أثناء الاسترجاع", "error");
    } finally {
      setTrashActionInProgress(null);
    }
  };

  const handlePermanentDeleteTrash = async (itemId: string) => {
    setTrashActionInProgress(itemId);
    try {
      const res = await fetch(`/api/trash/${itemId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setItems(prev => prev.filter(t => t.id !== itemId));
        const updated = items.filter(t => t.id !== itemId);
        localStorage.setItem("mandoubak_trash_archive", JSON.stringify(updated));
        notify("تم حذف العنصر نهائياً من الأرشيف 🗑️", "success");
        if (selectedItemForDetails?.id === itemId) {
          setSelectedItemForDetails(null);
        }
      } else {
        notify("تعذر حذف العنصر نهائياً", "error");
      }
    } catch (e) {
      notify("فشل الاتصال بالخادم", "error");
    } finally {
      setTrashActionInProgress(null);
      setConfirmDeleteTrashId(null);
    }
  };

  const handleClearAllTrash = async () => {
    setLoadingTrash(true);
    try {
      const url = selectedType !== "all" ? `/api/trash?itemType=${selectedType}` : "/api/trash";
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        if (selectedType === "all") {
          setItems([]);
          localStorage.removeItem("mandoubak_trash_archive");
        } else {
          const updated = items.filter(t => t.itemType !== selectedType);
          setItems(updated);
          localStorage.setItem("mandoubak_trash_archive", JSON.stringify(updated));
        }
        notify("تم إفراغ سلة المحذوفات نهائياً 🗑️", "success");
      } else {
        notify("تعذر إفراغ سلة المحذوفات", "error");
      }
    } catch (e) {
      notify("فشل الاتصال أثناء إفراغ الأرشيف", "error");
    } finally {
      setLoadingTrash(false);
      setIsConfirmClearAllOpen(false);
    }
  };

  // Filtered trash items
  const filteredTrashItems = useMemo(() => {
    let result = Array.isArray(items) ? items : [];
    if (selectedType !== "all") {
      result = result.filter(item => item && item.itemType === selectedType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        if (!item) return false;
        const titleMatch = String(item.title || "").toLowerCase().includes(q);
        const subMatch = String(item.subtitle || "").toLowerCase().includes(q);
        const idMatch = String(item.originalId || "").toLowerCase().includes(q);
        const detailsMatch = item.details ? JSON.stringify(item.details).toLowerCase().includes(q) : false;
        return titleMatch || subMatch || idMatch || detailsMatch;
      });
    }

    return [...result].sort((a, b) => {
      if (!a || !b) return 0;
      if (sortBy === "newest") {
        const timeB = new Date(b.deletedAt || 0).getTime() || 0;
        const timeA = new Date(a.deletedAt || 0).getTime() || 0;
        return timeB - timeA;
      }
      if (sortBy === "oldest") {
        const timeB = new Date(b.deletedAt || 0).getTime() || 0;
        const timeA = new Date(a.deletedAt || 0).getTime() || 0;
        return timeA - timeB;
      }
      if (sortBy === "type") {
        return String(a.itemType || "").localeCompare(String(b.itemType || ""));
      }
      return 0;
    });
  }, [items, selectedType, searchQuery, sortBy]);

  const trashCounts = useMemo(() => {
    const map: Record<string, number> = {
      all: (Array.isArray(items) ? items : []).length,
      order: 0,
      agreement: 0,
      product: 0,
      client: 0,
      complaint: 0
    };
    (Array.isArray(items) ? items : []).forEach(i => {
      if (i && i.itemType && map[i.itemType] !== undefined) {
        map[i.itemType]++;
      }
    });
    return map;
  }, [items]);

  const getTypeMeta = (type: string) => {
    switch (type) {
      case "order":
        return {
          label: "طلبية محذوفة",
          icon: <ShoppingCart className="h-4 w-4" />,
          color: "bg-teal-50 text-teal-800 border-teal-200/80",
          badgeBg: "bg-teal-600 text-white"
        };
      case "agreement":
        return {
          label: "اتفاقية محذوفة",
          icon: <FileCheck2 className="h-4 w-4" />,
          color: "bg-amber-50 text-amber-900 border-amber-200/80",
          badgeBg: "bg-amber-600 text-white"
        };
      case "product":
        return {
          label: "صنف محذوف",
          icon: <Pill className="h-4 w-4" />,
          color: "bg-blue-50 text-blue-800 border-blue-200/80",
          badgeBg: "bg-blue-600 text-white"
        };
      case "client":
        return {
          label: "عميل محذوف",
          icon: <User className="h-4 w-4" />,
          color: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
          badgeBg: "bg-emerald-600 text-white"
        };
      case "complaint":
        return {
          label: "شكوى محذوفة",
          icon: <MessageSquareHeart className="h-4 w-4" />,
          color: "bg-rose-50 text-rose-800 border-rose-200/80",
          badgeBg: "bg-rose-600 text-white"
        };
      default:
        return {
          label: "عنصر محذوف",
          icon: <Package className="h-4 w-4" />,
          color: "bg-slate-50 text-slate-800 border-slate-200",
          badgeBg: "bg-slate-700 text-white"
        };
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-rose-200 shadow-xl text-center space-y-5 animate-in fade-in duration-300">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shadow-inner">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
            🔒 منطقة خاصة بالمندوب والإدارة
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            أرشيف الطلبيات مخصص للمندوب والإدارة
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
            عذراً، هذا الأرشيف مخصص للمندوب الطبي والمشرف العام ({adminName}).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Segmented Navigation Switcher: Archived Orders vs Trash Archive */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => setMainViewMode("completed_orders")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mainViewMode === "completed_orders"
              ? "bg-white text-teal-950 shadow-sm border border-teal-200/80 font-black"
              : "text-slate-600 hover:text-teal-900"
          }`}
        >
          <Archive className="h-4 w-4 text-emerald-600" />
          <span>قائمة الطلبيات المؤرشفة</span>
          <span className="px-2 py-0.5 rounded-full text-3xs font-black bg-emerald-100 text-emerald-800">
            {archivedOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainViewMode("trash")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mainViewMode === "trash"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60 font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Trash2 className="h-4 w-4 text-rose-600" />
          <span>سلة ومحذوفات النظام الأخرى</span>
          <span className="px-2 py-0.5 rounded-full text-3xs font-black bg-rose-100 text-rose-800">
            {items.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: ARCHIVED ORDERS VIEW (Default Primary View) */}
      {/* ========================================================================= */}
      {mainViewMode === "completed_orders" && (
        <div className="space-y-6">
          {/* Top Banner & Header for Archived Orders */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-5 sm:p-7 text-white shadow-xl border border-teal-500/20">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-teal-500/20 text-teal-300 border border-teal-400/30">
                    <Archive className="h-3.5 w-3.5" />
                    <span>أرشيف الطلبيات المؤرشفة والمكتملة</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>خاص بالمندوب الطبي والإدارة 🛡️</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-extrabold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                    <span>المشرف: {adminName}</span>
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  <span>قائمة الطلبيات المؤرشفة</span>
                  <span className="px-3 py-0.5 rounded-full text-xs sm:text-sm font-black bg-teal-500 text-slate-950 font-mono shadow-xs">
                    {archivedOrders.length} طلبية
                  </span>
                </h2>

                <p className="text-xs sm:text-sm text-teal-100/80 font-medium leading-relaxed">
                  استعراض كامل للطلبيات المؤرشفة مع إمكانية استعادة الطلبية للقائمة النشطة أو حذفها نهائياً من الأرشيف بنقرة واحدة لحفظ سجلات العمل وتنظيم شاشة التوريد.
                </p>
              </div>

              {/* Action Buttons Top Bar */}
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

                {archivedOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportArchivedOrdersCSV}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                    title="تصدير كشف الطلبيات المؤرشفة إلى Excel"
                  >
                    <Download className="h-4 w-4" />
                    <span>تصدير Excel ({filteredArchivedOrders.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Ambient Decorative glow */}
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-3xs sm:text-2xs font-bold">الطلبيات المؤرشفة</span>
                <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                  <Archive className="h-4 w-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono">
                {orderStats.totalCount} <span className="text-xs font-sans font-bold text-slate-500">طلبية</span>
              </div>
              <p className="text-4xs text-teal-700 font-medium">سجلات مكتملة ومؤرشفة</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-3xs sm:text-2xs font-bold">إجمالي العبوات</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <ShoppingBag className="h-4 w-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-black text-emerald-700 font-mono">
                {orderStats.totalItemsQty.toLocaleString()}{" "}
                <span className="text-xs font-sans font-bold text-slate-500">عبوة</span>
              </div>
              <p className="text-4xs text-emerald-700 font-medium">مجموع الكميات بالأرشيف</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-3xs sm:text-2xs font-bold">القيمة الإجمالية</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono">
                {orderStats.totalMonetaryValue.toLocaleString()}{" "}
                <span className="text-xs font-sans font-bold text-slate-500">ر.ي</span>
              </div>
              <p className="text-4xs text-amber-700 font-medium">إجمالي المبيعات المكتملة</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-3xs sm:text-2xs font-bold">المنشآت والصيدليات</span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Building className="h-4 w-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono">
                {orderStats.uniqueEntitiesCount}{" "}
                <span className="text-xs font-sans font-bold text-slate-500">عميل</span>
              </div>
              <p className="text-4xs text-indigo-700 font-medium">صيدليات ومراكز طبية</p>
            </div>
          </div>

          {/* Filter & Search Bar for Archived Orders */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="بحث في الطلبيات المؤرشفة بالصيدلية، الطبيب، رقم الطلبية، أو الصنف..."
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
              {orderSearchQuery && (
                <button
                  type="button"
                  onClick={() => setOrderSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: "all", label: "كافة الفترات" },
                { id: "today", label: "اليوم" },
                { id: "week", label: "آخر 7 أيام" },
                { id: "month", label: "آخر 30 يوم" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOrderDateFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    orderDateFilter === tab.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Batch Action Buttons */}
            {archivedOrders.length > 0 && (
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                {onRestoreAllArchived && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsBatchActionLoading(true);
                      await onRestoreAllArchived();
                      setIsBatchActionLoading(false);
                      notify("تمت استعادة كافة الطلبيات إلى القائمة النشطة بنجاح 🔄", "success");
                    }}
                    disabled={isBatchActionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                    title="استعادة كافة الطلبيات المؤرشفة للقائمة النشطة"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-teal-700" />
                    <span>استعادة الكل للقائمة النشطة 🔄</span>
                  </button>
                )}

                {onClearAllArchived && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmClearAllOrdersOpen(true)}
                    disabled={isBatchActionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                    title="حذف نهائي لكافة الطلبيات المؤرشفة"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    <span>إفراغ الأرشيف نهائياً</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Batch Clear All Confirmation Alert */}
          {isConfirmClearAllOrdersOpen && (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-950 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>تأكيد الحذف النهائي: هل تريد إفراغ أرشيف الطلبيات بالكامل؟</span>
              </div>
              <p className="text-2xs text-rose-800 leading-relaxed">
                سيتم حذف كافة الطلبيات المؤرشفة بشكل نهائي وإزالتها من الأرشيف. هل أنت متأكد من المتابعة؟
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    if (onClearAllArchived) {
                      setIsBatchActionLoading(true);
                      await onClearAllArchived();
                      setIsBatchActionLoading(false);
                      notify("تم إفراغ أرشيف الطلبيات نهائياً 🗑️", "success");
                    }
                    setIsConfirmClearAllOrdersOpen(false);
                  }}
                  disabled={isBatchActionLoading}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isBatchActionLoading ? "جاري الحذف..." : "نعم، حذف وإفراغ الآن 🗑️"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmClearAllOrdersOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء التراجع
                </button>
              </div>
            </div>
          )}

          {/* Orders Cards List */}
          {filteredArchivedOrders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <div className="h-16 w-16 rounded-3xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center shadow-inner">
                <Archive className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-black text-slate-900 text-base">
                  {orderSearchQuery || orderDateFilter !== "all"
                    ? "لا توجد نتائج مطابقة لبحثك في أرشيف الطلبيات"
                    : "قائمة الطلبيات المؤرشفة فارغة حالياً"}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {orderSearchQuery || orderDateFilter !== "all"
                    ? "جرّب تغيير كلمات البحث أو اختيار فترة زمنية مختلفة لعرض النتائج."
                    : "عند قيامك بأرشفة أو إكمال أي طلبية من القائمة النشطة، سيتم إدراجها هنا فوراً مع إمكانية استعادتها للقائمة النشطة أو حذفها نهائياً."}
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
              {filteredArchivedOrders.map((order, orderIdx) => {
                const orderIdStr = String(order?.id || `arch-${orderIdx}`);
                const isItemActionBusy = orderActionLoadingId === orderIdStr;
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

                const createdDateStr = formatSafeDate(order?.createdAt, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });
                const archivedDateStr = order?.archivedAt
                  ? formatSafeDate(order.archivedAt, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : null;

                return (
                  <motion.div
                    key={`archived-order-${orderIdStr}-${orderIdx}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-teal-50/20 to-white border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-xl bg-teal-600 text-white text-3xs font-black font-mono shadow-2xs">
                            #{safeSlice(orderIdStr, 6).toUpperCase()}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>مكتملة ومؤرشفة 🗄️</span>
                          </span>
                          {archivedDateStr && (
                            <span className="inline-flex items-center gap-1 text-3xs font-medium text-slate-500 font-mono">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span>أرشفت في: {archivedDateStr}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                            <Building className="h-4 w-4 text-teal-600 shrink-0" />
                            <span>{order?.entityName || order?.clientName || "منشأة طبية غير محددة"}</span>
                          </h4>
                          {order?.clientName && order?.entityName && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span>{order.clientName}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Header Summary Badges */}
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <div className="text-left bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                          <span className="block text-3xs text-slate-400 font-bold">إجمالي القيمة</span>
                          <span className="font-mono font-black text-slate-900">
                            {orderTotalAmount > 0 ? `${orderTotalAmount.toLocaleString()} ر.ي` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body: Products Table */}
                    <div className="p-4 sm:p-5 space-y-4">
                      <div className="border border-slate-200/80 rounded-2xl bg-slate-50/50 p-2.5 sm:p-3 overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="text-slate-400 font-bold border-b border-slate-200/80 pb-2 text-3xs">
                              <th className="pb-2 pl-3">الصنف الدوائي</th>
                              <th className="pb-2 px-2 text-center">الكمية المؤرشفة</th>
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
                                <tr key={`ord-item-${orderIdStr}-${itemIdx}`} className="text-slate-800 font-medium">
                                  <td className="py-2.5 pl-3 font-bold text-slate-900 text-xs">
                                    {item.productName || "صنف غير محدد"}
                                  </td>
                                  <td className="py-2.5 px-2 text-center font-mono font-black text-teal-800 bg-teal-50/80 rounded-lg">
                                    {item.quantity ?? "0"}
                                  </td>
                                  <td className="py-2.5 px-2 text-center font-mono text-slate-600">
                                    {price > 0 ? `${price.toLocaleString()} ر.ي` : "—"}
                                  </td>
                                  <td className="py-2.5 pr-3 text-left font-mono font-bold text-slate-900">
                                    {lineTotal > 0 ? `${lineTotal.toLocaleString()} ر.ي` : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Order Notes if present */}
                      {order.notes && (
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-2xs text-amber-950 flex items-start gap-2">
                          <span className="font-black shrink-0">ملاحظات الطلبية:</span>
                          <span>{order.notes}</span>
                        </div>
                      )}

                      {/* Card Actions Bottom Bar with EXACT REQUESTED BUTTONS */}
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-2xs text-slate-500 font-medium">
                          <span>
                            عدد الأصناف: <strong className="text-slate-900">{order.items?.length || 0}</strong>
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

                        {/* Explicit Order Buttons */}
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {onPrintOrder && (
                            <button
                              type="button"
                              onClick={() => onPrintOrder(order)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
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
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 font-bold text-xs transition-colors cursor-pointer group"
                              title="إرسال تحديث بالبريد الإلكتروني للعميل"
                              id={`btn-rep-email-update-${order.id}`}
                            >
                              <Mail className="h-3.5 w-3.5 text-indigo-600 group-hover:text-white transition-colors" />
                              <span>إرسال تحديث بالبريد ✉️</span>
                            </button>
                          )}

                          {/* زر 'أرشفة' أيقوني بجانب أزرار حالة كل طلبية */}
                          <button
                            type="button"
                            onClick={async () => {
                              setOrderActionLoadingId(order.id);
                              try {
                                if (onArchiveOrder) {
                                  await onArchiveOrder(order.id);
                                }
                                notify("تم تأكيد أرشفة الطلبية كـ completed وتحديث Firebase فورياً 🗄️✓", "success");
                              } catch {
                                notify("حدث خطأ أثناء أرشفة الطلبية", "error");
                              } finally {
                                setOrderActionLoadingId(null);
                              }
                            }}
                            disabled={isItemActionBusy}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs border border-teal-600/70 transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50 group"
                            title="أرشفة هذه الطلبية فوراً بنقرة واحدة وتحديث حالتها إلى completed في Firebase والأرشيف"
                            id={`btn-archive-admin-order-${order.id}`}
                          >
                            <Archive className="h-3.5 w-3.5 text-teal-200 group-hover:scale-110 transition-transform shrink-0" />
                            <span>أرشفة 🗄️</span>
                          </button>

                          {/* 1. BUTTON: استعادة الطلبية للقائمة النشطة */}
                          <button
                            type="button"
                            onClick={() => handleRestoreArchivedOrder(order.id)}
                            disabled={isItemActionBusy}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                            title="استعادة هذه الطلبية من الأرشيف وإعادتها للقائمة النشطة"
                          >
                            <RotateCcw className={`h-4 w-4 ${isItemActionBusy ? "animate-spin" : ""}`} />
                            <span>{isItemActionBusy ? "جاري الاستعادة..." : "استعادة الطلبية للقائمة النشطة 🔄"}</span>
                          </button>

                          {/* 2. BUTTON: حذف الطلبية نهائياً من الأرشيف */}
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteOrder(order)}
                            disabled={isItemActionBusy}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 hover:border-rose-600 font-bold text-xs transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                            title="حذف الطلبية نهائياً من الأرشيف"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>حذف الطلبية نهائياً من الأرشيف 🗑️</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: SYSTEM TRASH ARCHIVE (Deleted items) */}
      {/* ========================================================================= */}
      {mainViewMode === "trash" && (
        <div className="space-y-6">
          {/* Top Banner & Header */}
          <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-teal-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-3xs font-bold">
                  <Archive className="h-3.5 w-3.5 text-teal-400" />
                  <span>خاص بالمندوب الطبي والإدارة ({adminName}) - حماية ضد الفقدان 🛡️</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span>سلة وأرشيف المحذوفات المسترجعة</span>
                  <span className="text-sm px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                    {items.length} عنصر
                  </span>
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  يتم حفظ أي اتفاقية، صنف، عميل، أو شكوى يتم حذفها من التطبيق تلقائياً في هذا الأرشيف السحابي الآمن. يمكنك معاينة تفاصيل المحذوفات أو استرجاعها إلى النظام في أي وقت بضغطة زر واحدة.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={fetchTrash}
                  disabled={loadingTrash}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="تحديث البيانات"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingTrash ? "animate-spin" : ""}`} />
                  <span>تحديث</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAllTrash}
                  disabled={items.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="تفريغ سلة المحذوفات نهائياً"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>تفريغ السلة</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mt-6 pt-5 border-t border-white/10">
              <div
                onClick={() => setSelectedType("all")}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedType === "all"
                    ? "bg-teal-500/25 border-teal-400 ring-2 ring-teal-400/30"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="text-3xs text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>إجمالي المحذوفات</span>
                  <Layers className="h-3.5 w-3.5 text-teal-400" />
                </div>
                <div className="text-xl font-black text-white">{trashCounts.all}</div>
              </div>

              <div
                onClick={() => setSelectedType("order")}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedType === "order"
                    ? "bg-teal-500/25 border-teal-400 ring-2 ring-teal-400/30"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="text-3xs text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>الطلبيات</span>
                  <ShoppingCart className="h-3.5 w-3.5 text-teal-400" />
                </div>
                <div className="text-xl font-black text-white">{trashCounts.order}</div>
              </div>

              <div
                onClick={() => setSelectedType("agreement")}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedType === "agreement"
                    ? "bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/30"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="text-3xs text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>الاتفاقيات</span>
                  <FileCheck2 className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="text-xl font-black text-white">{trashCounts.agreement}</div>
              </div>

              <div
                onClick={() => setSelectedType("product")}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedType === "product"
                    ? "bg-blue-500/25 border-blue-400 ring-2 ring-blue-400/30"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="text-3xs text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>الأصناف</span>
                  <Pill className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="text-xl font-black text-white">{trashCounts.product}</div>
              </div>

              <div
                onClick={() => setSelectedType("client")}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedType === "client"
                    ? "bg-emerald-500/25 border-emerald-400 ring-2 ring-emerald-400/30"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="text-3xs text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>العملاء</span>
                  <User className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-black text-white">{trashCounts.client}</div>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar for Trash */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المحذوفات بالاسم، رقم الطلبية، المنشأة، الهاتف..."
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: "all", label: "الكل" },
                { id: "order", label: "الطلبيات" },
                { id: "agreement", label: "الاتفاقيات" },
                { id: "product", label: "الأصناف" },
                { id: "client", label: "العملاء" },
                { id: "complaint", label: "الشكاوى" }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedType(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedType === tab.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.label}
                  {trashCounts[tab.id] !== undefined && (
                    <span className={`mr-1 px-1.5 py-0.2 rounded-full text-3xs ${selectedType === tab.id ? "bg-teal-500 text-white" : "bg-slate-200 text-slate-700"}`}>
                      {trashCounts[tab.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="newest">الأحدث حذفاً</option>
                <option value="oldest">الأقدم حذفاً</option>
                <option value="type">حسب النوع</option>
              </select>
            </div>
          </div>

          {/* Trash Items Grid */}
          {loadingTrash ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600">جارٍ تحميل أرشيف المحذوفات...</p>
            </div>
          ) : filteredTrashItems.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="h-16 w-16 mx-auto rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                <Archive className="h-8 w-8 text-teal-600/60" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {searchQuery ? "لا توجد نتائج مطابقة لبحثك" : "سلة المحذوفات فارغة حالياً"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? "جرب البحث بكلمات أخرى أو اختر تصفية مختلفة."
                  : "أي اتفاقية أو صنف يتم حذفه من التطبيق سيتم حفظه هنا تلقائياً، لتتمكن من استرجاعه في أي وقت."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <AnimatePresence>
                {filteredTrashItems.map(item => {
                  const meta = getTypeMeta(item.itemType);
                  const isBusy = trashActionInProgress === item.id;
                  const dateFormatted = new Date(item.deletedAt).toLocaleString("ar-YE", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-4 flex flex-col justify-between space-y-3.5 group relative"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-3xs font-black border ${meta.color}`}>
                            {meta.icon}
                            <span>{meta.label}</span>
                          </span>
                          <div className="flex items-center gap-1 text-3xs text-slate-400 font-mono" title={`تاريخ الحذف: ${dateFormatted}`}>
                            <Clock className="h-3 w-3" />
                            <span>{dateFormatted}</span>
                          </div>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-teal-900 transition-colors">
                          {item.title}
                        </h4>

                        {item.subtitle && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2 font-medium">
                            {item.subtitle}
                          </p>
                        )}

                        {item.details && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-3xs text-slate-500">
                            {item.details.clientName && (
                              <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                <Building className="h-3 w-3 text-slate-400" />
                                <span>{item.details.clientName}</span>
                              </span>
                            )}
                            {item.details.totalAmount !== undefined && (
                              <span className="flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 text-teal-800 font-bold">
                                <DollarSign className="h-3 w-3" />
                                <span>{item.details.totalAmount} ر.ي</span>
                              </span>
                            )}
                            {item.details.itemsCount !== undefined && (
                              <span className="flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 text-indigo-800 font-bold">
                                <Package className="h-3 w-3" />
                                <span>{item.details.itemsCount} صنف</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Trash Actions Bar */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedItemForDetails(item)}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          title="معاينة البيانات والتفاصيل الكاملة"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>معاينة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRestoreTrash(item)}
                          disabled={isBusy}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                          title={item.itemType === "order" ? "استعادة الطلبية للقائمة النشطة" : "استرجاع هذا العنصر إلى النظام"}
                        >
                          <RotateCcw className={`h-3.5 w-3.5 ${isBusy ? "animate-spin" : ""}`} />
                          <span>{item.itemType === "order" ? "استعادة للنشطة 🔄" : "استرجاع 🔄"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTrashId(item.id)}
                          disabled={isBusy}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                          title={item.itemType === "order" ? "حذف الطلبية نهائياً من الأرشيف" : "حذف نهائي من الأرشيف"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Modal 1: Confirmation for Permanently Deleting Single Order */}
      <AnimatePresence>
        {confirmDeleteOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-rose-200"
            >
              <div className="h-16 w-16 rounded-3xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-inner">
                <Trash2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  تأكيد حذف الطلبية نهائياً من الأرشيف
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف طلبية{" "}
                  <strong>{confirmDeleteOrder.entityName || confirmDeleteOrder.clientName}</strong>{" "}
                  (معرّف: #{safeSlice(confirmDeleteOrder?.id, 6).toUpperCase()}) نهائياً من الأرشيف؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOrder(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="button"
                  onClick={() => handleExecutePermanentDeleteOrder(confirmDeleteOrder)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors shadow-sm cursor-pointer"
                >
                  نعم، حذف الطلبية نهائياً من الأرشيف 🗑️
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: View Details for Trash Item */}
      <AnimatePresence>
        {selectedItemForDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200"
            >
              <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
                    {getTypeMeta(selectedItemForDetails.itemType).icon}
                  </div>
                  <div>
                    <div className="text-3xs text-teal-300 font-bold">
                      تفاصيل المحذوفات: {getTypeMeta(selectedItemForDetails.itemType).label}
                    </div>
                    <h3 className="text-base font-bold text-white line-clamp-1">
                      {selectedItemForDetails.title}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItemForDetails(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-3xs font-bold mb-0.5">معرف الحفظ:</span>
                    <span className="font-mono text-slate-800 break-all">{selectedItemForDetails.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-3xs font-bold mb-0.5">المعرف الأصلي:</span>
                    <span className="font-mono text-slate-800">{selectedItemForDetails.originalId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-3xs font-bold mb-0.5">تاريخ ووقت الحذف:</span>
                    <span className="font-medium text-slate-800">
                      {new Date(selectedItemForDetails.deletedAt).toLocaleString("ar-YE")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-3xs font-bold mb-0.5">حُذف بواسطة:</span>
                    <span className="font-medium text-teal-800">{selectedItemForDetails.deletedBy || adminName}</span>
                  </div>
                </div>

                {selectedItemForDetails.itemType === "order" && selectedItemForDetails.data && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                      <ShoppingCart className="h-4 w-4 text-teal-600" />
                      <span>محتويات الطلبية ({selectedItemForDetails.data.items?.length || 0} صنف)</span>
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {(selectedItemForDetails.data.items || []).map((it: any, idx: number) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between bg-white text-xs">
                          <div>
                            <span className="font-bold text-slate-900 block">{it.name}</span>
                            <span className="text-3xs text-slate-500">
                              السعر: {it.price} | البونص: {it.bonus || "لا يوجد"}
                            </span>
                          </div>
                          <div className="text-left font-mono">
                            <span className="font-bold text-teal-700">{it.quantity} {it.unit || "قطعة"}</span>
                            {it.subtotal !== undefined && (
                              <span className="block text-3xs text-slate-500 font-bold">{it.subtotal} ر.ي</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 flex justify-between items-center text-xs font-bold text-teal-900">
                      <span>إجمالي قيمة الطلبية:</span>
                      <span className="text-sm font-black">{selectedItemForDetails.data.totalAmount || 0} ريال يمني</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTrashId(selectedItemForDetails.id)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  حذف نهائي 🗑️
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItemForDetails(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    إغلاق
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRestoreTrash(selectedItemForDetails)}
                    disabled={trashActionInProgress === selectedItemForDetails.id}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>{selectedItemForDetails.itemType === "order" ? "استعادة الطلبية للقائمة النشطة 🔄" : "استرجاع الآن إلى النظام 🔄"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Confirmation for Deleting Single Trash Item */}
      <AnimatePresence>
        {confirmDeleteTrashId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-rose-200"
            >
              <div className="h-14 w-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">تأكيد الحذف النهائي من الأرشيف</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذا العنصر نهائياً وبشكل لا رجعة فيه من سلة المحذوفات؟
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTrashId(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="button"
                  onClick={() => handlePermanentDeleteTrash(confirmDeleteTrashId)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  نعم، حذف نهائياً 🗑️
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminArchiveView;
