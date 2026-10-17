import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShoppingCart,
  FileSpreadsheet,
  X,
  Layers,
  ChevronLeft,
  Trash2,
  Sparkles,
  Server
} from "lucide-react";
import {
  getOfflineStorageSummary,
  getPendingSyncQueue,
  syncPendingWithFirebase,
  isDeviceOnline,
  getOfflineOrders,
  getOfflineStockReports
} from "../utils/offlineSync";
import { OfflineSyncStats, SyncQueueItem, Order, StockReport } from "../types";

interface OfflineSyncCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const OfflineSyncCenterModal: React.FC<OfflineSyncCenterModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [stats, setStats] = useState<OfflineSyncStats>({
    ordersCount: 0,
    pendingOrdersCount: 0,
    stockReportsCount: 0,
    pendingStockReportsCount: 0,
    productsCount: 0,
    lastSyncTime: null,
    isOnline: true,
  });

  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [offlineOrders, setOfflineOrders] = useState<Order[]>([]);
  const [offlineStock, setOfflineStock] = useState<StockReport[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ msg: string; current: number; total: number } | null>(null);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"overview" | "queue" | "stored_data">("overview");

  const loadAllData = async () => {
    try {
      const summary = await getOfflineStorageSummary();
      setStats(summary);
      const queue = await getPendingSyncQueue();
      setQueueItems(queue);
      const orders = await getOfflineOrders();
      setOfflineOrders(orders);
      const stock = await getOfflineStockReports();
      setOfflineStock(stock);
    } catch (e) {
      console.warn("Error loading sync center data:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAllData();
      setSyncResult(null);
      setSyncProgress(null);
    }
  }, [isOpen]);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncResult(null);
    setSyncProgress({ msg: "جاري فحص الاتصال وقائمة المزامنة...", current: 0, total: queueItems.length || 1 });

    try {
      const result = await syncPendingWithFirebase(undefined, (msg, current, total) => {
        setSyncProgress({ msg, current, total });
      });

      if (result.syncedCount > 0) {
        setSyncResult({
          success: true,
          message: `تمت مزامنة ${result.syncedCount} عنصر بنجاح مع السحابة (Firebase) ✓`,
        });
      } else if (result.failedCount > 0) {
        setSyncResult({
          success: false,
          message: `تعذر مزامنة ${result.failedCount} عنصر. تأكد من جودة الاتصال وحاول مجدداً.`,
        });
      } else {
        setSyncResult({
          success: true,
          message: "جميع الطلبيات والجرد متزامنة سحابياً بنجاح! لا توجد عناصر معلقة.",
        });
      }

      await loadAllData();
      onSyncComplete?.();
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: `حدث خطأ أثناء المزامنة: ${err?.message || "خطأ اتصال"}`,
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  if (!isOpen) return null;

  const totalPending = stats.pendingOrdersCount + stats.pendingStockReportsCount;
  const isOnline = isDeviceOnline();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs dir-rtl text-right">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-900 via-teal-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-xs">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    مركز المزامنة وقاعدة البيانات المحلية (IndexedDB)
                  </h3>
                  <span className="text-3xs font-black bg-teal-400/20 text-teal-300 border border-teal-400/30 px-2 py-0.5 rounded-full">
                    v2.0
                  </span>
                </div>
                <p className="text-2xs sm:text-xs text-teal-200/90 font-medium">
                  تخزين كامل للطلبيات والجرد دون إنترنت مع مزامنة سحابية تلقائية فور عودة التغطية
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-teal-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Connection Status Banner */}
          <div className={`p-3 text-xs font-bold border-b flex items-center justify-between flex-wrap gap-2 ${
            isOnline
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-amber-50 text-amber-900 border-amber-200"
          }`}>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <Wifi className="h-4 w-4 text-emerald-600" />
                  <span>متصل بالإنترنت وقاعدة البيانات السحابية (Firebase Cloud)</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 animate-pulse"></span>
                  </span>
                  <WifiOff className="h-4 w-4 text-amber-600" />
                  <span>وضع العمل دون اتصال — يتم حفظ كافة الطلبيات والجرد محلياً في IndexedDB</span>
                </>
              )}
            </div>

            <div className="text-2xs font-mono text-slate-500">
              {stats.lastSyncTime
                ? `آخر مزامنة: ${new Date(stats.lastSyncTime).toLocaleTimeString("ar-YE")}`
                : "لم تتم المزامنة بعد"}
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl border border-amber-200/90 bg-amber-50/50 space-y-1">
                <span className="text-3xs font-bold text-amber-800 block">طلبيات قيد المزامنة</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-amber-950 font-mono">{stats.pendingOrdersCount}</span>
                  <span className="text-3xs text-amber-700 font-bold">طلبية</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-indigo-200/90 bg-indigo-50/50 space-y-1">
                <span className="text-3xs font-bold text-indigo-800 block">تقارير جرد معلقة</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-indigo-950 font-mono">{stats.pendingStockReportsCount}</span>
                  <span className="text-3xs text-indigo-700 font-bold">تقرير</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-teal-200/90 bg-teal-50/50 space-y-1">
                <span className="text-3xs font-bold text-teal-800 block">إجمالي المخزن محلياً</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-teal-950 font-mono">{stats.ordersCount + stats.stockReportsCount}</span>
                  <span className="text-3xs text-teal-700 font-bold">سجل</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-sky-200/90 bg-sky-50/50 space-y-1">
                <span className="text-3xs font-bold text-sky-800 block">الكتالوج المحفوظ</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-sky-950 font-mono">{stats.productsCount}</span>
                  <span className="text-3xs text-sky-700 font-bold">صنف</span>
                </div>
              </div>
            </div>

            {/* Sync Progress or Result Alert */}
            {syncProgress && (
              <div className="p-3.5 rounded-xl border border-teal-300 bg-teal-50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-4 w-4 animate-spin text-teal-700" />
                    {syncProgress.msg}
                  </span>
                  <span className="font-mono text-teal-800">
                    {syncProgress.current} / {syncProgress.total}
                  </span>
                </div>
                <div className="w-full bg-teal-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 50}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {syncResult && (
              <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-bold ${
                syncResult.success
                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                  : "bg-rose-50 border-rose-300 text-rose-950"
              }`}>
                {syncResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{syncResult.message}</span>
              </div>
            )}

            {/* View Mode Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveViewTab("overview")}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  activeViewTab === "overview"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                نظرة عامة والتحكم
              </button>
              <button
                type="button"
                onClick={() => setActiveViewTab("queue")}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                  activeViewTab === "queue"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>قائمة الانتظار</span>
                {queueItems.length > 0 && (
                  <span className="h-4 px-1.5 rounded-full bg-amber-500 text-white font-mono text-3xs flex items-center justify-center">
                    {queueItems.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveViewTab("stored_data")}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  activeViewTab === "stored_data"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                السجلات المخزنة محلياً ({offlineOrders.length + offlineStock.length})
              </button>
            </div>

            {/* TAB 1: OVERVIEW & CONTROLS */}
            {activeViewTab === "overview" && (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    كيف تعمل المزامنة الذكية بدون إنترنت؟
                  </h4>
                  <ul className="space-y-1.5 text-slate-600 text-2xs leading-relaxed pr-2 list-disc list-inside font-medium">
                    <li>
                      عند إنشاء أو تعديل أي طلبية أو كشف جرد أثناء انقطاع التغطية أو ضعفها، يتم حفظها فوراً في قاعدة بيانات المتصفح الآمنة (<strong className="text-teal-900">IndexedDB</strong>).
                    </li>
                    <li>
                      بمجرد عودة الاتصال أو التقاط إشارة إنترنت، يقوم التطبيق بمزامنة البيانات تلقائياً مع السحابة (<strong className="text-teal-900">Firebase Firestore</strong>).
                    </li>
                    <li>
                      يمكنك أيضاً الضغط على زر <strong className="text-teal-900">"مزامنة السحابة الآن"</strong> أدناه في أي وقت لفرض رفع السجلات المعلقة يدوياً.
                    </li>
                  </ul>
                </div>

                {/* Storage Health Details */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between text-2xs font-bold text-slate-600">
                    <span>قاعدة البيانات: IndexedDB (mandoubak_offline_db)</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                      جاهزة ونشطة ✓
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-2xs font-bold text-slate-600">
                    <span>مزامنة Firebase Firestore:</span>
                    <span className="text-teal-800 font-mono font-semibold">orders / stockReports</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: QUEUE ITEMS */}
            {activeViewTab === "queue" && (
              <div className="space-y-2 text-xs">
                {queueItems.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl space-y-1">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1" />
                    <p className="font-bold text-slate-800">قائمة الانتظار فارغة تماماً</p>
                    <p className="text-2xs text-slate-400">جميع الطلبيات وعمليات الجرد متزامنة بنجاح مع السحابة.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {queueItems.map((item, idx) => (
                      <div
                        key={item.id || `q-${idx}`}
                        className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between gap-3 text-2xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900">
                              {item.entityType === "order" ? "📦 طلبية أدوية" : "📊 تقرير جرد"}
                            </span>
                            <span className="font-mono text-3xs text-slate-400">
                              #{item.data?.id ? String(item.data.id).slice(-6) : "N/A"}
                            </span>
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-3xs px-1.5 py-0.2 rounded-full font-bold">
                              بانتظار الرفع
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium truncate">
                            {item.entityType === "order"
                              ? `الأصناف: ${item.data?.items?.length || 0} صنف | المنشأة: ${item.data?.entityName || "منشأة"}`
                              : `الصنف: ${item.data?.productName || "صنف"} | المتبقي: ${item.data?.remainingQty || 0}`}
                          </p>
                          <div className="text-3xs text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(item.createdAt).toLocaleTimeString("ar-YE")}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LOCALLY STORED DATA */}
            {activeViewTab === "stored_data" && (
              <div className="space-y-3 text-xs max-h-60 overflow-y-auto pr-1">
                {/* Orders Section */}
                <div className="space-y-1.5">
                  <h5 className="font-black text-slate-800 text-2xs flex items-center gap-1">
                    <ShoppingCart className="h-3.5 w-3.5 text-teal-600" />
                    الطلبيات في IndexedDB ({offlineOrders.length})
                  </h5>
                  {offlineOrders.length === 0 ? (
                    <p className="text-3xs text-slate-400 p-2">لا توجد طلبيات محفوظة محلياً</p>
                  ) : (
                    offlineOrders.map((ord, idx) => (
                      <div key={ord.id || `o-${idx}`} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-2xs">
                        <div>
                          <div className="font-bold text-slate-900">طلب #{ord.id.slice(-6)} ({ord.items.length} أصناف)</div>
                          <div className="text-3xs text-slate-400 font-mono">{new Date(ord.createdAt).toLocaleString("ar-YE")}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-3xs font-bold ${
                          ord.syncStatus === "pending_sync"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-emerald-100 text-emerald-900"
                        }`}>
                          {ord.syncStatus === "pending_sync" ? "🟡 قيد المزامنة" : "🟢 متزامن"}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Stock Reports Section */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <h5 className="font-black text-slate-800 text-2xs flex items-center gap-1">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-600" />
                    كشوفات الجرد في IndexedDB ({offlineStock.length})
                  </h5>
                  {offlineStock.length === 0 ? (
                    <p className="text-3xs text-slate-400 p-2">لا توجد تقارير جرد محفوظة محلياً</p>
                  ) : (
                    offlineStock.slice(0, 10).map((stk, idx) => (
                      <div key={stk.id || `s-${idx}`} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-2xs">
                        <div>
                          <div className="font-bold text-slate-900">{stk.productName} (متبقي: {stk.remainingQty})</div>
                          <div className="text-3xs text-slate-400 font-mono">{new Date(stk.reportedAt).toLocaleTimeString("ar-YE")}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-3xs font-bold ${
                          stk.syncStatus === "pending_sync"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-emerald-100 text-emerald-900"
                        }`}>
                          {stk.syncStatus === "pending_sync" ? "🟡 قيد المزامنة" : "🟢 متزامن"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 flex-wrap">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              إغلاق
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadAllData}
                disabled={isSyncing}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                title="تحديث قراءة قاعدة البيانات المحلية"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>فحص</span>
              </button>

              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-600 hover:brightness-105 active:scale-95 text-white text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CloudUpload className="h-4 w-4" />
                <span>{isSyncing ? "جاري المزامنة مع السحابة..." : "⚡ مزامنة السحابة الآن (Firebase)"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
