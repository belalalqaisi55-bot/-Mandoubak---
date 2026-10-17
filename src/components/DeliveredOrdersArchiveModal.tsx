import React, { useState, useMemo } from "react";
import {
  X,
  Archive,
  Trash2,
  RotateCcw,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building,
  User as UserIcon,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from "lucide-react";
import { Order } from "../types";

interface DeliveredOrdersArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivedOrders: Order[];
  onRestoreOrder: (orderId: string) => Promise<void>;
  onPermanentDeleteOrder: (orderId: string) => Promise<void>;
  onClearAllArchived: () => Promise<void>;
  onRestoreAllArchived: () => Promise<void>;
  onExportCSV: (ordersToExport: Order[]) => void;
}

export const DeliveredOrdersArchiveModal: React.FC<DeliveredOrdersArchiveModalProps> = ({
  isOpen,
  onClose,
  archivedOrders,
  onRestoreOrder,
  onPermanentDeleteOrder,
  onClearAllArchived,
  onRestoreAllArchived,
  onExportCSV,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [selectedOrderToDelete, setSelectedOrderToDelete] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState(false);

  // Toggle order expansion
  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Filtered archived orders
  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return archivedOrders;

    return archivedOrders.filter((o) => {
      const matchEntity = o.entityName?.toLowerCase().includes(term);
      const matchClient = o.clientName?.toLowerCase().includes(term);
      const matchId = o.id?.toLowerCase().includes(term);
      const matchItems = o.items?.some((i) => i.productName?.toLowerCase().includes(term));
      return matchEntity || matchClient || matchId || matchItems;
    });
  }, [archivedOrders, searchTerm]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalCount = archivedOrders.length;
    let totalItemsQuantity = 0;
    const uniqueEntities = new Set<string>();

    archivedOrders.forEach((o) => {
      if (o.entityName) uniqueEntities.add(o.entityName);
      o.items?.forEach((i) => {
        const qty = Number(i.quantity) || 0;
        totalItemsQuantity += qty;
      });
    });

    return {
      totalCount,
      totalItemsQuantity,
      uniqueEntitiesCount: uniqueEntities.size,
    };
  }, [archivedOrders]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[94vh] transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/20 backdrop-blur-md border border-teal-400/30 text-teal-300 shadow-inner">
              <Archive className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">أرشيف الطلبيات المسلمة</h2>
                <span className="px-2.5 py-0.5 rounded-full text-3xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  خاص بالمسؤول (الأدمن) 🛡️
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-3xs font-extrabold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                  {archivedOrders.length} طلبية مؤرشفة
                </span>
              </div>
              <p className="text-2xs sm:text-xs text-teal-200/80 font-medium">
                سجل الطلبيات المكتملة الحصري للمسؤول العام د/ بلال القيسي - مع صلاحية الفحص، الاستعادة، والحذف
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-teal-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-0.5">
            <span className="text-3xs text-slate-500 font-bold flex items-center gap-1">
              <Archive className="h-3 w-3 text-teal-600" />
              الطلبيات المسلمة بالأرشيف
            </span>
            <div className="text-sm font-black text-slate-900 font-mono">
              {stats.totalCount} <span className="text-3xs font-sans text-slate-500">طلبية</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-0.5">
            <span className="text-3xs text-slate-500 font-bold flex items-center gap-1">
              <ShoppingBag className="h-3 w-3 text-emerald-600" />
              مجموع الكميات والعبوات المسلمة
            </span>
            <div className="text-sm font-black text-emerald-700 font-mono">
              {stats.totalItemsQuantity.toLocaleString()} <span className="text-3xs font-sans text-slate-500">عبوة</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-0.5">
            <span className="text-3xs text-slate-500 font-bold flex items-center gap-1">
              <Building className="h-3 w-3 text-blue-600" />
              المنشآت والصيدليات المستفيدة
            </span>
            <div className="text-sm font-black text-blue-900 font-mono">
              {stats.uniqueEntitiesCount} <span className="text-3xs font-sans text-slate-500">منشأة</span>
            </div>
          </div>
        </div>

        {/* Filter and Global Action Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="البحث باسم الصيدلية، المسؤول، الصنف، أو رقم الطلب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-teal-600 text-xs text-slate-900 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {archivedOrders.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => onExportCSV(filteredOrders)}
                  className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="تصدير الأرشيف إلى ملف Excel"
                >
                  <Download className="h-3.5 w-3.5 text-teal-700" />
                  <span>تصدير Excel</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("هل أنت متأكد من رغبتك في استعادة جميع الطلبيات المسلمة من الأرشيف وإعادتها للقائمة النشطة؟")) {
                      setActionLoading(true);
                      await onRestoreAllArchived();
                      setActionLoading(false);
                    }
                  }}
                  disabled={actionLoading}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                  title="استعادة جميع الطلبيات المؤرشفة للقائمة النشطة"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-600" />
                  <span>استعادة الكل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                  disabled={actionLoading}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                  title="إفراغ الأرشيف وحذف جميع الطلبيات نهائياً"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  <span>إفراغ الأرشيف نهائياً</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Confirmation Modal for Clear All */}
        {confirmClearOpen && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-950 animate-in fade-in space-y-2 shrink-0">
            <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>تحذير: هل أنت متأكد من رغبتك في إفراغ الأرشيف وحذف كافة الطلبيات المسلمة نهائياً؟</span>
            </div>
            <p className="text-2xs text-rose-800">
              سيتم حذف جميع سجلات الطلبيات المؤرشفة نهائياً من قاعدة البيانات السحابية والمحلية ولا يمكن التراجع عن هذه الخطوة.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setActionLoading(true);
                  await onClearAllArchived();
                  setActionLoading(false);
                  setConfirmClearOpen(false);
                }}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "جاري الحذف..." : "نعم، حذف نهائي الآن"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        )}

        {/* Orders List Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 grow">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="h-16 w-16 rounded-3xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Archive className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-800 text-sm">
                  {searchTerm ? "لا توجد نتائج مطابقة لبحثك في الأرشيف" : "أرشيف الطلبيات المسلمة فارغ حالياً"}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {searchTerm
                    ? "جرّب تغيير كلمات البحث أو البحث برقم الطلب"
                    : "عند تسليم الطلبيات بنجاح، يمكنك نقلها إلى الأرشيف لحفظها والرجوع إليها أو حذفها في أي وقت دون ازدحام قائمة العمل النشطة."}
                </p>
              </div>
            </div>
          ) : (
            filteredOrders.map((order, orderIdx) => {
              const isExpanded = expandedOrders[order.id] !== false; // expanded by default
              const orderItemsCount = order.items?.reduce((sum, item) => {
                const qty = Number(item.quantity) || 0;
                return sum + qty;
              }, 0) || 0;

              return (
                <div
                  key={`arch-ord-${order.id}-${orderIdx}`}
                  className="rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-all overflow-hidden"
                >
                  {/* Order Card Header */}
                  <div className="p-3.5 sm:p-4 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-sm sm:text-base">{order.entityName}</span>
                        <span className="text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          <span>{order.clientName}</span>
                        </span>
                        <span className="text-3xs font-mono text-slate-400">ID: {order.id}</span>
                      </div>

                      <div className="flex items-center gap-3 text-3xs text-slate-500 font-medium flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>تاريخ الإرسال: {new Date(order.createdAt).toLocaleString("ar-YE")}</span>
                        </span>
                        {order.archivedAt && (
                          <span className="flex items-center gap-1 text-teal-700 font-bold">
                            <Archive className="h-3 w-3" />
                            <span>أرشفت في: {new Date(order.archivedAt).toLocaleString("ar-YE")}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>تم التسليم (مؤرشف 🗄️)</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleExpand(order.id)}
                        className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        title={isExpanded ? "طي التفاصيل" : "عرض التفاصيل"}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Order Products Table */}
                  {isExpanded && (
                    <div className="p-3.5 sm:p-4 space-y-3 animate-in fade-in duration-150">
                      <div className="border border-slate-200/80 rounded-xl bg-slate-50/50 p-2 sm:p-3 overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="text-slate-400 font-bold border-b border-slate-200/80 pb-2 text-3xs">
                              <th className="pb-1.5 pl-3">الصنف الدوائي</th>
                              <th className="pb-1.5 px-2 text-center">الكمية المسلمة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {order.items.map((item, itemIdx) => (
                              <tr key={`arch-item-${order.id}-${itemIdx}`} className="text-slate-800 font-medium">
                                <td className="py-2 pl-3 font-bold text-slate-900 text-xs">{item.productName}</td>
                                <td className="py-2 px-2 text-center font-mono font-black text-teal-800 bg-teal-50/70 rounded">
                                  {item.quantity}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Order Notes */}
                      {order.notes && (
                        <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 text-2xs text-amber-900">
                          <span className="font-bold">ملاحظات الطلبية: </span>
                          {order.notes}
                        </div>
                      )}

                      {/* Bottom Total & Actions Bar */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-500 font-medium">
                            عدد الأصناف: <strong className="text-slate-900">{order.items.length}</strong>
                          </span>
                          <span className="text-slate-500 font-medium">
                            إجمالي العبوات: <strong className="text-teal-700 font-mono font-black">{orderItemsCount} عبوة</strong>
                          </span>
                        </div>

                        {/* Order Management Actions */}
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={async () => {
                              setActionLoading(true);
                              await onRestoreOrder(order.id);
                              setActionLoading(false);
                            }}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                            title="استعادة هذه الطلبية من الأرشيف وإعادتها للقائمة النشطة"
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-teal-700" />
                            <span>استعادة للنشطة</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`هل أنت متأكد من رغبتك في حذف طلبية (${order.entityName}) نهائياً من الأرشيف؟`)) {
                                setActionLoading(true);
                                await onPermanentDeleteOrder(order.id);
                                setActionLoading(false);
                              }
                            }}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                            title="حذف نهائي للطلبية من الأرشيف"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                            <span>حذف نهائي</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="text-3xs text-slate-500 font-medium">
            مندوبك الطبي • أرشيف الطلبيات المسلمة يحافظ على سجلاتك نظيفة ويمنحك حرية الاستعادة أو الحذف النهائي في أي وقت.
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
          >
            إغلاق الأرشيف
          </button>
        </div>
      </div>
    </div>
  );
};
