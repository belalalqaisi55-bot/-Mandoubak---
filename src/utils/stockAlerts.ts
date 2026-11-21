import { Product, StockReport } from "../types";

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
export const LOW_STOCK_THRESHOLD_STORAGE_KEY = "mandoubak_low_stock_threshold";

export type StockWarningSeverity = "none" | "warning" | "critical";

export interface ProductStockEvaluation {
  isBelowThreshold: boolean;
  severity: StockWarningSeverity;
  effectiveStock: number | null;
  threshold: number;
  source: "input" | "product" | "report" | "none";
  affectedEntitiesCount: number;
  lowestReportEntity?: string;
  label: string;
  shortLabel: string;
  tooltip: string;
}

export function loadClientLowStockThreshold(): number {
  try {
    const raw = localStorage.getItem(LOW_STOCK_THRESHOLD_STORAGE_KEY);
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_LOW_STOCK_THRESHOLD;
}

export function saveClientLowStockThreshold(threshold: number): number {
  const safe = Math.max(1, Math.min(999, Math.floor(Number(threshold) || DEFAULT_LOW_STOCK_THRESHOLD)));
  try {
    localStorage.setItem(LOW_STOCK_THRESHOLD_STORAGE_KEY, String(safe));
  } catch {
    // Ignore storage errors
  }
  return safe;
}

function normalizeNameKey(name?: string): string {
  return (name || "").trim().toLowerCase();
}

/**
 * Deduplicates stock reports by (clientId + product) keeping only the newest report per client
 * so resolved/restocked items stop triggering stale low-stock alerts.
 */
export function getLatestStockReportsByProduct(
  stockReports: StockReport[]
): Map<string, StockReport[]> {
  const latestPerClientProduct = new Map<string, StockReport>();

  for (const report of stockReports) {
    if (!report) continue;
    const productKey = report.productId || normalizeNameKey(report.productName);
    if (!productKey) continue;
    const clientKey = report.clientId || report.entityName || report.clientName || "unknown";
    const compositeKey = `${clientKey}::${productKey}`;

    const existing = latestPerClientProduct.get(compositeKey);
    const reportTime = new Date(report.reportedAt || 0).getTime() || 0;
    const existingTime = existing ? new Date(existing.reportedAt || 0).getTime() || 0 : -1;

    if (!existing || reportTime >= existingTime) {
      latestPerClientProduct.set(compositeKey, report);
    }
  }

  const byProduct = new Map<string, StockReport[]>();
  for (const report of latestPerClientProduct.values()) {
    const keys = new Set<string>();
    if (report.productId) keys.add(report.productId);
    const nameKey = normalizeNameKey(report.productName);
    if (nameKey) keys.add(`name:${nameKey}`);

    for (const key of keys) {
      const list = byProduct.get(key) || [];
      list.push(report);
      byProduct.set(key, list);
    }
  }

  return byProduct;
}

export interface EvaluateProductStockOptions {
  remainingInput?: string;
  latestReportsMap?: Map<string, StockReport[]>;
  defaultThreshold?: number;
  /**
   * When true (e.g., rep catalog cards), checks product stock + live input + reported low stock
   * and triggers if ANY active reading is below threshold.
   * When false (e.g., card with live shelf stepper), prioritizes live input when entered.
   */
  combineSourcesForRep?: boolean;
}

export function evaluateProductStockWarning(
  prod: Product,
  options: EvaluateProductStockOptions = {}
): ProductStockEvaluation {
  const threshold =
    typeof prod.lowStockThreshold === "number" && prod.lowStockThreshold > 0
      ? prod.lowStockThreshold
      : Math.max(1, options.defaultThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD);

  const rawInput = (options.remainingInput ?? "").trim();
  const parsedInput = rawInput !== "" ? Number(rawInput) : NaN;
  const hasValidInput = rawInput !== "" && !isNaN(parsedInput) && parsedInput >= 0;

  const hasProductStock = typeof prod.stock === "number" && !isNaN(prod.stock) && prod.stock >= 0;
  const productStock = hasProductStock ? (prod.stock as number) : null;

  const matchingReports: StockReport[] = [];
  if (options.latestReportsMap) {
    const byId = options.latestReportsMap.get(prod.id) || [];
    const byName = options.latestReportsMap.get(`name:${normalizeNameKey(prod.name)}`) || [];
    const seenIds = new Set<string>();
    for (const r of [...byId, ...byName]) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        matchingReports.push(r);
      }
    }
  }

  const lowReports = matchingReports
    .filter((r) => typeof r.remainingQty === "number" && r.remainingQty < threshold)
    .sort((a, b) => a.remainingQty - b.remainingQty);

  const lowestLowReport = lowReports[0];

  let effectiveStock: number | null = null;
  let source: ProductStockEvaluation["source"] = "none";

  if (options.combineSourcesForRep) {
    const candidates: Array<{ qty: number; source: ProductStockEvaluation["source"] }> = [];
    if (hasValidInput) candidates.push({ qty: parsedInput, source: "input" });
    if (productStock !== null) candidates.push({ qty: productStock, source: "product" });
    if (lowestLowReport) candidates.push({ qty: lowestLowReport.remainingQty, source: "report" });

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.qty - b.qty);
      effectiveStock = candidates[0].qty;
      source = candidates[0].source;
    }
  } else {
    if (hasValidInput) {
      effectiveStock = parsedInput;
      source = "input";
    } else if (productStock !== null) {
      effectiveStock = productStock;
      source = "product";
    } else if (lowestLowReport) {
      effectiveStock = lowestLowReport.remainingQty;
      source = "report";
    }
  }

  const isBelowThreshold = effectiveStock !== null && effectiveStock < threshold;

  if (!isBelowThreshold || effectiveStock === null) {
    return {
      isBelowThreshold: false,
      severity: "none",
      effectiveStock,
      threshold,
      source,
      affectedEntitiesCount: lowReports.length,
      lowestReportEntity: lowestLowReport?.entityName || lowestLowReport?.clientName,
      label: "",
      shortLabel: "",
      tooltip: "",
    };
  }

  const severity: StockWarningSeverity = effectiveStock === 0 ? "critical" : "warning";
  const unitLabel = prod.unit || "علبة";
  const entityName = lowestLowReport?.entityName || lowestLowReport?.clientName;

  const label =
    severity === "critical"
      ? `تنبيه نفاد تام (0 ${unitLabel})`
      : `نقص مخزون: ${effectiveStock} ${unitLabel} (< ${threshold})`;

  const shortLabel =
    severity === "critical"
      ? "نفاد تام (0)"
      : `مخزون منخفض (${effectiveStock})`;

  let tooltip = `تنبيه فوري للمندوب: الرصيد (${effectiveStock} ${unitLabel}) أقل من حد التنبيه (${threshold}).`;
  if (source === "report" && entityName) {
    tooltip = `تنبيه فوري للمندوب: أقل رصيد مبلّغ في "${entityName}" هو ${effectiveStock} ${unitLabel} (حد التنبيه: ${threshold})${
      lowReports.length > 1 ? ` — إجمالي ${lowReports.length} منشآت تحت الحد` : ""
    }.`;
  }

  return {
    isBelowThreshold: true,
    severity,
    effectiveStock,
    threshold,
    source,
    affectedEntitiesCount: lowReports.length,
    lowestReportEntity: entityName,
    label,
    shortLabel,
    tooltip,
  };
}
