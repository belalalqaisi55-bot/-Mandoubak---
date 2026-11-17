import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { Clock, Zap, Hourglass, TrendingDown, CheckCircle2, Gauge } from "lucide-react";
import { Order } from "../types";

interface OrderResponseSpeedChartProps {
  orders: Order[];
  compact?: boolean;
}

interface MeasuredOrder {
  order: Order;
  createdMs: number;
  respondedMs: number;
  minutes: number;
}

export function formatResponseDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return "—";
  if (totalMinutes < 1) return "أقل من دقيقة";
  if (totalMinutes < 60) {
    const rounded = Math.round(totalMinutes);
    return `${rounded} دقيقة`;
  }
  const totalHours = totalMinutes / 60;
  if (totalHours < 24) {
    const hrs = Math.floor(totalHours);
    const mins = Math.round(totalMinutes - hrs * 60);
    if (mins === 0) return `${hrs} ساعة`;
    return `${hrs} س و ${mins} د`;
  }
  const days = Math.floor(totalHours / 24);
  const remHours = Math.round(totalHours - days * 24);
  return remHours > 0 ? `${days} ي و ${remHours} س` : `${days} يوم`;
}

function getSlaRating(avgMinutes: number): {
  label: string;
  badgeClass: string;
  accentColor: string;
} {
  if (avgMinutes <= 15) {
    return {
      label: "استجابة فائقة السرعة",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      accentColor: "#10b981",
    };
  }
  if (avgMinutes <= 60) {
    return {
      label: "أداء سريع وممتاز",
      badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
      accentColor: "#0d9488",
    };
  }
  if (avgMinutes <= 240) {
    return {
      label: "استجابة متوسطة",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      accentColor: "#f59e0b",
    };
  }
  return {
    label: "يحتاج تسريع المعالجة",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    accentColor: "#f43f5e",
  };
}

export const OrderResponseSpeedChart: React.FC<OrderResponseSpeedChartProps> = ({
  orders,
  compact = false,
}) => {
  const [rangeFilter, setRangeFilter] = useState<"all" | "30d" | "7d">("all");

  const analytics = useMemo(() => {
    const now = Date.now();
    const cutoffMs =
      rangeFilter === "7d"
        ? now - 7 * 24 * 60 * 60 * 1000
        : rangeFilter === "30d"
        ? now - 30 * 24 * 60 * 60 * 1000
        : 0;

    const scopedOrders = orders.filter((o) => {
      if (!cutoffMs) return true;
      const createdMs = new Date(o.createdAt).getTime();
      return Number.isFinite(createdMs) && createdMs >= cutoffMs;
    });

    const pendingOrders = scopedOrders.filter((o) => o.status === "pending");

    const measured: MeasuredOrder[] = [];
    scopedOrders.forEach((order) => {
      if (order.status === "pending") return;
      const createdMs = new Date(order.createdAt).getTime();
      const responseIso =
        order.respondedAt || order.approvedAt || order.updatedAt || order.completedAt;
      if (!responseIso) return;
      const respondedMs = new Date(responseIso).getTime();
      if (!Number.isFinite(createdMs) || !Number.isFinite(respondedMs)) return;
      const diffMs = respondedMs - createdMs;
      if (diffMs < 0) return;

      const minutes = Math.round((diffMs / 60000) * 10) / 10;
      measured.push({ order, createdMs, respondedMs, minutes });
    });

    const totalMeasured = measured.length;
    const avgMinutes =
      totalMeasured > 0
        ? measured.reduce((sum, item) => sum + item.minutes, 0) / totalMeasured
        : 0;
    const minMinutes =
      totalMeasured > 0 ? Math.min(...measured.map((m) => m.minutes)) : 0;
    const maxMinutes =
      totalMeasured > 0 ? Math.max(...measured.map((m) => m.minutes)) : 0;
    const fastCount = measured.filter((m) => m.minutes <= 30).length;
    const fastRate =
      totalMeasured > 0 ? Math.round((fastCount / totalMeasured) * 100) : 0;

    // Oldest pending wait time
    let oldestPendingWaitMinutes = 0;
    if (pendingOrders.length > 0) {
      const oldestCreated = Math.min(
        ...pendingOrders
          .map((o) => new Date(o.createdAt).getTime())
          .filter((t) => Number.isFinite(t))
      );
      if (Number.isFinite(oldestCreated) && now > oldestCreated) {
        oldestPendingWaitMinutes = (now - oldestCreated) / 60000;
      }
    }

    // Group by day for trend chart (up to last 14 active days)
    const dayMap = new Map<
      string,
      { isoDay: string; totalMin: number; minMin: number; count: number }
    >();
    measured.forEach((m) => {
      const d = new Date(m.createdMs);
      const isoDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
      const existing = dayMap.get(isoDay);
      if (!existing) {
        dayMap.set(isoDay, {
          isoDay,
          totalMin: m.minutes,
          minMin: m.minutes,
          count: 1,
        });
      } else {
        existing.totalMin += m.minutes;
        existing.minMin = Math.min(existing.minMin, m.minutes);
        existing.count += 1;
      }
    });

    const trendData = Array.from(dayMap.values())
      .sort((a, b) => a.isoDay.localeCompare(b.isoDay))
      .slice(-14)
      .map((d) => ({
        dateLabel: d.isoDay.slice(5).replace("-", "/"),
        avgMinutes: Math.round((d.totalMin / d.count) * 10) / 10,
        fastestMinutes: Math.round(d.minMin * 10) / 10,
        ordersCount: d.count,
      }));

    // SLA distribution buckets
    const buckets = [
      { key: "instant", name: "أقل من 15 د", count: 0, fill: "#10b981" },
      { key: "fast", name: "15 - 60 د", count: 0, fill: "#0d9488" },
      { key: "medium", name: "1 - 4 س", count: 0, fill: "#f59e0b" },
      { key: "slow", name: "أكثر من 4 س", count: 0, fill: "#f43f5e" },
    ];

    measured.forEach((m) => {
      if (m.minutes < 15) buckets[0].count += 1;
      else if (m.minutes <= 60) buckets[1].count += 1;
      else if (m.minutes <= 240) buckets[2].count += 1;
      else buckets[3].count += 1;
    });

    const bucketData = buckets.map((b) => ({
      ...b,
      percentage:
        totalMeasured > 0 ? Math.round((b.count / totalMeasured) * 100) : 0,
    }));

    return {
      totalScoped: scopedOrders.length,
      pendingCount: pendingOrders.length,
      oldestPendingWaitMinutes,
      totalMeasured,
      avgMinutes,
      minMinutes,
      maxMinutes,
      fastCount,
      fastRate,
      trendData,
      bucketData,
      sla: getSlaRating(avgMinutes),
    };
  }, [orders, rangeFilter]);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4 text-right"
      dir="rtl"
      id="order-response-speed-panel"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-teal-700 shadow-2xs">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                متوسط سرعة الاستجابة للطلبيات
              </h3>
              {analytics.totalMeasured > 0 && (
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${analytics.sla.badgeClass}`}
                >
                  {analytics.sla.label}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              قياس الزمن الفعلي بين إرسال الطلبية من العميل وأول معالجة أو اعتماد من المندوب
            </p>
          </div>
        </div>

        {/* Range Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200 self-start sm:self-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setRangeFilter("all")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              rangeFilter === "all"
                ? "bg-white text-teal-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => setRangeFilter("30d")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              rangeFilter === "30d"
                ? "bg-white text-teal-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            30 يوم
          </button>
          <button
            type="button"
            onClick={() => setRangeFilter("7d")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              rangeFilter === "7d"
                ? "bg-white text-teal-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            7 أيام
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/70 to-white p-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-teal-800 mb-1">
            <span>متوسط سرعة الاستجابة</span>
            <Clock className="h-3.5 w-3.5 text-teal-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">
            {analytics.totalMeasured > 0
              ? formatResponseDuration(analytics.avgMinutes)
              : "لا توجد بيانات"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            بناءً على {analytics.totalMeasured} طلبية مُعالجة
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 mb-1">
            <span>نسبة الاستجابة السريعة</span>
            <Zap className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700">
            {analytics.totalMeasured > 0 ? `${analytics.fastRate}%` : "—"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            خلال 30 دقيقة أو أقل ({analytics.fastCount} طلبية)
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
            <span>أسرع / أبطأ استجابة</span>
            <TrendingDown className="h-3.5 w-3.5 text-cyan-600" />
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 truncate">
            {analytics.totalMeasured > 0
              ? formatResponseDuration(analytics.minMinutes)
              : "—"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            الأبطأ:{" "}
            {analytics.totalMeasured > 0
              ? formatResponseDuration(analytics.maxMinutes)
              : "—"}
          </div>
        </div>

        <div
          className={`rounded-xl border p-3 ${
            analytics.pendingCount > 0
              ? "border-amber-200 bg-amber-50/60"
              : "border-slate-200 bg-slate-50/70"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 mb-1">
            <span>طلبيات بانتظار الرد</span>
            {analytics.pendingCount > 0 ? (
              <Hourglass className="h-3.5 w-3.5 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            )}
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">
            {analytics.pendingCount} طلبية
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5 truncate">
            {analytics.pendingCount > 0
              ? `أقدم طلبية: ${formatResponseDuration(analytics.oldestPendingWaitMinutes)}`
              : "لا توجد طلبيات متأخرة"}
          </div>
        </div>
      </div>

      {/* Charts Area */}
      {analytics.totalMeasured === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 py-8 px-4 text-center space-y-1.5">
          <Clock className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">
            لا توجد طلبيات مُستجاب لها ضمن النطاق الزمني المحدد بعد
          </p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            بمجرد اعتماد أو إكمال أي طلبية واردة من العملاء، سيتم احتساب سرعة الاستجابة ورسم المنحنى البياني تلقائياً.
          </p>
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 ${
            compact ? "lg:grid-cols-3" : "lg:grid-cols-3"
          } gap-4`}
        >
          {/* Daily Response Time Trend (Area + Bar ComposedChart) */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-slate-50/40 p-3.5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  تطور متوسط سرعة الاستجابة اليومي (بالدقائق)
                </h4>
                <span className="text-[11px] text-slate-400">
                  الخط المنقط يوضح المتوسط العام ({Math.round(analytics.avgMinutes)} دقيقة)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-teal-600 inline-block" />
                  <span>متوسط الزمن</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-cyan-300 inline-block" />
                  <span>عدد الطلبيات</span>
                </span>
              </div>
            </div>

            <div className="h-60 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={analytics.trendData}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="respSpeedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="dateLabel" fontSize={11} tick={{ fill: "#64748b" }} />
                  <YAxis
                    yAxisId="time"
                    fontSize={11}
                    tick={{ fill: "#64748b" }}
                    unit=" د"
                  />
                  <YAxis
                    yAxisId="count"
                    orientation="right"
                    allowDecimals={false}
                    fontSize={10}
                    tick={{ fill: "#94a3b8" }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const row = payload[0]?.payload;
                      return (
                        <div
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs text-right space-y-1"
                          dir="rtl"
                        >
                          <div className="font-black text-slate-900 border-b border-slate-100 pb-1">
                            تاريخ {label}
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-500">متوسط الاستجابة:</span>
                            <span className="font-bold text-teal-700">
                              {formatResponseDuration(row.avgMinutes)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-500">أسرع استجابة:</span>
                            <span className="font-bold text-emerald-700">
                              {formatResponseDuration(row.fastestMinutes)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-500">الطلبيات المعالجة:</span>
                            <span className="font-bold text-slate-800">
                              {row.ordersCount} طلبية
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    yAxisId="time"
                    y={Math.round(analytics.avgMinutes * 10) / 10}
                    stroke="#0f766e"
                    strokeDasharray="4 4"
                  />
                  <Bar
                    yAxisId="count"
                    dataKey="ordersCount"
                    barSize={18}
                    fill="#a5f3fc"
                    radius={[4, 4, 0, 0]}
                    name="عدد الطلبيات"
                  />
                  <Area
                    yAxisId="time"
                    type="monotone"
                    dataKey="avgMinutes"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    fill="url(#respSpeedGrad)"
                    activeDot={{ r: 5, fill: "#0f766e" }}
                    name="متوسط الاستجابة (دقيقة)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SLA Buckets Distribution BarChart */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 flex flex-col justify-between">
            <div className="mb-3">
              <h4 className="text-xs font-bold text-slate-800">
                توزيع سرعة الاستجابة (SLA)
              </h4>
              <span className="text-[11px] text-slate-400">
                تصنيف الطلبيات حسب مدة الرد
              </span>
            </div>

            <div className="h-60 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.bucketData}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} tick={{ fill: "#475569" }} />
                  <YAxis allowDecimals={false} fontSize={11} tick={{ fill: "#64748b" }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0]?.payload;
                      return (
                        <div
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs text-right"
                          dir="rtl"
                        >
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-teal-700 font-bold mt-0.5">
                            {item.count} طلبية ({item.percentage}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} name="عدد الطلبيات">
                    {analytics.bucketData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderResponseSpeedChart;
