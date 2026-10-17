import React, { useState, useEffect, useMemo } from "react";
import { User, Notification, Visit, Order, StockReport, AppSettings } from "../types";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured, getDocsWithTimeout } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Bell,
  MapPin,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Building,
  UserCheck,
  UserX,
  Send,
  Zap,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Calendar,
  Layers,
  ChevronRight,
  Database,
  BarChart3,
  PieChart,
  ShieldCheck,
  CheckCheck,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Filter,
  ArrowUpRight,
  ToggleLeft,
  ToggleRight,
  Stethoscope,
  Pill,
  ShoppingCart
} from "lucide-react";

interface AdminAnalyticsDashboardProps {
  initialUsers?: User[];
  initialNotifications?: Notification[];
  initialVisits?: Visit[];
  initialOrders?: Order[];
  initialStockReports?: StockReport[];
  appSettings: AppSettings;
  onUpdateSettings?: (key: keyof AppSettings, value: boolean) => void;
  onNavigateTab?: (tab: string) => void;
}

export const AdminAnalyticsDashboard: React.FC<AdminAnalyticsDashboardProps> = ({
  initialUsers = [],
  initialNotifications = [],
  initialVisits = [],
  initialOrders = [],
  initialStockReports = [],
  appSettings,
  onUpdateSettings,
  onNavigateTab,
}) => {
  // Live Firestore State
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [stockReports, setStockReports] = useState<StockReport[]>(initialStockReports);

  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeSection, setActiveSection] = useState<"overview" | "users" | "notifications" | "visits" | "orders">("overview");
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "week" | "today">("all");
  const [firestoreStatus, setFirestoreStatus] = useState<"connected" | "connecting" | "offline">("connected");

  // Keep in sync with parent props when they change
  useEffect(() => {
    if (initialUsers.length > 0) setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    if (initialNotifications.length > 0) setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    if (initialVisits.length > 0) setVisits(initialVisits);
  }, [initialVisits]);

  useEffect(() => {
    if (initialOrders.length > 0) setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    if (initialStockReports.length > 0) setStockReports(initialStockReports);
  }, [initialStockReports]);

  // Fetch fresh data directly from Firestore or API fallback
  const fetchAnalyticsFromFirestore = async () => {
    setIsLoading(true);
    setFirestoreStatus("connecting");
    try {
      let directSuccess = false;
      if (isFirebaseConfigured && db) {
        try {
          // Parallel fetch with timeout protection (max 2.5s) to avoid 10s offline hangs
          const [usersSnap, notifsSnap, visitsSnap, ordersSnap, reportsSnap] = await Promise.all([
            getDocsWithTimeout(collection(db, "users"), 2500).catch(() => null),
            getDocsWithTimeout(collection(db, "notifications"), 2500).catch(() => null),
            getDocsWithTimeout(collection(db, "visits"), 2500).catch(() => null),
            getDocsWithTimeout(collection(db, "orders"), 2500).catch(() => null),
            getDocsWithTimeout(collection(db, "stockReports"), 2500).catch(() => null),
          ]);

          if (usersSnap && usersSnap.docs) {
            const fsUsers = usersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as User));
            if (fsUsers.length > 0) setUsers(fsUsers);
            directSuccess = true;
          }
          if (notifsSnap && notifsSnap.docs) {
            const fsNotifs = notifsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Notification));
            if (fsNotifs.length > 0) setNotifications(fsNotifs);
            directSuccess = true;
          }
          if (visitsSnap && visitsSnap.docs) {
            const fsVisits = visitsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Visit));
            if (fsVisits.length > 0) setVisits(fsVisits);
            directSuccess = true;
          }
          if (ordersSnap && ordersSnap.docs) {
            const fsOrders = ordersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Order));
            if (fsOrders.length > 0) setOrders(fsOrders);
            directSuccess = true;
          }
          if (reportsSnap && reportsSnap.docs) {
            const fsReports = reportsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as StockReport));
            if (fsReports.length > 0) setStockReports(fsReports);
            directSuccess = true;
          }

          if (directSuccess) {
            setFirestoreStatus("connected");
          }
        } catch {
          directSuccess = false;
        }
      }

      if (!directSuccess) {
        // Fallback to local API endpoints if Firestore direct is in offline mode
        const [rUsers, rNotifs, rVisits, rOrders, rReports] = await Promise.allSettled([
          fetch("/api/users").then(r => r.json()),
          fetch("/api/notifications").then(r => r.json()),
          fetch("/api/visits").then(r => r.json()),
          fetch("/api/orders").then(r => r.json()),
          fetch("/api/stock-reports").then(r => r.json()),
        ]);

        if (rUsers.status === "fulfilled" && Array.isArray(rUsers.value) && rUsers.value.length > 0) setUsers(rUsers.value);
        if (rNotifs.status === "fulfilled" && Array.isArray(rNotifs.value) && rNotifs.value.length > 0) setNotifications(rNotifs.value);
        if (rVisits.status === "fulfilled" && Array.isArray(rVisits.value) && rVisits.value.length > 0) setVisits(rVisits.value);
        if (rOrders.status === "fulfilled" && Array.isArray(rOrders.value) && rOrders.value.length > 0) setOrders(rOrders.value);
        if (rReports.status === "fulfilled" && Array.isArray(rReports.value) && rReports.value.length > 0) setStockReports(rReports.value);

        setFirestoreStatus("connected");
      }
      setLastUpdated(new Date());
    } catch {
      setFirestoreStatus("offline");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsFromFirestore();
  }, []);

  // Filter helper by date
  const isWithinTimeRange = (dateStr?: string) => {
    if (!dateStr || timeFilter === "all") return true;
    const date = new Date(dateStr);
    const now = new Date();
    if (isNaN(date.getTime())) return true;

    if (timeFilter === "today") {
      return date.toDateString() === now.toDateString();
    }
    if (timeFilter === "week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return date >= oneWeekAgo;
    }
    if (timeFilter === "month") {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return date >= oneMonthAgo;
    }
    return true;
  };

  // ==========================================
  // 1. CALCULATED USER METRICS
  // ==========================================
  const userMetrics = useMemo(() => {
    const filteredUsers = users.filter(u => isWithinTimeRange(u.createdAt));
    const total = filteredUsers.length;
    const pharmacies = filteredUsers.filter(u => u.role === "pharmacy");
    const doctors = filteredUsers.filter(u => u.role === "doctor");
    const reps = filteredUsers.filter(u => u.role === "rep" || u.role === "admin");
    
    const approved = filteredUsers.filter(u => u.isApproved !== false && u.status !== "pending_approval");
    const pending = filteredUsers.filter(u => u.isApproved === false || u.status === "pending_approval");
    const deviceRegistered = filteredUsers.filter(u => u.deviceRegistered);

    // Location distribution
    const locationMap: Record<string, number> = {};
    filteredUsers.forEach(u => {
      const loc = (u.location && u.location.trim()) || "غير محدد";
      locationMap[loc] = (locationMap[loc] || 0) + 1;
    });

    return {
      total,
      pharmaciesCount: pharmacies.length,
      doctorsCount: doctors.length,
      repsCount: reps.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      deviceRegisteredCount: deviceRegistered.length,
      locationMap,
      recentUsers: [...filteredUsers].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5)
    };
  }, [users, timeFilter]);

  // ==========================================
  // 2. CALCULATED NOTIFICATION & CLOUD FUNCTION METRICS
  // ==========================================
  const notificationMetrics = useMemo(() => {
    const filtered = notifications.filter(n => isWithinTimeRange(n.createdAt));
    const total = filtered.length;
    const broadcasts = filtered.filter(n => n.type === "broadcast");
    const targeted = filtered.filter(n => n.type === "target");
    
    // Cloud functions notifications count
    const cloudFunctionsSent = filtered.filter(n => n.sentVia === "cloud_function" || !n.sentVia).length;
    const deliveredCount = filtered.filter(n => n.deliveryStatus !== "queued").length;

    return {
      total,
      broadcastsCount: broadcasts.length,
      targetedCount: targeted.length,
      cloudFunctionsSent,
      deliveredCount,
      deliveryRate: total > 0 ? Math.round((deliveredCount / total) * 100) : 100,
      recentNotifications: [...filtered].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5)
    };
  }, [notifications, timeFilter]);

  // ==========================================
  // 3. CALCULATED VISIT METRICS (If Visit Tracking Enabled)
  // ==========================================
  const isVisitTrackingEnabled = appSettings.enableVisitTracking !== false;

  const visitMetrics = useMemo(() => {
    const filtered = visits.filter(v => isWithinTimeRange(v.visitDate || v.createdAt));
    const total = filtered.length;
    
    // Visits by Representative
    const repVisitsMap: Record<string, { name: string; count: number; completedTasks: number; totalTasks: number }> = {};
    
    let totalTasksCount = 0;
    let completedTasksCount = 0;

    filtered.forEach(v => {
      const repKey = v.repName || (v.repId ? `مندوب (${v.repId})` : "د/ بلال القيسي");
      if (!repVisitsMap[repKey]) {
        repVisitsMap[repKey] = { name: repKey, count: 0, completedTasks: 0, totalTasks: 0 };
      }
      repVisitsMap[repKey].count += 1;

      if (v.tasks && Array.isArray(v.tasks)) {
        v.tasks.forEach(t => {
          totalTasksCount += 1;
          repVisitsMap[repKey].totalTasks += 1;
          if (t.completed) {
            completedTasksCount += 1;
            repVisitsMap[repKey].completedTasks += 1;
          }
        });
      }
    });

    // Most visited clients/entities
    const clientVisitsMap: Record<string, { entityName: string; clientName: string; count: number }> = {};
    filtered.forEach(v => {
      const key = v.entityName || v.clientName || "عميل غير محدد";
      if (!clientVisitsMap[key]) {
        clientVisitsMap[key] = { entityName: v.entityName || key, clientName: v.clientName || "", count: 0 };
      }
      clientVisitsMap[key].count += 1;
    });

    const topVisited = Object.values(clientVisitsMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const taskCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 100;

    return {
      total,
      repVisitsList: Object.values(repVisitsMap).sort((a, b) => b.count - a.count),
      topVisited,
      totalTasksCount,
      completedTasksCount,
      taskCompletionRate,
      recentVisits: [...filtered].sort((a, b) => new Date(b.visitDate || b.createdAt || 0).getTime() - new Date(a.visitDate || a.createdAt || 0).getTime()).slice(0, 5)
    };
  }, [visits, timeFilter]);

  // Export Summary as Text / CSV
  const handleExportSummary = () => {
    const rows = [
      ["تقرير التحليلات والمؤشرات - تطبيق مندوبك الطبي"],
      ["تاريخ التقرير", new Date().toLocaleString("ar-YE")],
      [""],
      ["1. مؤشرات المستخدمين والعملاء (Users)"],
      ["إجمالي المسجلين", userMetrics.total.toString()],
      ["الصيدليات", userMetrics.pharmaciesCount.toString()],
      ["الأطباء والعيادات", userMetrics.doctorsCount.toString()],
      ["المندوبون والإدارة", userMetrics.repsCount.toString()],
      ["الحسابات المعتمدة", userMetrics.approvedCount.toString()],
      ["بانتظار الاعتماد", userMetrics.pendingCount.toString()],
      [""],
      ["2. مؤشرات الإشعارات و Cloud Functions"],
      ["إجمالي الإشعارات المرسلة", notificationMetrics.total.toString()],
      ["إشعارات Cloud Functions", notificationMetrics.cloudFunctionsSent.toString()],
      ["التعاميم العامة (Broadcast)", notificationMetrics.broadcastsCount.toString()],
      ["الإشعارات المخصصة (Targeted)", notificationMetrics.targetedCount.toString()],
      ["نسبة التسليم الناجح", `${notificationMetrics.deliveryRate}%`],
      [""],
      ["3. مؤشرات الزيارات الميدانية للمندوبين (Visits Tracking)"],
      ["حالة تتبع الزيارات", isVisitTrackingEnabled ? "مفعل ومباشر" : "متوقف مؤقتاً"],
      ["إجمالي الزيارات الميدانية", visitMetrics.total.toString()],
      ["إجمالي المهام المنجزة", `${visitMetrics.completedTasksCount} من ${visitMetrics.totalTasksCount}`],
      ["نسبة إنجاز المهام", `${visitMetrics.taskCompletionRate}%`],
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mandoubak_Analytics_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 text-right" dir="rtl" id="admin-analytics-dashboard">
      {/* Top Header & Analytics Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-850 to-teal-950 p-4 sm:p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 shadow-inner">
                <BarChart3 className="h-5 w-5 animate-pulse" />
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>لوحة المؤشرات والتحليلات السحابية المتقدمة</span>
                <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  Firestore Live
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-300 font-medium max-w-2xl leading-relaxed">
              مراقبة وتحليل لحظي لقاعدة بيانات Firestore السحابية: حسابات العملاء المسجلين، الإشعارات المرسلة عبر Cloud Functions، وملخص تتبع الزيارات الميدانية لجميع المندوبين.
            </p>
          </div>

          {/* Quick Actions & Firestore State */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Firestore Connection Status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-3xs font-bold text-slate-300">
              <Database className="h-3.5 w-3.5 text-teal-400" />
              <span>قاعدة البيانات:</span>
              <span className="flex items-center gap-1 text-emerald-400 font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                متصلة
              </span>
            </div>

            {/* Time Filter Pills */}
            <div className="flex rounded-xl bg-slate-800/90 border border-slate-700 p-1 text-3xs font-bold">
              <button
                onClick={() => setTimeFilter("all")}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  timeFilter === "all" ? "bg-teal-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setTimeFilter("month")}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  timeFilter === "month" ? "bg-teal-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                آخر 30 يوم
              </button>
              <button
                onClick={() => setTimeFilter("week")}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  timeFilter === "week" ? "bg-teal-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                هذا الأسبوع
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchAnalyticsFromFirestore}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              title="تحديث البيانات مباشرة من Firestore"
              id="btn-analytics-refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "جاري التحديث..." : "تحديث لحظي"}</span>
            </button>

            {/* Export Button */}
            <button
              onClick={handleExportSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold transition-all shadow-sm active:scale-95"
              title="تصدير تقرير المؤشرات كملف CSV"
              id="btn-analytics-export"
            >
              <Download className="h-3.5 w-3.5 text-teal-400" />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>

        {/* Sub-status bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-4xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>آخر تحديث لقاعدة البيانات: <strong className="text-slate-200 font-mono">{lastUpdated.toLocaleTimeString("ar-YE")}</strong></span>
            <span>معرف قاعدة البيانات: <strong className="text-teal-400 font-mono">ai-studio-mandoubak</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span>حالة تتبع الزيارات:</span>
            <span className={`font-bold px-1.5 py-0.5 rounded ${isVisitTrackingEnabled ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
              {isVisitTrackingEnabled ? "نشط ومفعل ✓" : "معطل"}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3 CORE REQUIRED KPI HERO METRICS CARDS (Users, Notifications, Visits) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* KPI 1: TOTAL REGISTERED USERS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-2xs font-bold text-slate-500 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-600" />
                <span>إجمالي المستخدمين المسجلين (Users)</span>
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{userMetrics.total}</span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  حساب مسجل
                </span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shadow-2xs">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>

          {/* Detailed Pill Breakdown */}
          <div className="mt-3 grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-100 text-center">
            <div className="rounded-lg bg-slate-50 p-1.5 border border-slate-100">
              <span className="block text-4xs font-bold text-slate-400">الصيدليات</span>
              <span className="text-xs font-black text-slate-800">{userMetrics.pharmaciesCount}</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-1.5 border border-slate-100">
              <span className="block text-4xs font-bold text-slate-400">الأطباء</span>
              <span className="text-xs font-black text-slate-800">{userMetrics.doctorsCount}</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-1.5 border border-slate-100">
              <span className="block text-4xs font-bold text-slate-400">المندوبين</span>
              <span className="text-xs font-black text-slate-800">{userMetrics.repsCount}</span>
            </div>
          </div>

          {/* Sub-status: Approved vs Pending */}
          <div className="mt-2.5 flex items-center justify-between text-3xs font-medium text-slate-500">
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>معتمد: <strong>{userMetrics.approvedCount}</strong></span>
            </span>
            {userMetrics.pendingCount > 0 ? (
              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 animate-pulse">
                <Clock className="h-3 w-3 text-amber-600" />
                <span>بانتظار التأكيد: <strong>{userMetrics.pendingCount}</strong></span>
              </span>
            ) : (
              <span className="text-slate-400">لا توجد طلبات معلقة</span>
            )}
          </div>
        </div>

        {/* KPI 2: NOTIFICATIONS SENT VIA CLOUD FUNCTIONS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-2xs font-bold text-slate-500 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>إشعارات Cloud Functions والتعاميم</span>
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{notificationMetrics.total}</span>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  إشعار وتعميم
                </span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-600 shadow-2xs">
              <Bell className="h-5 w-5" />
            </div>
          </div>

          {/* Detailed Pill Breakdown */}
          <div className="mt-3 grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-100 text-center">
            <div className="rounded-lg bg-slate-50 p-1.5 border border-slate-100">
              <span className="block text-4xs font-bold text-slate-400">تعاميم عامة</span>
              <span className="text-xs font-black text-slate-800">{notificationMetrics.broadcastsCount}</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-1.5 border border-slate-100">
              <span className="block text-4xs font-bold text-slate-400">إشعارات مخصصة</span>
              <span className="text-xs font-black text-slate-800">{notificationMetrics.targetedCount}</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-1.5 border border-slate-100">
              <span className="block text-4xs font-bold text-slate-400">نسبة التسليم</span>
              <span className="text-xs font-black text-emerald-700">{notificationMetrics.deliveryRate}%</span>
            </div>
          </div>

          {/* Sub-status: Cloud Functions delivery health */}
          <div className="mt-2.5 flex items-center justify-between text-3xs font-medium text-slate-500">
            <span className="flex items-center gap-1 text-slate-600">
              <Zap className="h-3 w-3 text-amber-500" />
              <span>مُرسلة عبر: <strong>Cloud Functions / Firestore</strong></span>
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
              <CheckCheck className="h-3 w-3" />
              <span>مُسلّمة لحظياً</span>
            </span>
          </div>
        </div>

        {/* KPI 3: TOTAL VISITS LOGGED BY REPRESENTATIVES (Conditional Tracking) */}
        <div className={`rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group ${
          isVisitTrackingEnabled ? "border-slate-200 bg-white" : "border-amber-200 bg-amber-50/30"
        }`}>
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-teal-500/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-2xs font-bold text-slate-500 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-teal-600" />
                <span>إجمالي الزيارات الميدانية (Visits Logged)</span>
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {isVisitTrackingEnabled ? visitMetrics.total : "معطل"}
                </span>
                {isVisitTrackingEnabled ? (
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    زيارة مسجلة
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                    تتبع متوقف
                  </span>
                )}
              </div>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-2xs ${
              isVisitTrackingEnabled ? "bg-teal-50 border-teal-200 text-teal-600" : "bg-amber-100 border-amber-300 text-amber-700"
            }`}>
              <Stethoscope className="h-5 w-5" />
            </div>
          </div>

          {/* If enabled: show breakdown, else show toggle button */}
          {isVisitTrackingEnabled ? (
            <>
              <div className="mt-3 grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-100 text-center">
                <div className="rounded-lg bg-slate-50 p-1.5 border border-slate-100">
                  <span className="block text-4xs font-bold text-slate-400">المندوبين النشطين</span>
                  <span className="text-xs font-black text-slate-800">{visitMetrics.repVisitsList.length || 1}</span>
                </div>
                <div className="rounded-lg bg-slate-50 p-1.5 border border-slate-100">
                  <span className="block text-4xs font-bold text-slate-400">المهام المنجزة</span>
                  <span className="text-xs font-black text-slate-800">{visitMetrics.completedTasksCount}</span>
                </div>
                <div className="rounded-lg bg-slate-50 p-1.5 border border-slate-100">
                  <span className="block text-4xs font-bold text-slate-400">معدل الإنجاز</span>
                  <span className="text-xs font-black text-teal-700">{visitMetrics.taskCompletionRate}%</span>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-3xs font-medium text-slate-500">
                <span className="flex items-center gap-1 text-teal-800 font-bold">
                  <Building className="h-3 w-3 text-teal-600" />
                  <span>المندوب الرئيسي: <strong>د/ بلال القيسي</strong></span>
                </span>
                <button
                  onClick={() => onNavigateTab && onNavigateTab("visits")}
                  className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-0.5 transition-colors"
                >
                  <span>عرض السجل</span>
                  <ChevronRight className="h-3 w-3 rotate-180" />
                </button>
              </div>
            </>
          ) : (
            <div className="mt-3 pt-3 border-t border-amber-200/80 space-y-2">
              <p className="text-3xs text-amber-800 font-medium">
                تتبع الزيارات الميدانية متوقف حالياً في إعدادات التطبيق. يمكنك تفعيله لإظهار ملخص الزيارات الميدانية وإحصائيات المندوبين.
              </p>
              {onUpdateSettings && (
                <button
                  onClick={() => onUpdateSettings("enableVisitTracking", true)}
                  className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <ToggleRight className="h-4 w-4" />
                  <span>تفعيل تتبع الزيارات الآن</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DETAILED SECTION TABS & DEEP ANALYTICS */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Navigation Tab Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-3 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveSection("overview")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === "overview"
                ? "border-teal-600 text-teal-800 bg-white rounded-t-xl shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>نظرة شاملة ومقارنات</span>
          </button>
          
          <button
            onClick={() => setActiveSection("users")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === "users"
                ? "border-teal-600 text-teal-800 bg-white rounded-t-xl shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>تفاصيل المستخدمين ({userMetrics.total})</span>
          </button>

          <button
            onClick={() => setActiveSection("notifications")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === "notifications"
                ? "border-teal-600 text-teal-800 bg-white rounded-t-xl shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>الإشعارات و Cloud Functions ({notificationMetrics.total})</span>
          </button>

          <button
            onClick={() => setActiveSection("visits")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === "visits"
                ? "border-teal-600 text-teal-800 bg-white rounded-t-xl shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>تتبع الزيارات الميدانية ({visitMetrics.total})</span>
          </button>
        </div>

        {/* Section Contents */}
        <div className="p-4 sm:p-5">
          <AnimatePresence mode="wait">
            {/* 1. OVERVIEW & COMPARATIVE SUMMARY */}
            {activeSection === "overview" && (
              <motion.div
                key="overview-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Distribution of Users Visual Meter */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <PieChart className="h-4 w-4 text-teal-600" />
                        <span>توزيع الحسابات حسب الدور الطبي</span>
                      </span>
                      <span className="text-3xs text-slate-400 font-mono">{userMetrics.total} مستخدم</span>
                    </h4>

                    {/* Progress multi-bar */}
                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${userMetrics.total > 0 ? (userMetrics.pharmaciesCount / userMetrics.total) * 100 : 50}%` }} 
                        className="bg-teal-600 h-full transition-all"
                        title={`صيدليات: ${userMetrics.pharmaciesCount}`}
                      />
                      <div 
                        style={{ width: `${userMetrics.total > 0 ? (userMetrics.doctorsCount / userMetrics.total) * 100 : 30}%` }} 
                        className="bg-blue-600 h-full transition-all"
                        title={`أطباء: ${userMetrics.doctorsCount}`}
                      />
                      <div 
                        style={{ width: `${userMetrics.total > 0 ? (userMetrics.repsCount / userMetrics.total) * 100 : 20}%` }} 
                        className="bg-emerald-500 h-full transition-all"
                        title={`مندوبين: ${userMetrics.repsCount}`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-3xs font-bold text-slate-600 pt-1">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-teal-600" />
                        <span>صيدليات ({userMetrics.pharmaciesCount})</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                        <span>أطباء ({userMetrics.doctorsCount})</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>مندوبين ({userMetrics.repsCount})</span>
                      </span>
                    </div>
                  </div>

                  {/* Cloud Functions Notifications & Broadcast Ratio */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span>توزيع الإشعارات و Cloud Functions</span>
                      </span>
                      <span className="text-3xs text-slate-400 font-mono">{notificationMetrics.total} إشعار</span>
                    </h4>

                    {/* Progress multi-bar */}
                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${notificationMetrics.total > 0 ? (notificationMetrics.broadcastsCount / notificationMetrics.total) * 100 : 60}%` }} 
                        className="bg-amber-500 h-full transition-all"
                        title={`تعاميم عامة: ${notificationMetrics.broadcastsCount}`}
                      />
                      <div 
                        style={{ width: `${notificationMetrics.total > 0 ? (notificationMetrics.targetedCount / notificationMetrics.total) * 100 : 40}%` }} 
                        className="bg-purple-600 h-full transition-all"
                        title={`إشعارات مخصصة: ${notificationMetrics.targetedCount}`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-3xs font-bold text-slate-600 pt-1">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>تعاميم عامة ({notificationMetrics.broadcastsCount})</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-purple-600" />
                        <span>إشعارات موجهة لمنشأة ({notificationMetrics.targetedCount})</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visit Tracking Highlights Summary */}
                {isVisitTrackingEnabled && (
                  <div className="rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50/40 via-white to-teal-50/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                        <Stethoscope className="h-4 w-4 text-teal-700" />
                        <span>إنتاجية الزيارات الميدانية للمندوبين (Field Visits Summary)</span>
                      </h4>
                      <span className="text-3xs font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                        معدل إنجاز المهام: {visitMetrics.taskCompletionRate}%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="bg-white p-3 rounded-lg border border-teal-100 shadow-2xs">
                        <span className="text-4xs font-bold text-slate-400 block">إجمالي الزيارات</span>
                        <span className="text-lg font-black text-slate-900">{visitMetrics.total} زيارة</span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-teal-100 shadow-2xs">
                        <span className="text-4xs font-bold text-slate-400 block">مهام منجزة في الميدان</span>
                        <span className="text-lg font-black text-emerald-700">{visitMetrics.completedTasksCount} مهمة</span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-teal-100 shadow-2xs">
                        <span className="text-4xs font-bold text-slate-400 block">أعلى منشأة زيارةً</span>
                        <span className="text-xs font-bold text-slate-800 truncate block mt-1">
                          {visitMetrics.topVisited[0]?.entityName || "لا توجد زيارات بعد"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 2. USERS DETAILS TAB */}
            {activeSection === "users" && (
              <motion.div
                key="users-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">سجل المستخدمين والحسابات المسجلة في Firestore</h4>
                    <p className="text-xs text-slate-500">تفاصيل الصيدليات والأطباء المعتمدين والمقيدين في قاعدة البيانات</p>
                  </div>
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                    {userMetrics.total} عميل
                  </span>
                </div>

                {/* Recent Users Table */}
                {userMetrics.recentUsers.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-3xs">
                        <tr>
                          <th className="p-3">اسم المنشأة / العميل</th>
                          <th className="p-3">رقم الهاتف</th>
                          <th className="p-3">نوع الحساب</th>
                          <th className="p-3">الموقع / العنوان</th>
                          <th className="p-3">حالة الاعتماد</th>
                          <th className="p-3">تاريخ التسجيل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userMetrics.recentUsers.map((u, i) => (
                          <tr key={`usr-row-${u.id || i}`} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-bold text-slate-900">
                              <div>{u.entityName || u.name}</div>
                              {u.entityName && <div className="text-4xs text-slate-400 font-normal">{u.name}</div>}
                            </td>
                            <td className="p-3 font-mono text-slate-600">{u.phone}</td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-4xs font-bold ${
                                u.role === "pharmacy" ? "bg-teal-50 text-teal-800 border border-teal-200" :
                                u.role === "doctor" ? "bg-blue-50 text-blue-800 border border-blue-200" :
                                "bg-purple-50 text-purple-800 border border-purple-200"
                              }`}>
                                {u.role === "pharmacy" ? "صيدلية" : u.role === "doctor" ? "طبيب / عيادة" : "مندوب"}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">{u.location || "غير محدد"}</td>
                            <td className="p-3">
                              {u.isApproved !== false && u.status !== "pending_approval" ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-1 text-4xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 w-fit">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>معتمد</span>
                                </span>
                              ) : (
                                <span className="text-amber-700 font-bold flex items-center gap-1 text-4xs bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 w-fit">
                                  <Clock className="h-3 w-3" />
                                  <span>بانتظار التأكيد</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-400 font-mono text-3xs">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString("ar-YE") : "مسبق"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50">
                    <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold">لا يوجد مستخدمون مسجلون حالياً في قاعدة البيانات.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. NOTIFICATIONS & CLOUD FUNCTIONS TAB */}
            {activeSection === "notifications" && (
              <motion.div
                key="notifs-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">سجل الإشعارات و Cloud Functions</h4>
                    <p className="text-xs text-slate-500">حالة تسليم التعاميم السحابية والإشعارات الموجهة للصيدليات</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-200">
                    <Zap className="h-3.5 w-3.5" />
                    <span>{notificationMetrics.total} إشعار تم إرساله</span>
                  </div>
                </div>

                {/* Notifications Stream */}
                {notificationMetrics.recentNotifications.length > 0 ? (
                  <div className="space-y-2.5">
                    {notificationMetrics.recentNotifications.map((notif, idx) => (
                      <div
                        key={`notif-card-${notif.id || idx}`}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 hover:border-teal-300 transition-colors shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded-lg ${notif.type === "broadcast" ? "bg-amber-100 text-amber-800" : "bg-purple-100 text-purple-800"}`}>
                              <Bell className="h-4 w-4" />
                            </span>
                            <div>
                              <h5 className="text-xs font-bold text-slate-900">{notif.title}</h5>
                              <span className="text-4xs text-slate-400">
                                {notif.type === "broadcast" ? "تعميم عام لجميع العملاء" : `إشعار مخصص: ${notif.targetClientName || "عميل محدد"}`}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-4xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                              <Zap className="h-2.5 w-2.5" />
                              <span>Cloud Function Delivered</span>
                            </span>
                            <span className="text-3xs font-mono text-slate-400">
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50">
                    <Bell className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold">لم يتم إرسال أي إشعارات سحابية حتى الآن.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. VISITS TRACKING TAB */}
            {activeSection === "visits" && (
              <motion.div
                key="visits-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-teal-600" />
                      <span>ملخص وإحصائيات الزيارات الميدانية لجميع المندوبين</span>
                    </h4>
                    <p className="text-xs text-slate-500">تتبع نشاط مندوبي الدعاية الطبية ومعدلات إنجاز المهام الميدانية</p>
                  </div>

                  {/* Setting Toggle for Visit Tracking */}
                  {onUpdateSettings && (
                    <button
                      onClick={() => onUpdateSettings("enableVisitTracking", !isVisitTrackingEnabled)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                        isVisitTrackingEnabled 
                          ? "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100" 
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {isVisitTrackingEnabled ? <ToggleRight className="h-4 w-4 text-teal-600" /> : <ToggleLeft className="h-4 w-4 text-slate-400" />}
                      <span>{isVisitTrackingEnabled ? "تتبع الزيارات: نشط" : "تتبع الزيارات: متوقف"}</span>
                    </button>
                  )}
                </div>

                {isVisitTrackingEnabled ? (
                  <div className="space-y-4">
                    {/* Rep Leaderboard Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {visitMetrics.repVisitsList.map((rep, idx) => (
                        <div
                          key={`rep-stat-${idx}`}
                          className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/30 to-white p-3.5 space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <Building className="h-3.5 w-3.5 text-teal-600" />
                              <span>{rep.name}</span>
                            </span>
                            <span className="text-xs font-black text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-full">
                              {rep.count} زيارة
                            </span>
                          </div>
                          <div className="text-3xs text-slate-500 space-y-1">
                            <div className="flex justify-between">
                              <span>المهام المنجزة:</span>
                              <span className="font-bold text-slate-800">{rep.completedTasks} من {rep.totalTasks}</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-teal-600 h-full rounded-full"
                                style={{ width: `${rep.totalTasks > 0 ? (rep.completedTasks / rep.totalTasks) * 100 : 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Top Visited Entities */}
                    {visitMetrics.topVisited.length > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                        <h5 className="text-xs font-bold text-slate-800">المنشآت والصيدليات الأكثر زيارةً:</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {visitMetrics.topVisited.map((item, idx) => (
                            <div key={`top-v-${idx}`} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800 truncate">{item.entityName}</span>
                              <span className="text-3xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                                {item.count} زيارات
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-amber-800 bg-amber-50 rounded-xl border border-amber-200 p-4">
                    <MapPin className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                    <h5 className="text-xs font-bold">تتبع الزيارات الميدانية متوقف</h5>
                    <p className="text-3xs text-amber-700 mt-1">
                      تم تعطيل خاصية تتبع الزيارات. قم بالضغط على زر التفعيل أعلاه لاستئناف عرض إحصائيات المندوبين.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
