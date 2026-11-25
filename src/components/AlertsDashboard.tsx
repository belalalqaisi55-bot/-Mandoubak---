import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react";
import { Order, Product, StockReport, User } from "../types";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  getLatestStockReportsByProduct,
} from "../utils/stockAlerts";

export interface AlertsDashboardProps {
  products: Product[];
  stockReports: StockReport[];
  clients: User[];
  orders?: Order[];
  defaultThreshold?: number;
  onThresholdChange?: (nextThreshold: number) => void;
  onScheduleRestockVisit: (report: StockReport) => void;
  onQuickRestock: (report: StockReport, quantity: number) => Promise<void> | void;
  onRefreshData?: () => void;
  onNavigateToCatalog?: () => void;
  isLoading?: boolean;
}

interface BelowThresholdProductRow {
  product: Product;
  threshold: number;
  catalogStock: number | null;
  lowestReportedQty: number | null;
  effectiveLowestQty: number;
  deficit: number;
  severity: "critical" | "warning";
  affectedReports: StockReport[];
  affectedPharmaciesCount: number;
  outOfStockPharmaciesCount: number;
  topUrgentReport?: StockReport;
}

interface UrgentPharmacyRow {
  key: string;
  clientId: string;
  entityName: string;
  clientName: string;
  phone?: string;
  location?: string;
  role: "pharmacy" | "doctor" | "other";
  reports: Array<{
    report: StockReport;
    threshold: number;
    deficit: number;
    isOutOfStock: boolean;
  }>;
  outOfStockCount: number;
  lowStockCount: number;
  totalAffectedCount: number;
  lowestQty: number;
  urgencyScore: number;
  severity: "critical" | "warning";
  latestReportedAt: string;
  hasPendingOrder: boolean;
}

function normalizeText(val?: string): string {
  return (val || "").trim().toLowerCase();
}

function isLikelyPharmacy(client: User | undefined, entityName: string): "pharmacy" | "doctor" | "other" {
  if (client?.role === "pharmacy") return "pharmacy";
  if (client?.role === "doctor") return "doctor";
  const lower = normalizeText(entityName);
  if (lower.includes("عيادة") || lower.includes("دكتور") || lower.includes("طبيب") || lower.includes("مركز طبي")) {
    return "doctor";
  }
  return "pharmacy";
}

export const AlertsDashboard: React.FC<AlertsDashboardProps> = ({
  products,
  stockReports,
  clients,
  orders = [],
  defaultThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
  onThresholdChange,
  onScheduleRestockVisit,
  onQuickRestock,
  onRefreshData,
  onNavigateToCatalog,
  isLoading = false,
}) => {
  const [activeView, setActiveView] = useState<"both" | "products" | "pharmacies">("both");
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning">("all");
  const [entityRoleFilter, setEntityRoleFilter] = useState<"pharmacies" | "all">("pharmacies");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"severity" | "recent" | "count">("severity");
  const [expandedPharmacyKeys, setExpandedPharmacyKeys] = useState<Record<string, boolean>>({});
  const [quickRestockTarget, setQuickRestockTarget] = useState<StockReport | null>(null);
  const [quickRestockOrigin, setQuickRestockOrigin] = useState<"product" | "pharmacy" | null>(null);
  const [quickRestockQty, setQuickRestockQty] = useState<string>("20");
  const [submittingRestock, setSubmittingRestock] = useState(false);

  const safeDefaultThreshold = Math.max(1, defaultThreshold || DEFAULT_LOW_STOCK_THRESHOLD);

  const productLookup = useMemo(() => {
    const byId = new Map<string, Product>();
    const byName = new Map<string, Product>();
    for (const p of products) {
      if (p.id) byId.set(p.id, p);
      const nameKey = normalizeText(p.name);
      if (nameKey) byName.set(nameKey, p);
    }
    return { byId, byName };
  }, [products]);

  const clientLookup = useMemo(() => {
    const byId = new Map<string, User>();
    const byEntity = new Map<string, User>();
    for (const c of clients) {
      if (c.id) byId.set(c.id, c);
      const ent = normalizeText(c.entityName);
      if (ent) byEntity.set(ent, c);
    }
    return { byId, byEntity };
  }, [clients]);

  const pendingOrderKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const o of orders) {
      if (o && !o.isArchived && o.status === "pending") {
        if (o.clientId) keys.add(o.clientId);
        const ent = normalizeText(o.entityName);
        if (ent) keys.add(`ent:${ent}`);
      }
    }
    return keys;
  }, [orders]);

  // Deduplicated latest report per (client, product)
  const latestReportsByProduct = useMemo(
    () => getLatestStockReportsByProduct(stockReports),
    [stockReports]
  );

  // Deduplicated flat list of latest reports across all clients & products
  const deduplicatedLatestReports = useMemo(() => {
    const byComposite = new Map<string, StockReport>();
    for (const report of stockReports) {
      if (!report) continue;
      const prodKey = report.productId || normalizeText(report.productName);
      if (!prodKey) continue;
      const clientKey = report.clientId || normalizeText(report.entityName) || normalizeText(report.clientName) || "unknown";
      const key = `${clientKey}::${prodKey}`;
      const existing = byComposite.get(key);
      const reportTs = new Date(report.reportedAt || 0).getTime() || 0;
      const existingTs = existing ? new Date(existing.reportedAt || 0).getTime() || 0 : -1;
      if (!existing || reportTs >= existingTs) {
        byComposite.set(key, report);
      }
    }
    return Array.from(byComposite.values());
  }, [stockReports]);

  // 1. Products below threshold summary
  const belowThresholdProducts = useMemo<BelowThresholdProductRow[]>(() => {
    const rows: BelowThresholdProductRow[] = [];

    for (const product of products) {
      const threshold =
        typeof product.lowStockThreshold === "number" && product.lowStockThreshold > 0
          ? product.lowStockThreshold
          : safeDefaultThreshold;

      const hasCatalogStock = typeof product.stock === "number" && !Number.isNaN(product.stock) && product.stock >= 0;
      const catalogStock = hasCatalogStock ? (product.stock as number) : null;
      const isCatalogBelow = catalogStock !== null && catalogStock < threshold;

      const byId = latestReportsByProduct.get(product.id) || [];
      const byName = latestReportsByProduct.get(`name:${normalizeText(product.name)}`) || [];
      const seenReportIds = new Set<string>();
      const matchingLatestReports: StockReport[] = [];
      for (const r of [...byId, ...byName]) {
        if (!seenReportIds.has(r.id)) {
          seenReportIds.add(r.id);
          matchingLatestReports.push(r);
        }
      }

      const lowReports = matchingLatestReports
        .filter((r) => typeof r.remainingQty === "number" && r.remainingQty < threshold)
        .sort((a, b) => a.remainingQty - b.remainingQty);

      if (!isCatalogBelow && lowReports.length === 0) {
        continue;
      }

      const lowestReportedQty = lowReports.length > 0 ? lowReports[0].remainingQty : null;
      const candidates: number[] = [];
      if (isCatalogBelow && catalogStock !== null) candidates.push(catalogStock);
      if (lowestReportedQty !== null) candidates.push(lowestReportedQty);
      const effectiveLowestQty = candidates.length > 0 ? Math.min(...candidates) : 0;

      const outOfStockPharmaciesCount = lowReports.filter((r) => r.remainingQty === 0).length;
      const severity: "critical" | "warning" = effectiveLowestQty === 0 ? "critical" : "warning";

      rows.push({
        product,
        threshold,
        catalogStock,
        lowestReportedQty,
        effectiveLowestQty,
        deficit: Math.max(0, threshold - effectiveLowestQty),
        severity,
        affectedReports: lowReports,
        affectedPharmaciesCount: lowReports.length,
        outOfStockPharmaciesCount,
        topUrgentReport: lowReports[0],
      });
    }

    return rows.sort((a, b) => {
      if (a.effectiveLowestQty !== b.effectiveLowestQty) {
        return a.effectiveLowestQty - b.effectiveLowestQty;
      }
      if (b.affectedPharmaciesCount !== a.affectedPharmaciesCount) {
        return b.affectedPharmaciesCount - a.affectedPharmaciesCount;
      }
      return b.deficit - a.deficit;
    });
  }, [products, latestReportsByProduct, safeDefaultThreshold]);

  // 2. Pharmacies (and medical entities) needing urgent restocking
  const urgentPharmacies = useMemo<UrgentPharmacyRow[]>(() => {
    const grouped = new Map<string, UrgentPharmacyRow>();

    for (const report of deduplicatedLatestReports) {
      const matchedProduct =
        (report.productId ? productLookup.byId.get(report.productId) : undefined) ||
        productLookup.byName.get(normalizeText(report.productName));

      const threshold =
        typeof matchedProduct?.lowStockThreshold === "number" && matchedProduct.lowStockThreshold > 0
          ? matchedProduct.lowStockThreshold
          : typeof report.criticalAlertThreshold === "number" && report.criticalAlertThreshold > 0
          ? report.criticalAlertThreshold
          : safeDefaultThreshold;

      if (typeof report.remainingQty !== "number" || report.remainingQty >= threshold) {
        continue;
      }

      const matchedClient =
        (report.clientId ? clientLookup.byId.get(report.clientId) : undefined) ||
        clientLookup.byEntity.get(normalizeText(report.entityName));

      const entityName = (matchedClient?.entityName || report.entityName || report.clientName || "منشأة طبية").trim();
      const clientName = (matchedClient?.name || report.clientName || "المسؤول").trim();
      const clientId = matchedClient?.id || report.clientId || `ent_${normalizeText(entityName)}`;
      const key = report.clientId || `ent:${normalizeText(entityName)}`;
      const role = isLikelyPharmacy(matchedClient, entityName);
      const isOutOfStock = report.remainingQty === 0;
      const deficit = Math.max(1, threshold - report.remainingQty);

      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          key,
          clientId,
          entityName,
          clientName,
          phone: matchedClient?.phone || report.clientPhone,
          location: matchedClient?.location || report.location,
          role,
          reports: [{ report, threshold, deficit, isOutOfStock }],
          outOfStockCount: isOutOfStock ? 1 : 0,
          lowStockCount: isOutOfStock ? 0 : 1,
          totalAffectedCount: 1,
          lowestQty: report.remainingQty,
          urgencyScore: isOutOfStock ? 100 + deficit : 10 + deficit,
          severity: isOutOfStock ? "critical" : "warning",
          latestReportedAt: report.reportedAt || "",
          hasPendingOrder:
            pendingOrderKeys.has(clientId) || pendingOrderKeys.has(`ent:${normalizeText(entityName)}`),
        });
      } else {
        existing.reports.push({ report, threshold, deficit, isOutOfStock });
        if (isOutOfStock) {
          existing.outOfStockCount += 1;
          existing.severity = "critical";
        } else {
          existing.lowStockCount += 1;
        }
        existing.totalAffectedCount += 1;
        existing.lowestQty = Math.min(existing.lowestQty, report.remainingQty);
        existing.urgencyScore += isOutOfStock ? 100 + deficit : 10 + deficit;
        if ((new Date(report.reportedAt || 0).getTime() || 0) > (new Date(existing.latestReportedAt || 0).getTime() || 0)) {
          existing.latestReportedAt = report.reportedAt || existing.latestReportedAt;
        }
      }
    }

    const list = Array.from(grouped.values());
    for (const row of list) {
      row.reports.sort((a, b) => a.report.remainingQty - b.report.remainingQty);
      if (row.totalAffectedCount >= 3 && row.lowestQty <= 2) {
        row.severity = "critical";
      }
    }

    return list.sort((a, b) => {
      if (a.role === "pharmacy" && b.role !== "pharmacy") return -1;
      if (a.role !== "pharmacy" && b.role === "pharmacy") return 1;
      return b.urgencyScore - a.urgencyScore;
    });
  }, [deduplicatedLatestReports, productLookup, clientLookup, pendingOrderKeys, safeDefaultThreshold]);

  // Filtered views
  const filteredProducts = useMemo(() => {
    const q = normalizeText(searchQuery);
    return belowThresholdProducts
      .filter((row) => {
        if (severityFilter !== "all" && row.severity !== severityFilter) return false;
        if (!q) return true;
        const prodMatch =
          normalizeText(row.product.name).includes(q) ||
          normalizeText(row.product.category).includes(q) ||
          normalizeText(row.product.activeIngredient).includes(q);
        const pharmacyMatch = row.affectedReports.some(
          (r) => normalizeText(r.entityName).includes(q) || normalizeText(r.clientName).includes(q)
        );
        return prodMatch || pharmacyMatch;
      })
      .sort((a, b) => {
        if (sortBy === "count") {
          return b.affectedPharmaciesCount - a.affectedPharmaciesCount || a.effectiveLowestQty - b.effectiveLowestQty;
        }
        if (sortBy === "recent") {
          const aTime = a.topUrgentReport ? new Date(a.topUrgentReport.reportedAt || 0).getTime() : 0;
          const bTime = b.topUrgentReport ? new Date(b.topUrgentReport.reportedAt || 0).getTime() : 0;
          return bTime - aTime;
        }
        return a.effectiveLowestQty - b.effectiveLowestQty || b.deficit - a.deficit;
      });
  }, [belowThresholdProducts, severityFilter, searchQuery, sortBy]);

  const filteredPharmacies = useMemo(() => {
    const q = normalizeText(searchQuery);
    return urgentPharmacies
      .filter((row) => {
        if (entityRoleFilter === "pharmacies" && row.role !== "pharmacy") return false;
        if (severityFilter !== "all" && row.severity !== severityFilter) return false;
        if (!q) return true;
        const clientMatch =
          normalizeText(row.entityName).includes(q) ||
          normalizeText(row.clientName).includes(q) ||
          normalizeText(row.location).includes(q) ||
          normalizeText(row.phone).includes(q);
        const productMatch = row.reports.some((item) =>
          normalizeText(item.report.productName).includes(q)
        );
        return clientMatch || productMatch;
      })
      .sort((a, b) => {
        if (sortBy === "recent") {
          return (new Date(b.latestReportedAt || 0).getTime() || 0) - (new Date(a.latestReportedAt || 0).getTime() || 0);
        }
        if (sortBy === "count") {
          return b.totalAffectedCount - a.totalAffectedCount || b.urgencyScore - a.urgencyScore;
        }
        return b.urgencyScore - a.urgencyScore;
      });
  }, [urgentPharmacies, entityRoleFilter, severityFilter, searchQuery, sortBy]);

  const pharmaciesOnlyCount = useMemo(
    () => urgentPharmacies.filter((p) => p.role === "pharmacy").length,
    [urgentPharmacies]
  );

  const criticalProductsCount = useMemo(
    () => belowThresholdProducts.filter((p) => p.severity === "critical").length,
    [belowThresholdProducts]
  );

  const criticalPharmaciesCount = useMemo(
    () => urgentPharmacies.filter((p) => p.role === "pharmacy" && p.severity === "critical").length,
    [urgentPharmacies]
  );

  const handleConfirmRestockSubmit = async (report: StockReport) => {
    const parsedQty = Number(quickRestockQty);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) return;
    setSubmittingRestock(true);
    try {
      await onQuickRestock(report, parsedQty);
      setQuickRestockTarget(null);
      setQuickRestockOrigin(null);
      setQuickRestockQty("20");
    } finally {
      setSubmittingRestock(false);
    }
  };

  const handleExportCsv = () => {
    const lines: string[][] = [
      ["لوحة تنبيهات المخزون والصيدليات العاجلة - تطبيق مندوبك الطبي"],
      ["تاريخ التصدير", new Date().toLocaleString("ar-YE")],
      [""],
      ["أولاً: الأصناف دون حد التنبيه"],
      ["الصنف", "الفئة", "أدنى كمية", "حد التنبيه", "العجز", "عدد الصيدليات المتأثرة", "الحالة"],
      ...filteredProducts.map((row) => [
        `"${row.product.name.replace(/"/g, '""')}"`,
        `"${(row.product.category || "عام").replace(/"/g, '""')}"`,
        String(row.effectiveLowestQty),
        String(row.threshold),
        String(row.deficit),
        String(row.affectedPharmaciesCount),
        row.severity === "critical" ? "نفاد تام" : "منخفض",
      ]),
      [""],
      ["ثانياً: الصيدليات التي تحتاج إعادة تزويد عاجل"],
      ["اسم الصيدلية / المنشأة", "المسؤول", "الهاتف", "عدد الأصناف النافدة (0)", "إجمالي الأصناف دون الحد", "تفاصيل الأصناف"],
      ...filteredPharmacies.map((row) => [
        `"${row.entityName.replace(/"/g, '""')}"`,
        `"${row.clientName.replace(/"/g, '""')}"`,
        `"${row.phone || "-"}"`,
        String(row.outOfStockCount),
        String(row.totalAffectedCount),
        `"${row.reports.map((i) => `${i.report.productName} (${i.report.remainingQty}/${i.threshold})`).join(" | ").replace(/"/g, '""')}"`,
      ]),
    ];

    const csv = "data:text/csv;charset=utf-8,\uFEFF" + lines.map((l) => l.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `Mandoubak_Stock_Alerts_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const togglePharmacyExpand = (key: string) => {
    setExpandedPharmacyKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalAlertsCount = belowThresholdProducts.length + urgentPharmacies.length;

  return (
    <section
      id="alerts-dashboard-section"
      dir="rtl"
      aria-label="لوحة التنبيهات ونقص المخزون"
      className="rounded-xl border border-slate-200 bg-white text-right shadow-2xs overflow-hidden"
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              لوحة التنبيهات وإعادة التزويد العاجل
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            ملخص فوري للأصناف التي انخفض مخزونها دون الحد المحدد، وقائمة الصيدليات التي تحتاج إلى إعادة تزويد عاجل مرتبة حسب الأولوية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onThresholdChange && (
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="whitespace-nowrap">حد التنبيه العام (&lt;)</span>
              <input
                type="number"
                min={1}
                max={999}
                value={safeDefaultThreshold}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1));
                  onThresholdChange(val);
                }}
                className="w-14 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-center font-mono tabular-nums text-xs font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                aria-label="حد التنبيه العام للمخزون"
              />
            </label>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={totalAlertsCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>تصدير CSV</span>
          </button>

          {onRefreshData && (
            <button
              type="button"
              onClick={onRefreshData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>تحديث الجرد</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip (Single-level hairline divided grid, tabular numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200 border-b border-slate-200 bg-slate-50/60">
        <div className="p-3.5 sm:p-4">
          <div className="text-xs font-medium text-slate-500">أصناف دون حد التنبيه</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {belowThresholdProducts.length}
            </span>
            <span className="text-xs text-slate-500">
              {criticalProductsCount > 0 ? `منها ${criticalProductsCount} نفاد تام` : "لا يوجد نفاد تام"}
            </span>
          </div>
        </div>

        <div className="p-3.5 sm:p-4">
          <div className="text-xs font-medium text-slate-500">صيدليات تحتاج توريداً عاجلاً</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-rose-700">
              {pharmaciesOnlyCount}
            </span>
            <span className="text-xs text-slate-500">
              {criticalPharmaciesCount > 0 ? `${criticalPharmaciesCount} حالة حرجة` : "متابعة دورية"}
            </span>
          </div>
        </div>

        <div className="p-3.5 sm:p-4">
          <div className="text-xs font-medium text-slate-500">إجمالي بلاغات النقص النشطة</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {urgentPharmacies.reduce((sum, p) => sum + p.totalAffectedCount, 0)}
            </span>
            <span className="text-xs text-slate-500">أحدث قراءة لكل صنف</span>
          </div>
        </div>

        <div className="p-3.5 sm:p-4">
          <div className="text-xs font-medium text-slate-500">حالات النفاد التام (0)</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-rose-700">
              {urgentPharmacies.reduce((sum, p) => sum + p.outOfStockCount, 0)}
            </span>
            <span className="text-xs text-slate-500">تتطلب توريداً فورياً</span>
          </div>
        </div>
      </div>

      {/* Filter & Navigation Toolbar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Segmented Control */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveView("both")}
              className={`rounded-md px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === "both" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              عرض شامل
            </button>
            <button
              type="button"
              onClick={() => setActiveView("products")}
              className={`rounded-md px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                activeView === "products" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              الأصناف ({belowThresholdProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveView("pharmacies")}
              className={`rounded-md px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                activeView === "pharmacies" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              الصيدليات ({pharmaciesOnlyCount})
            </button>
          </div>

          {/* Severity Segmented Control */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setSeverityFilter("all")}
              className={`rounded-md px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                severityFilter === "all" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter("critical")}
              className={`rounded-md px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                severityFilter === "critical" ? "bg-white text-rose-700 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              نفاد تام (0)
            </button>
            <button
              type="button"
              onClick={() => setSeverityFilter("warning")}
              className={`rounded-md px-2.5 py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                severityFilter === "warning" ? "bg-white text-amber-700 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              منخفض
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial justify-end">
          <div className="relative flex-1 sm:w-64 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الدواء أو الصيدلية..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-9 text-xs text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "severity" | "recent" | "count")}
            aria-label="ترتيب التنبيهات"
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none cursor-pointer"
          >
            <option value="severity">الأشد حرجاً أولاً</option>
            <option value="count">الأكثر تأثراً</option>
            <option value="recent">الأحدث إبلاغاً</option>
          </select>
        </div>
      </div>

      {/* Main Content Split / Sections */}
      <div
        className={`grid grid-cols-1 divide-y divide-slate-200 ${
          activeView === "both" ? "xl:grid-cols-12 xl:divide-y-0 xl:divide-x xl:divide-x-reverse" : ""
        }`}
      >
        {/* SECTION A: PRODUCTS BELOW THRESHOLD */}
        {(activeView === "both" || activeView === "products") && (
          <div className={activeView === "both" ? "xl:col-span-6 flex flex-col" : "flex flex-col"}>
            <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-rose-600 shrink-0" />
                <h4 className="text-sm font-bold text-slate-900">
                  ملخص الأصناف دون حد التنبيه
                </h4>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  ({filteredProducts.length})
                </span>
              </div>

              {onNavigateToCatalog && (
                <button
                  type="button"
                  onClick={onNavigateToCatalog}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  فتح الكتالوج
                </button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">
                  لا توجد أصناف دون حد التنبيه ({safeDefaultThreshold}) حالياً
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {searchQuery || severityFilter !== "all"
                    ? "جرّب مسح نص البحث أو تغيير فلتر الحرجية لعرض جميع الأصناف."
                    : "جميع أصناف الكتالوج وأرصدة الجرد الميداني ضمن المستوى الآمن."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 font-semibold">
                      <th className="py-2.5 px-4">الصنف الطبي</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">أدنى رصيد / الحد</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">المنشآت المتأثرة</th>
                      <th className="py-2.5 px-4 text-left whitespace-nowrap">إجراء سريع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((row) => {
                      const isCritical = row.severity === "critical";
                      const unitLabel = row.product.unit || "علبة";
                      const targetReport = row.topUrgentReport;

                      return (
                        <tr
                          key={`alert-prod-${row.product.id}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                              {row.product.name}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-2xs text-slate-500">
                              <span>{row.product.category || "عام"}</span>
                              <span aria-hidden="true">·</span>
                              <span className={isCritical ? "text-rose-700 font-semibold" : "text-amber-700 font-semibold"}>
                                {isCritical ? "نفاد تام" : `عجز ${row.deficit} ${unitLabel}`}
                              </span>
                              {row.catalogStock !== null && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="tabular-nums">مخزن المندوب: {row.catalogStock}</span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center align-top whitespace-nowrap">
                            <div className="inline-flex items-center gap-1 font-mono tabular-nums font-bold text-xs">
                              {isCritical ? (
                                <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              )}
                              <span className={isCritical ? "text-rose-700" : "text-amber-700"}>
                                {row.effectiveLowestQty}
                              </span>
                              <span className="text-slate-400">/</span>
                              <span className="text-slate-600">{row.threshold}</span>
                            </div>
                            <div className="text-3xs text-slate-400">{unitLabel}</div>
                          </td>

                          <td className="py-3 px-3 align-top">
                            {row.affectedPharmaciesCount > 0 ? (
                              <div className="space-y-0.5">
                                <div className="text-xs font-medium text-slate-800 truncate max-w-[180px]">
                                  {row.affectedReports[0].entityName || row.affectedReports[0].clientName}
                                </div>
                                <div className="text-2xs text-slate-500 tabular-nums">
                                  {row.affectedPharmaciesCount === 1
                                    ? `المتبقي: ${row.affectedReports[0].remainingQty}`
                                    : `+${row.affectedPharmaciesCount - 1} منشآت أخرى (إجمالي ${row.affectedPharmaciesCount})`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-2xs text-slate-500">رصيد الكتالوج الرئيسي</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-left align-top whitespace-nowrap">
                            {targetReport ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickRestockTarget(targetReport);
                                  setQuickRestockOrigin("product");
                                  setQuickRestockQty(String(Math.max(10, row.threshold * 3)));
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-2xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <ShoppingCart className="h-3 w-3 text-teal-400" />
                                <span>طلب توريد</span>
                              </button>
                            ) : onNavigateToCatalog ? (
                              <button
                                type="button"
                                onClick={onNavigateToCatalog}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-2xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <span>تعديل الرصيد</span>
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION B: PHARMACIES NEEDING URGENT RESTOCKING */}
        {(activeView === "both" || activeView === "pharmacies") && (
          <div className={activeView === "both" ? "xl:col-span-6 flex flex-col" : "flex flex-col"}>
            <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-rose-600 shrink-0" />
                <h4 className="text-sm font-bold text-slate-900">
                  الصيدليات التي تحتاج إعادة تزويد عاجل
                </h4>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  ({filteredPharmacies.length})
                </span>
              </div>

              <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-2xs font-medium">
                <button
                  type="button"
                  onClick={() => setEntityRoleFilter("pharmacies")}
                  className={`rounded-md px-2.5 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    entityRoleFilter === "pharmacies" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  الصيدليات ({pharmaciesOnlyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setEntityRoleFilter("all")}
                  className={`rounded-md px-2.5 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    entityRoleFilter === "all" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  جميع المنشآت ({urgentPharmacies.length})
                </button>
              </div>
            </div>

            {filteredPharmacies.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">
                  لا توجد صيدليات تحتاج إلى إعادة تزويد عاجل حالياً
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {entityRoleFilter === "pharmacies" && urgentPharmacies.length > pharmaciesOnlyCount
                    ? "توجد عيادات طبية بأرصدة منخفضة؛ يمكنك عرضها بالضغط على «جميع المنشآت»."
                    : "جميع كشوفات جرد الصيدليات المسجلة ضمن الحدود الطبيعية."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredPharmacies.map((pharmacy) => {
                  const isCritical = pharmacy.severity === "critical";
                  const isExpanded = !!expandedPharmacyKeys[pharmacy.key];
                  const visibleItems = isExpanded ? pharmacy.reports : pharmacy.reports.slice(0, 3);
                  const primaryReport = pharmacy.reports[0]?.report;

                  return (
                    <div key={`urgent-pharm-${pharmacy.key}`} className="p-4 space-y-3 hover:bg-slate-50/40 transition-colors">
                      {/* Pharmacy Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isCritical ? (
                              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            )}
                            <h5 className="text-sm font-bold text-slate-900 truncate">
                              {pharmacy.entityName}
                            </h5>
                            <span
                              className={`text-2xs font-semibold ${
                                isCritical ? "text-rose-700" : "text-amber-700"
                              }`}
                            >
                              {isCritical ? "تزويد عاجل جداً" : "رصيد منخفض"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-slate-500">
                            <span>{pharmacy.clientName}</span>
                            {pharmacy.location && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{pharmacy.location}</span>
                              </>
                            )}
                            {pharmacy.phone && (
                              <>
                                <span aria-hidden="true">·</span>
                                <a
                                  href={`tel:${pharmacy.phone}`}
                                  className="inline-flex items-center gap-1 font-mono tabular-nums text-teal-700 hover:underline"
                                >
                                  <Phone className="h-3 w-3" />
                                  <span>{pharmacy.phone}</span>
                                </a>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              {pharmacy.outOfStockCount > 0
                                ? `${pharmacy.outOfStockCount} نافد · ${pharmacy.totalAffectedCount} دون الحد`
                                : `${pharmacy.totalAffectedCount} أصناف دون الحد`}
                            </span>
                            {pharmacy.hasPendingOrder && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-teal-700">توجد طلبية قيد المراجعة</span>
                              </>
                            )}
                          </div>
                        </div>

                        {primaryReport && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onScheduleRestockVisit(primaryReport)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-2xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Calendar className="h-3.5 w-3.5 text-teal-700" />
                              <span>جدولة زيارة</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Depleted / Low-stock products list for this pharmacy */}
                      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
                        {visibleItems.map(({ report, threshold, isOutOfStock }) => {
                          const isRestockingThis =
                            quickRestockOrigin === "pharmacy" && quickRestockTarget?.id === report.id;
                          return (
                            <div key={`pharm-item-${report.id}`} className="px-3 py-2 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="min-w-0 flex-1">
                                  <span className="font-semibold text-slate-800">{report.productName}</span>
                                  <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                                  <span className="text-2xs text-slate-500 font-mono tabular-nums">
                                    {report.reportedAt ? new Date(report.reportedAt).toLocaleDateString("ar-YE") : ""}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <span
                                    className={`font-mono tabular-nums text-xs font-bold ${
                                      isOutOfStock ? "text-rose-700" : "text-amber-700"
                                    }`}
                                  >
                                    {isOutOfStock ? "نفاد تام (0)" : `${report.remainingQty} / ${threshold}`}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isRestockingThis) {
                                        setQuickRestockTarget(null);
                                        setQuickRestockOrigin(null);
                                      } else {
                                        setQuickRestockTarget(report);
                                        setQuickRestockOrigin("pharmacy");
                                        setQuickRestockQty(String(Math.max(10, threshold * 4)));
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-2xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    <ShoppingCart className="h-3 w-3 text-teal-400" />
                                    <span>طلب توريد فوري</span>
                                  </button>
                                </div>
                              </div>

                              {isRestockingThis && (
                                <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-100">
                                  <label className="text-2xs font-medium text-slate-600" htmlFor={`restock-qty-${report.id}`}>
                                    الكمية المطلوبة:
                                  </label>
                                  <input
                                    id={`restock-qty-${report.id}`}
                                    type="number"
                                    min={1}
                                    value={quickRestockQty}
                                    onChange={(e) => setQuickRestockQty(e.target.value)}
                                    className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-center font-mono tabular-nums text-xs font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    disabled={submittingRestock || !quickRestockQty || Number(quickRestockQty) <= 0}
                                    onClick={() => handleConfirmRestockSubmit(report)}
                                    className="rounded-md bg-teal-700 px-3 py-1 text-2xs font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    {submittingRestock ? "جاري الإرسال..." : "تأكيد الطلب"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickRestockTarget(null);
                                      setQuickRestockOrigin(null);
                                    }}
                                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-2xs font-medium text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {pharmacy.reports.length > 3 && (
                        <button
                          type="button"
                          onClick={() => togglePharmacyExpand(pharmacy.key)}
                          className="inline-flex items-center gap-1 text-2xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" />
                              <span>عرض أصناف أقل</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" />
                              <span>عرض جميع الأصناف الناقصة ({pharmacy.reports.length})</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline Quick Restock Drawer when triggered from Product Summary Table */}
      {quickRestockTarget && quickRestockOrigin === "product" && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-bold text-slate-900">طلب توريد فوري: </span>
            <span className="text-slate-700">{quickRestockTarget.productName}</span>
            <span className="mx-1.5 text-slate-400" aria-hidden="true">·</span>
            <span className="text-slate-600">{quickRestockTarget.entityName}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={quickRestockQty}
              onChange={(e) => setQuickRestockQty(e.target.value)}
              aria-label="كمية التوريد الفوري"
              className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-center font-mono tabular-nums text-xs font-bold text-slate-900 focus:border-teal-600 focus:outline-none"
            />
            <button
              type="button"
              disabled={submittingRestock || !quickRestockQty || Number(quickRestockQty) <= 0}
              onClick={() => handleConfirmRestockSubmit(quickRestockTarget)}
              className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {submittingRestock ? "جاري الإرسال..." : "تأكيد الطلب"}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickRestockTarget(null);
                setQuickRestockOrigin(null);
              }}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default AlertsDashboard;
