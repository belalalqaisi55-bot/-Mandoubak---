import React from "react";
import { AlertTriangle } from "lucide-react";
import { ProductStockEvaluation } from "../utils/stockAlerts";

interface StockWarningBadgeProps {
  evaluation: ProductStockEvaluation;
  productId?: string;
  compact?: boolean;
  className?: string;
}

export const StockWarningBadge: React.FC<StockWarningBadgeProps> = ({
  evaluation,
  productId,
  compact = false,
  className = "",
}) => {
  if (!evaluation.isBelowThreshold) return null;

  const isCritical = evaluation.severity === "critical";

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid={productId ? `stock-warning-badge-${productId}` : "stock-warning-badge"}
      title={evaluation.tooltip}
      className={`inline-flex items-center gap-1 rounded-md border font-black shadow-2xs transition-all ${
        compact ? "px-1.5 py-0.5 text-4xs" : "px-2 py-0.5 text-3xs"
      } ${
        isCritical
          ? "bg-rose-600 text-white border-rose-700"
          : "bg-amber-100 text-amber-950 border-amber-400"
      } ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
          isCritical ? "bg-white animate-ping" : "bg-amber-600 animate-pulse"
        }`}
      />
      <AlertTriangle
        className={`shrink-0 ${compact ? "h-2.5 w-2.5" : "h-3 w-3"} ${
          isCritical ? "text-amber-200" : "text-rose-600"
        }`}
      />
      <span className="truncate">
        {compact ? evaluation.shortLabel : evaluation.label}
      </span>
      {evaluation.source === "report" && evaluation.affectedEntitiesCount > 0 && !compact && (
        <span
          className={`px-1 rounded text-4xs font-mono ${
            isCritical ? "bg-rose-800/80 text-rose-100" : "bg-amber-200/80 text-amber-950"
          }`}
        >
          {evaluation.affectedEntitiesCount} منشأة
        </span>
      )}
    </span>
  );
};
