import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { Calendar, MapPin, TrendingUp, Award } from "lucide-react";
import { Visit } from "../types";

interface MonthlyVisitsChartProps {
  visits: Visit[];
}

interface MonthlyBucket {
  monthKey: string;
  label: string;
  fullLabel: string;
  totalVisits: number;
  completedVisits: number;
  completedTasks: number;
  totalTasks: number;
}

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function parseVisitDate(visit: Visit): Date | null {
  const raw = visit.visitDate || visit.createdAt;
  if (!raw) return null;
  const trimmed = raw.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const MonthlyVisitsChart: React.FC<MonthlyVisitsChartProps> = ({ visits }) => {
  const [monthsRange, setMonthsRange] = useState<6 | 12>(12);
  const [selectedRep, setSelectedRep] = useState<string>("all");

  const repOptions = useMemo(() => {
    const names = new Set<string>();
    visits.forEach((v) => {
      const name = (v.repName && v.repName.trim()) || "د/ بلال القيسي";
      names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, "ar"));
  }, [visits]);

  const analytics = useMemo(() => {
    const now = new Date();
    const bucketsMap = new Map<string, MonthlyBucket>();
    const orderedKeys: string[] = [];

    for (let i = monthsRange - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const monthKey = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
      const shortYear = String(year).slice(-2);
      const label =
        monthsRange === 12
          ? `${ARABIC_MONTHS[monthIdx]} ${shortYear}`
          : ARABIC_MONTHS[monthIdx];
      const fullLabel = `${ARABIC_MONTHS[monthIdx]} ${year}`;

      orderedKeys.push(monthKey);
      bucketsMap.set(monthKey, {
        monthKey,
        label,
        fullLabel,
        totalVisits: 0,
        completedVisits: 0,
        completedTasks: 0,
        totalTasks: 0,
      });
    }

    const filteredVisits =
      selectedRep === "all"
        ? visits
        : visits.filter(
            (v) => ((v.repName && v.repName.trim()) || "د/ بلال القيسي") === selectedRep
          );

    filteredVisits.forEach((visit) => {
      const d = parseVisitDate(visit);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = bucketsMap.get(key);
      if (!bucket) return;

      bucket.totalVisits += 1;
      if (visit.status === "completed") {
        bucket.completedVisits += 1;
      }
      if (Array.isArray(visit.tasks)) {
        visit.tasks.forEach((t) => {
          bucket.totalTasks += 1;
          if (t.completed) bucket.completedTasks += 1;
        });
      }
    });

    const data = orderedKeys.map((k) => bucketsMap.get(k)!);
    const totalInRange = data.reduce((sum, item) => sum + item.totalVisits, 0);
    const completedInRange = data.reduce((sum, item) => sum + item.completedVisits, 0);
    const monthlyAvg =
      data.length > 0 ? Math.round((totalInRange / data.length) * 10) / 10 : 0;
    const peakBucket = data.reduce<MonthlyBucket | null>(
      (best, cur) => (!best || cur.totalVisits > best.totalVisits ? cur : best),
      null
    );
    const currentMonthBucket = data[data.length - 1] || null;
    const prevMonthBucket = data.length >= 2 ? data[data.length - 2] : null;
    const currentVsPrevDiff =
      currentMonthBucket && prevMonthBucket
        ? currentMonthBucket.totalVisits - prevMonthBucket.totalVisits
        : 0;

    return {
      data,
      totalInRange,
      completedInRange,
      monthlyAvg,
      peakBucket,
      currentMonthCount: currentMonthBucket?.totalVisits || 0,
      currentVsPrevDiff,
    };
  }, [visits, monthsRange, selectedRep]);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4 text-right"
      dir="rtl"
      id="monthly-visits-chart-panel"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-200 text-teal-700 shadow-2xs">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                الزيارات الشهرية للمندوب
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                {analytics.totalInRange} زيارة خلال {monthsRange} شهراً
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              توزيع الزيارات الميدانية الشهرية ومقارنتها بالزيارات المكتملة ومتوسط الأداء الشهري
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {repOptions.length > 1 && (
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              aria-label="تصفية حسب المندوب"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">جميع المندوبين</option>
              {repOptions.map((rep) => (
                <option key={rep} value={rep}>
                  {rep}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMonthsRange(6)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                monthsRange === 6
                  ? "bg-white text-teal-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              6 أشهر
            </button>
            <button
              type="button"
              onClick={() => setMonthsRange(12)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                monthsRange === 12
                  ? "bg-white text-teal-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              12 شهراً
            </button>
          </div>
        </div>
      </div>

      {/* Mini KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/70 to-white p-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-teal-800 mb-1">
            <span>زيارات الشهر الحالي</span>
            <MapPin className="h-3.5 w-3.5 text-teal-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">
            {analytics.currentMonthCount} زيارة
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {analytics.currentVsPrevDiff > 0
              ? `+${analytics.currentVsPrevDiff} عن الشهر السابق`
              : analytics.currentVsPrevDiff < 0
              ? `${analytics.currentVsPrevDiff} عن الشهر السابق`
              : "مطابق للشهر السابق"}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 mb-1">
            <span>الزيارات المكتملة</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700">
            {analytics.completedInRange} زيارة
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {analytics.totalInRange > 0
              ? `بنسبة ${Math.round((analytics.completedInRange / analytics.totalInRange) * 100)}% من الإجمالي`
              : "لا توجد زيارات مسجلة"}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
            <span>المتوسط الشهري</span>
            <Calendar className="h-3.5 w-3.5 text-sky-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">
            {analytics.monthlyAvg} زيارة
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            لكل شهر خلال الفترة المحددة
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 mb-1">
            <span>أعلى شهر نشاطاً</span>
            <Award className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 truncate">
            {analytics.peakBucket && analytics.peakBucket.totalVisits > 0
              ? analytics.peakBucket.fullLabel
              : "لا توجد بيانات"}
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">
            {analytics.peakBucket && analytics.peakBucket.totalVisits > 0
              ? `${analytics.peakBucket.totalVisits} زيارة مسجلة`
              : "أضف زيارات لعرض الذروة"}
          </div>
        </div>
      </div>

      {/* Recharts Visualization */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold text-slate-700">
            الخط المتقطع يوضح المتوسط الشهري ({analytics.monthlyAvg} زيارة)
          </span>
          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-teal-600 inline-block" />
              <span>إجمالي الزيارات</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
              <span>الزيارات المكتملة</span>
            </span>
          </div>
        </div>

        <div className="h-64 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={analytics.data}
              margin={{ top: 10, right: 12, left: -16, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                fontSize={10}
                tick={{ fill: "#475569" }}
                interval={0}
                angle={monthsRange === 12 ? -20 : 0}
                textAnchor={monthsRange === 12 ? "end" : "middle"}
                height={monthsRange === 12 ? 42 : 28}
              />
              <YAxis allowDecimals={false} fontSize={11} tick={{ fill: "#64748b" }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const row = payload[0]?.payload as MonthlyBucket;
                  return (
                    <div
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs text-right space-y-1"
                      dir="rtl"
                    >
                      <div className="font-black text-slate-900 border-b border-slate-100 pb-1">
                        {row.fullLabel}
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">إجمالي الزيارات:</span>
                        <span className="font-black text-teal-700">{row.totalVisits} زيارة</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">الزيارات المكتملة:</span>
                        <span className="font-bold text-amber-700">
                          {row.completedVisits} زيارة
                        </span>
                      </div>
                      {row.totalTasks > 0 && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-500">المهام المنجزة:</span>
                          <span className="font-bold text-emerald-700">
                            {row.completedTasks} / {row.totalTasks}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              {analytics.monthlyAvg > 0 && (
                <ReferenceLine
                  y={analytics.monthlyAvg}
                  stroke="#0f766e"
                  strokeDasharray="4 4"
                />
              )}
              <Bar
                dataKey="totalVisits"
                name="إجمالي الزيارات"
                barSize={monthsRange === 12 ? 22 : 34}
                radius={[6, 6, 0, 0]}
              >
                {analytics.data.map((entry) => {
                  const isPeak =
                    analytics.peakBucket &&
                    entry.totalVisits > 0 &&
                    entry.monthKey === analytics.peakBucket.monthKey;
                  return (
                    <Cell
                      key={entry.monthKey}
                      fill={
                        isPeak
                          ? "#0f766e"
                          : entry.totalVisits > 0
                          ? "#14b8a6"
                          : "#e2e8f0"
                      }
                    />
                  );
                })}
              </Bar>
              <Line
                type="monotone"
                dataKey="completedVisits"
                name="الزيارات المكتملة"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: "#f59e0b", strokeWidth: 1.5, stroke: "#ffffff" }}
                activeDot={{ r: 5.5, fill: "#d97706" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MonthlyVisitsChart;
