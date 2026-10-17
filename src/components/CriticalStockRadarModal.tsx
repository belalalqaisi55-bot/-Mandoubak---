import React, { useState, useMemo } from "react";
import {
  X,
  AlertTriangle,
  TrendingDown,
  Building2,
  Calendar,
  Phone,
  ShoppingCart,
  MessageSquare,
  Search,
  Download,
  Flame,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Bell,
  Clock,
  ArrowUpDown,
  Filter
} from "lucide-react";
import { StockReport, Product, User } from "../types";

interface CriticalStockRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockReports: StockReport[];
  products: Product[];
  clients: User[];
  currentRep: User | null;
  onQuickRestock: (report: StockReport, qty: number) => void;
  onScheduleVisit: (report: StockReport) => void;
  onOpenFieldAudit: (clientId?: string) => void;
  lastSyncTime?: Date | null;
}

export const CriticalStockRadarModal: React.FC<CriticalStockRadarModalProps> = ({
  isOpen,
  onClose,
  stockReports,
  products,
  clients,
  currentRep,
  onQuickRestock,
  onScheduleVisit,
  onOpenFieldAudit,
  lastSyncTime,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<"all" | "zero" | "critical" | "warning">("all");
  const [selectedPharmacyFilter, setSelectedPharmacyFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"severity" | "recent" | "pharmacy">("severity");
  const [restockInputId, setRestockInputId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState("20");

  // Filter only items with shortage (remainingQty <= 5)
  const allShortageReports = useMemo(() => {
    return stockReports.filter((r) => r.remainingQty <= 5);
  }, [stockReports]);

  // Unique pharmacies that have shortages
  const pharmaciesWithShortage = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    allShortageReports.forEach((r) => {
      const existing = map.get(r.clientId) || {
        id: r.clientId,
        name: r.entityName || r.clientName,
        count: 0,
      };
      existing.count++;
      map.set(r.clientId, existing);
    });
    return Array.from(map.values());
  }, [allShortageReports]);

  // Filtered list
  const filteredReports = useMemo(() => {
    return allShortageReports.filter((r) => {
      // Severity filter
      if (filterSeverity === "zero" && r.remainingQty !== 0) return false;
      if (filterSeverity === "critical" && (r.remainingQty < 1 || r.remainingQty > 3)) return false;
      if (filterSeverity === "warning" && (r.remainingQty < 4 || r.remainingQty > 5)) return false;

      // Pharmacy filter
      if (selectedPharmacyFilter !== "all" && r.clientId !== selectedPharmacyFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.productName.toLowerCase().includes(q);
        const matchEntity = r.entityName.toLowerCase().includes(q);
        const matchClient = r.clientName.toLowerCase().includes(q);
        if (!matchName && !matchEntity && !matchClient) return false;
      }

      return true;
    });
  }, [allShortageReports, filterSeverity, selectedPharmacyFilter, searchQuery]);

  // Sorted list
  const sortedReports = useMemo(() => {
    const list = [...filteredReports];
    if (sortBy === "severity") {
      return list.sort((a, b) => a.remainingQty - b.remainingQty);
    }
    if (sortBy === "recent") {
      return list.sort(
        (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
      );
    }
    if (sortBy === "pharmacy") {
      return list.sort((a, b) => a.entityName.localeCompare(b.entityName));
    }
    return list;
  }, [filteredReports, sortBy]);

  // Overall counts
  const zeroCount = allShortageReports.filter((r) => r.remainingQty === 0).length;
  const criticalCount = allShortageReports.filter((r) => r.remainingQty > 0 && r.remainingQty <= 3).length;
  const warningCount = allShortageReports.filter((r) => r.remainingQty > 3 && r.remainingQty <= 5).length;

  const handleWhatsAppContact = (report: StockReport) => {
    const client = clients.find((c) => c.id === report.clientId);
    const phone = (client?.phone || report.clientPhone || "").replace(/\D/g, "");
    if (!phone) {
      alert("رقم هاتف الصيدلية غير مسجل.");
      return;
    }

    const msg = `السلام عليكم دكتور في ${report.entityName || client?.name}.\nأرجو إحاطتكم بأن رصيدكم الحالي من صنف (${report.productName}) وصل إلى [${report.remainingQty} علبة فقط] بناءً على آخر جرد ميداني بتاريخ ${new Date(report.reportedAt).toLocaleDateString("ar-YE")}.\n\nهل ترغبون في إرسال طلبية تعويضية سريعة الآن لضمان عدم انقطاع الصنف؟\n- تحياتي، ${currentRep?.name || "المندوب الطبي د/ بلال القيسي"}`;

    const url = `https://wa.me/${phone.startsWith("967") ? phone : "967" + phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const handleExportCSV = () => {
    if (allShortageReports.length === 0) return;
    const headers = [
      "المنشأة الصيدلانية",
      "المسؤول الطبي",
      "الصنف الدوائي",
      "الرصيد المتبقي",
      "درجة الحرج",
      "تاريخ الجرد",
      "ملاحظات المندوب",
    ];

    const rows = allShortageReports.map((r) => {
      const severityText =
        r.remainingQty === 0 ? "نفاد تام" : r.remainingQty <= 3 ? "نقص حرج جداً" : "منخفض";
      return [
        `"${r.entityName}"`,
        `"${r.clientName}"`,
        `"${r.productName}"`,
        r.remainingQty,
        `"${severityText}"`,
        `"${new Date(r.reportedAt).toLocaleString("ar-YE")}"`,
        `"${(r.repNotes || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `تقرير_عجز_المخزون_الميداني_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-rose-200 overflow-hidden flex flex-col max-h-[92vh] text-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 px-4 py-3.5 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20 text-rose-300">
              <TrendingDown className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  رادار التنبيهات المباشرة لنقص المخزون الحرج
                </h3>
                <span className="flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  مزامنة سحابية Firestore نشطة
                </span>
              </div>
              <p className="text-3xs sm:text-2xs text-rose-200/80">
                مراقبة حية للأصناف التي أوشكت على النفاد في جميع الصيدليات وإجراءات التوريد الفوري
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 text-3xs font-bold transition-all"
              title="تصدير كشف النقص إلى Excel"
            >
              <Download className="h-3.5 w-3.5" />
              <span>تصدير CSV</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-rose-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Top Summary Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div
              onClick={() => setFilterSeverity("all")}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                filterSeverity === "all"
                  ? "bg-white border-teal-500 shadow-xs ring-1 ring-teal-500"
                  : "bg-white/70 border-slate-200 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between text-slate-600 text-3xs font-bold">
                <span>إجمالي العجز المرصود</span>
                <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="mt-1 text-base sm:text-lg font-black text-slate-900 font-mono">
                {allShortageReports.length}{" "}
                <span className="text-4xs font-normal text-slate-500">حالة عجز</span>
              </div>
            </div>

            <div
              onClick={() => setFilterSeverity("zero")}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                filterSeverity === "zero"
                  ? "bg-rose-50 border-rose-500 shadow-xs ring-1 ring-rose-500"
                  : "bg-rose-50/50 border-rose-200 hover:bg-rose-50"
              }`}
            >
              <div className="flex items-center justify-between text-rose-700 text-3xs font-bold">
                <span>نفاد تام (0 علبة)</span>
                <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
              </div>
              <div className="mt-1 text-base sm:text-lg font-black text-rose-700 font-mono">
                {zeroCount} <span className="text-4xs font-normal text-rose-600">صنف نافد</span>
              </div>
            </div>

            <div
              onClick={() => setFilterSeverity("critical")}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                filterSeverity === "critical"
                  ? "bg-rose-50 border-rose-400 shadow-xs ring-1 ring-rose-400"
                  : "bg-white/70 border-rose-100 hover:bg-rose-50/40"
              }`}
            >
              <div className="flex items-center justify-between text-rose-800 text-3xs font-bold">
                <span>نقص حرج جداً (1-3)</span>
                <Flame className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <div className="mt-1 text-base sm:text-lg font-black text-rose-800 font-mono">
                {criticalCount} <span className="text-4xs font-normal text-rose-600">صنف حرج</span>
              </div>
            </div>

            <div
              onClick={() => setFilterSeverity("warning")}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                filterSeverity === "warning"
                  ? "bg-amber-50 border-amber-500 shadow-xs ring-1 ring-amber-500"
                  : "bg-white/70 border-amber-200 hover:bg-amber-50"
              }`}
            >
              <div className="flex items-center justify-between text-amber-800 text-3xs font-bold">
                <span>منخفض للمراقبة (4-5)</span>
                <Clock className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="mt-1 text-base sm:text-lg font-black text-amber-800 font-mono">
                {warningCount} <span className="text-4xs font-normal text-amber-600">صنف</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="px-3 sm:px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث باسم الصنف أو الصيدلية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-8 text-xs font-medium text-slate-800 focus:bg-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            {/* Pharmacy Filter */}
            <select
              value={selectedPharmacyFilter}
              onChange={(e) => setSelectedPharmacyFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-3xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">جميع الصيدليات ({pharmaciesWithShortage.length})</option>
              {pharmaciesWithShortage.map((ph) => (
                <option key={ph.id} value={ph.id}>
                  {ph.name} ({ph.count} أصناف)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-3xs text-slate-400 font-bold">ترتيب:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-3xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="severity">الأكثر حرجاً أولاً (0 - 5)</option>
              <option value="recent">الأحدث تسجيلاً</option>
              <option value="pharmacy">أبجدياً حسب الصيدلية</option>
            </select>

            <button
              onClick={() => onOpenFieldAudit()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 text-3xs font-bold transition-all shadow-2xs"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>جرد ميداني جديد +</span>
            </button>
          </div>
        </div>

        {/* Content Items Grid */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3">
          {sortedReports.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <p className="text-sm font-bold text-slate-700">لا توجد حالات عجز مطابقة للفلتر المحدد</p>
              <p className="text-xs text-slate-400">
                جميع الأرصدة الميدانية المبلغة مستقرة أو يمكنك إجراء جرد جديد.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedReports.map((report) => {
                const isZero = report.remainingQty === 0;
                const isVeryCritical = report.remainingQty > 0 && report.remainingQty <= 3;
                const clientObj = clients.find((c) => c.id === report.clientId);

                return (
                  <div
                    key={report.id}
                    className={`rounded-xl border p-3.5 space-y-2.5 transition-all shadow-2xs text-right relative overflow-hidden ${
                      isZero
                        ? "border-rose-300 bg-gradient-to-br from-rose-50/70 via-white to-rose-50/20"
                        : isVeryCritical
                        ? "border-rose-200 bg-gradient-to-br from-rose-50/40 via-white to-white"
                        : "border-amber-200 bg-gradient-to-br from-amber-50/30 via-white to-white"
                    }`}
                  >
                    {/* Top Row: Pharmacy & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="text-xs font-black text-slate-900 truncate">
                            {report.entityName}
                          </span>
                        </div>
                        <span className="text-3xs text-slate-500 block truncate">
                          المسؤول: {report.clientName}
                        </span>
                      </div>

                      <span
                        className={`shrink-0 inline-flex items-center gap-1 text-2xs font-mono font-black px-2.5 py-0.5 rounded-full border ${
                          isZero
                            ? "bg-rose-600 text-white border-rose-700 animate-pulse"
                            : isVeryCritical
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}
                      >
                        {isZero ? "نفاد تام (0)" : `متبقي: ${report.remainingQty} علب`}
                      </span>
                    </div>

                    {/* Product Name */}
                    <div className="pt-1 border-t border-slate-100">
                      <h4 className="text-xs sm:text-sm font-bold text-teal-950">
                        {report.productName}
                      </h4>
                      <div className="flex items-center justify-between text-3xs text-slate-400 mt-0.5">
                        <span className="font-mono">
                          {new Date(report.reportedAt).toLocaleDateString("ar-YE")} -{" "}
                          {new Date(report.reportedAt).toLocaleTimeString("ar-YE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {report.auditedByRepName && (
                          <span className="text-teal-700 font-semibold">
                            توثيق: {report.auditedByRepName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rep Notes if available */}
                    {report.repNotes && (
                      <div className="p-2 rounded-lg bg-slate-50 text-3xs text-slate-600 border border-slate-150">
                        <strong>ملاحظة ميدانية:</strong> {report.repNotes}
                      </div>
                    )}

                    {/* Quick Restock Input Drawer */}
                    {restockInputId === report.id ? (
                      <div className="p-2 bg-teal-50/70 border border-teal-200 rounded-lg space-y-1.5">
                        <label className="block text-3xs font-bold text-teal-900">
                          كمية التوريد الفورية للصيدلية:
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={restockQty}
                            onChange={(e) => setRestockQty(e.target.value)}
                            className="w-20 rounded border border-teal-300 bg-white py-1 px-2 text-xs font-mono font-bold text-center focus:outline-none"
                            placeholder="الكمية"
                          />
                          <span className="text-3xs text-teal-800 font-bold">علبة</span>
                          <button
                            onClick={() => {
                              onQuickRestock(report, parseInt(restockQty, 10) || 20);
                              setRestockInputId(null);
                            }}
                            className="mr-auto rounded bg-teal-700 hover:bg-teal-800 text-white px-2.5 py-1 text-3xs font-bold transition-all"
                          >
                            تأكيد التوريد
                          </button>
                          <button
                            onClick={() => setRestockInputId(null)}
                            className="rounded bg-slate-200 text-slate-600 px-2 py-1 text-3xs font-bold"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Action Buttons */
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setRestockInputId(report.id);
                            setRestockQty(isZero ? "25" : "15");
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white py-1.5 px-2 text-3xs font-bold transition-all shadow-2xs active:scale-95"
                          title="إنشاء طلبية توريد فورية"
                        >
                          <ShoppingCart className="h-3 w-3" />
                          <span>طلب توريد فوري</span>
                        </button>

                        <button
                          onClick={() => handleWhatsAppContact(report)}
                          className="inline-flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-1.5 px-2 text-3xs font-bold transition-all"
                          title="مراسلة الصيدلية عبر واتساب"
                        >
                          <MessageSquare className="h-3 w-3 text-emerald-600" />
                        </button>

                        <button
                          onClick={() => onScheduleVisit(report)}
                          className="inline-flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-2 text-3xs font-bold transition-all"
                          title="تخطيط زيارة ميدانية"
                        >
                          <Calendar className="h-3 w-3 text-slate-600" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-3xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>
              آخر مزامنة عبر Firestore:{" "}
              {lastSyncTime
                ? `${lastSyncTime.toLocaleTimeString("ar-YE")} - مباشر`
                : "جارٍ المزامنة السحابية"}
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 px-4 py-1.5 text-xs font-bold transition-colors"
          >
            إغلاق الرادار
          </button>
        </div>
      </div>
    </div>
  );
};
