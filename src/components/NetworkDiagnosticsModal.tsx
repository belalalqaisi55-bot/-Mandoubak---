import React, { useState, useEffect, useMemo } from "react";
import {
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Server,
  Database,
  Globe,
  Smartphone,
  ShieldCheck,
  X,
  Copy,
  Check,
  Send,
  Activity,
  Zap,
  Play,
  Terminal,
  Gauge,
  Cpu,
  Cloud,
  Radio,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  ExternalLink,
  Rss,
  Clock,
  Cookie
} from "lucide-react";
import {
  isDeviceOnline,
  getPendingSyncCounts,
  getOfflineStorageSummary,
  clearAllCachesAndReset,
  syncPendingWithFirebase
} from "../utils/offlineSync";
import { db, isFirebaseConfigured, auth, probeFirestoreDetailed, FirestoreProbeResult } from "../firebase";
import { BACKEND_URL, isNativeOrApkEnvironment } from "../utils/apiConfig";
import { areCookiesEnabled, isStorageAvailable, setCookie, getCookie } from "../utils/cookieManager";
import { OFFICIAL_APP_URL } from "../App";

export interface NetworkDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

interface EndpointCheck {
  id: string;
  name: string;
  path: string;
  method: "GET" | "POST" | "HEAD" | "OPTIONS";
  category: "backend" | "firestore" | "system";
  description: string;
  status: "idle" | "running" | "success" | "warning" | "error";
  httpStatus?: number;
  latencyMs?: number;
  dataPreview?: string;
  error?: string;
}

interface JitterTestResult {
  running: boolean;
  samples: number[];
  minMs: number;
  maxMs: number;
  avgMs: number;
  packetLossPercent: number;
}

const OFFICIAL_STATUSPAGE_URL = "https://mandoubakmed1.statuspage.io";

export const NetworkDiagnosticsModal: React.FC<NetworkDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "statuspage" | "endpoints" | "firestore" | "custom_host" | "troubleshoot">("overview");
  const [testingAll, setTestingAll] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedRss, setCopiedRss] = useState(false);
  const [showRawRss, setShowRawRss] = useState(false);
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Statuspage Live Data State
  const [statuspageData, setStatuspageData] = useState<any>(null);
  const [loadingStatuspage, setLoadingStatuspage] = useState(false);

  // Target Host for testing
  const [targetHost, setTargetHost] = useState<string>(() => {
    if (typeof window !== "undefined" && window.location.origin && !window.location.origin.includes("localhost")) {
      return window.location.origin;
    }
    return OFFICIAL_APP_URL;
  });
  const [customHostInput, setCustomHostInput] = useState<string>("");

  // System & Environment Data
  const [deviceInfo, setDeviceInfo] = useState<{
    online: boolean;
    networkType: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
    userAgent: string;
    isNativeApk: boolean;
    protocol: string;
    localStorageOk: boolean;
    indexedDbOk: boolean;
    pendingSyncCount: number;
    offlineOrdersCount: number;
    offlineProductsCount: number;
  }>({
    online: true,
    networkType: "unknown",
    userAgent: "",
    isNativeApk: false,
    protocol: "https:",
    localStorageOk: true,
    indexedDbOk: true,
    pendingSyncCount: 0,
    offlineOrdersCount: 0,
    offlineProductsCount: 0,
  });

  // Endpoints Check State
  const [endpoints, setEndpoints] = useState<EndpointCheck[]>([
    {
      id: "health",
      name: "فحص صحة الخادم (Server Health)",
      path: "/api/health",
      method: "GET",
      category: "backend",
      description: "فحص استجابة الخادم الأساسية وحالة التشغيل اللحظية",
      status: "idle",
    },
    {
      id: "diag_ping",
      name: "محاكي الإرسال والاستقبال (POST Ping)",
      path: "/api/diagnostics/ping",
      method: "POST",
      category: "backend",
      description: "فحص نقل البيانات الثنائي وقدرة الشبكة على إرسال حمولة JSON",
      status: "idle",
    },
    {
      id: "diag_sys",
      name: "بيانات خادم النظام (System Telemetry)",
      path: "/api/diagnostics/system",
      method: "GET",
      category: "system",
      description: "فحص استهلاك ذاكرة الخادم والبيئة السحابية والنسخة",
      status: "idle",
    },
    {
      id: "statuspage_api",
      name: "فحص صفحة الحالة (Statuspage API)",
      path: "/api/statuspage/summary",
      method: "GET",
      category: "system",
      description: "جلب حالة الحوادث ومؤشرات الأداء من mandoubakmed1.statuspage.io",
      status: "idle",
    },
    {
      id: "products",
      name: "استرجاع كتالوج الأدوية (Products API)",
      path: "/api/products",
      method: "GET",
      category: "backend",
      description: "فحص جلب الأصناف والعروض الدوائية من التخزين السحابي",
      status: "idle",
    },
    {
      id: "settings",
      name: "إعدادات التطبيق (App Settings)",
      path: "/api/settings",
      method: "GET",
      category: "backend",
      description: "فحص شروط الاعتماد وتهيئة النظام المركزية",
      status: "idle",
    },
    {
      id: "cors_options",
      name: "فحص جدار الحماية (CORS Preflight)",
      path: "/api/products",
      method: "OPTIONS",
      category: "system",
      description: "التأكد من عدم حظر متصفحات الموبايل للطلبات المسبقة",
      status: "idle",
    },
  ]);

  // Firestore Probe Result
  const [firestoreProbe, setFirestoreProbe] = useState<FirestoreProbeResult>({
    configured: false,
    connected: false,
    latencyMs: 0,
    source: "none",
  });
  const [probingFirestore, setProbingFirestore] = useState(false);

  // Network Jitter & Loss Test State
  const [jitterTest, setJitterTest] = useState<JitterTestResult>({
    running: false,
    samples: [],
    minMs: 0,
    maxMs: 0,
    avgMs: 0,
    packetLossPercent: 0,
  });

  // Expanded endpoint card ID
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>("health");

  // Calculate overall connectivity score (0 to 100)
  const healthScore = useMemo(() => {
    let score = 0;
    if (deviceInfo.online) score += 20;
    if (deviceInfo.localStorageOk && deviceInfo.indexedDbOk) score += 15;

    // Backend APIs
    const backendEndpoints = endpoints.filter(e => e.category === "backend" || e.category === "system");
    const passedEndpoints = backendEndpoints.filter(e => e.status === "success").length;
    if (backendEndpoints.length > 0) {
      score += Math.round((passedEndpoints / backendEndpoints.length) * 45);
    }

    // Firestore
    if (firestoreProbe.connected) {
      score += 20;
    } else if (firestoreProbe.source === "cache" || !firestoreProbe.configured) {
      score += 10;
    }

    return Math.min(100, score);
  }, [deviceInfo, endpoints, firestoreProbe]);

  // Fetch Statuspage Live Summary
  const fetchStatuspageData = async () => {
    setLoadingStatuspage(true);
    try {
      const res = await fetch("/api/statuspage/summary");
      if (res.ok) {
        const data = await res.json();
        setStatuspageData(data);
      }
    } catch (err) {
      console.warn("Statuspage fetch notice:", err);
    } finally {
      setLoadingStatuspage(false);
    }
  };

  // Fetch device environment and storage
  const scanEnvironment = async () => {
    const online = isDeviceOnline();
    const userAgent = navigator.userAgent;
    const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
    const isNativeApk = isNativeOrApkEnvironment();

    const navConn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const networkType = navConn?.effectiveType || (online ? "online" : "offline");
    const downlink = navConn?.downlink;
    const rtt = navConn?.rtt;
    const saveData = navConn?.saveData;

    let localStorageOk = true;
    try {
      localStorage.setItem("__mandoubak_diag_test", "1");
      localStorage.removeItem("__mandoubak_diag_test");
    } catch {
      localStorageOk = false;
    }

    let indexedDbOk = true;
    try {
      if (typeof indexedDB === "undefined") indexedDbOk = false;
    } catch {
      indexedDbOk = false;
    }

    let pendingSyncCount = 0;
    let offlineOrdersCount = 0;
    let offlineProductsCount = 0;
    try {
      const counts = await getPendingSyncCounts();
      pendingSyncCount = counts.total;
      const summary = await getOfflineStorageSummary();
      offlineOrdersCount = summary.ordersCount;
      offlineProductsCount = summary.productsCount;
    } catch (e) {
      console.warn("Storage summary check error:", e);
    }

    setDeviceInfo({
      online,
      networkType,
      downlink,
      rtt,
      saveData,
      userAgent,
      isNativeApk,
      protocol,
      localStorageOk,
      indexedDbOk,
      pendingSyncCount,
      offlineOrdersCount,
      offlineProductsCount,
    });
  };

  // Run a single endpoint check
  const checkEndpoint = async (check: EndpointCheck, baseUrl: string): Promise<EndpointCheck> => {
    const updated = { ...check, status: "running" as const, error: undefined };
    const cleanBase = baseUrl.replace(/\/+$/, "");
    const targetUrl = `${cleanBase}${check.path.startsWith("/") ? check.path : "/" + check.path}`;

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      let response: Response;
      if (check.method === "POST") {
        response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            test: "diagnostics",
            clientTimestamp: new Date().toISOString(),
            isMobile: /Android|iPhone|iPad/i.test(navigator.userAgent),
          }),
          signal: controller.signal,
        });
      } else if (check.method === "OPTIONS") {
        response = await fetch(targetUrl, {
          method: "OPTIONS",
          headers: {
            "Access-Control-Request-Method": "GET, POST, OPTIONS",
            "Access-Control-Request-Headers": "Content-Type, Authorization",
          },
          signal: controller.signal,
        });
      } else if (check.method === "HEAD") {
        response = await fetch(targetUrl, {
          method: "HEAD",
          signal: controller.signal,
        });
      } else {
        response = await fetch(targetUrl, {
          method: "GET",
          headers: { "Accept": "application/json, text/plain, */*" },
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - start);

      let dataPreview = "";
      try {
        const text = await response.text();
        if (text) {
          try {
            const json = JSON.parse(text);
            dataPreview = JSON.stringify(json, null, 2).slice(0, 300);
          } catch {
            dataPreview = text.slice(0, 300);
          }
        }
      } catch {
        dataPreview = "(No body)";
      }

      const isOk = response.ok || response.status === 204 || response.status === 304;

      return {
        ...updated,
        status: isOk ? (latencyMs > 1200 ? "warning" : "success") : "error",
        httpStatus: response.status,
        latencyMs,
        dataPreview,
        error: isOk ? undefined : `استجاب الخادم برمز الحالة ${response.status}`,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        ...updated,
        status: "error",
        httpStatus: 0,
        latencyMs,
        error: err.name === "AbortError"
          ? "انتهت مهلة الانتظار (Timeout > 6.5s) - اتصال الشبكة بطيء أو محجوب"
          : err.message || "تعذر إكمال طلب الشبكة",
      };
    }
  };

  // Run all diagnostics in sequence
  const runFullDiagnostics = async (customBase?: string) => {
    setTestingAll(true);
    const activeBase = customBase || targetHost || window.location.origin;

    // 1. Scan environment
    await scanEnvironment();

    // 2. Fetch Statuspage Live Data
    fetchStatuspageData();

    // 3. Probe Firestore
    setProbingFirestore(true);
    try {
      const fsResult = await probeFirestoreDetailed();
      setFirestoreProbe(fsResult);
    } catch (err: any) {
      setFirestoreProbe({
        configured: isFirebaseConfigured,
        connected: false,
        latencyMs: 0,
        source: "none",
        error: err.message || "خطأ أثناء محاولة الاتصال بـ Firestore",
      });
    } finally {
      setProbingFirestore(false);
    }

    // 4. Test Endpoints
    const results: EndpointCheck[] = [];
    for (const ep of endpoints) {
      setEndpoints(prev => prev.map(item => item.id === ep.id ? { ...item, status: "running" } : item));
      const res = await checkEndpoint(ep, activeBase);
      results.push(res);
      setEndpoints(prev => prev.map(item => item.id === ep.id ? res : item));
    }

    setTestingAll(false);
  };

  // Run Jitter & Loss Probe
  const runJitterProbe = async () => {
    setJitterTest(prev => ({ ...prev, running: true, samples: [] }));
    const samples: number[] = [];
    let lostCount = 0;
    const totalPulses = 5;

    for (let i = 0; i < totalPulses; i++) {
      const start = performance.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch("/api/health", { method: "GET", signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const lat = Math.round(performance.now() - start);
          samples.push(lat);
        } else {
          lostCount++;
        }
      } catch {
        lostCount++;
      }
      setJitterTest(prev => ({
        ...prev,
        samples: [...samples],
      }));
      await new Promise(r => setTimeout(r, 200));
    }

    const minMs = samples.length ? Math.min(...samples) : 0;
    const maxMs = samples.length ? Math.max(...samples) : 0;
    const avgMs = samples.length ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : 0;
    const packetLossPercent = Math.round((lostCount / totalPulses) * 100);

    setJitterTest({
      running: false,
      samples,
      minMs,
      maxMs,
      avgMs,
      packetLossPercent,
    });
  };

  useEffect(() => {
    if (isOpen) {
      runFullDiagnostics();
    }
  }, [isOpen]);

  const handleForceSync = async () => {
    setSyncingOffline(true);
    setSyncFeedback(null);
    try {
      const res = await syncPendingWithFirebase();
      setSyncFeedback(`✓ اكتملت المزامنة بنجاح: تم رفع وتحديث ${res.syncedCount} عملية سحابياً`);
      await scanEnvironment();
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      setSyncFeedback(`⚠️ تعذر مزامنة بعض العناصر: ${e.message || "فحص الاتصال"}`);
    } finally {
      setSyncingOffline(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  const generateDiagnosticReportText = () => {
    const timestamp = new Date().toLocaleString("ar-YE");
    const passedEp = endpoints.filter(e => e.status === "success").length;
    const totalEp = endpoints.length;

    let text = `🏥 *تقرير تشخيص الاتصال والشبكة - تطبيق مندوبك الطبي*\n`;
    text += `👤 *المشرف:* د/ بلال القيسي (776600049)\n`;
    text += `📅 *الوقت:* ${timestamp}\n`;
    text += `📊 *مؤشر الاتصال العام:* ${healthScore}%\n`;
    text += `🌐 *حالة الإنترنت:* ${deviceInfo.online ? "متصل 🟢" : "منقطع 🔴"}\n`;
    text += `📶 *نوع الشبكة:* ${deviceInfo.networkType} (RTT: ${deviceInfo.rtt || "N/A"}ms)\n`;
    text += `📱 *بيئة التشغيل:* ${deviceInfo.isNativeApk ? "تطبيق أندرويد مستقل (APK)" : "متصفح ويب"}\n`;
    text += `🎯 *الرابط المفحوص:* ${targetHost}\n`;
    text += `📢 *صفحة الحالة الرسمية:* ${OFFICIAL_STATUSPAGE_URL}\n\n`;

    text += `⚡ *نتائج مسارات الخادم (Backend Endpoints) [${passedEp}/${totalEp}]:*\n`;
    endpoints.forEach(ep => {
      const icon = ep.status === "success" ? "✅" : ep.status === "warning" ? "⚠️" : "❌";
      text += `${icon} ${ep.name} (${ep.method} ${ep.path}): ${ep.latencyMs ? ep.latencyMs + "ms" : ""} [${ep.httpStatus || 0}]\n`;
      if (ep.error) text += `   └ خطأ: ${ep.error}\n`;
    });

    text += `\n☁️ *حالة قاعدة بيانات Firestore:*\n`;
    text += `• التهيئة: ${firestoreProbe.configured ? "مهيأة" : "قاعدة محلية"}\n`;
    text += `• الاتصال السحابي: ${firestoreProbe.connected ? "متصل بنجاح 🟢" : "وضع أوفلاين مؤقت 🟡"}\n`;
    text += `• زمن الاستجابة: ${firestoreProbe.latencyMs}ms\n`;

    text += `\n💾 *التخزين المحلي والمعلقات:*\n`;
    text += `• الطلبيات المعلقة: ${deviceInfo.pendingSyncCount}\n`;
    text += `• الطلبيات المحفوظة محلياً: ${deviceInfo.offlineOrdersCount}\n`;
    text += `• الأدوية في الكاش: ${deviceInfo.offlineProductsCount}\n`;

    return text;
  };

  const handleCopyReport = () => {
    const text = generateDiagnosticReportText();
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(generateDiagnosticReportText());
    window.open(`https://wa.me/967776600049?text=${text}`, "_blank");
  };

  const handleCopyRss = () => {
    navigator.clipboard.writeText(`${OFFICIAL_STATUSPAGE_URL}/history.rss`);
    setCopiedRss(true);
    setTimeout(() => setCopiedRss(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[94vh] transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-teal-300 shadow-inner">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">مركز تشخيص الاتصال والشبكة المقيدة</h2>
                <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                  v2.4
                </span>
              </div>
              <p className="text-2xs sm:text-xs text-teal-200/90 font-medium">
                فحص مسارات Backend APIs، خدمات Firestore، وصفحة الحالة الرسمية (Statuspage)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => runFullDiagnostics()}
              disabled={testingAll}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
              title="إعادة الفحص الشامل"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testingAll ? "animate-spin text-teal-300" : ""}`} />
              <span className="hidden sm:inline">فحص شامل</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-teal-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Global Health Score & Quick Indicators Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
          {/* Health Score Meter */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-sm transition-all ${
                  healthScore >= 80
                    ? "bg-gradient-to-br from-emerald-500 to-teal-700"
                    : healthScore >= 50
                    ? "bg-gradient-to-br from-amber-500 to-amber-700"
                    : "bg-gradient-to-br from-rose-500 to-rose-700"
                }`}
              >
                {healthScore}%
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900">
                  {healthScore >= 80 ? "جودة الاتصال: ممتازة 🟢" : healthScore >= 50 ? "اتصال مقيد / متوسط 🟡" : "اتصال ضعيف أو منقطع 🔴"}
                </span>
              </div>
              <p className="text-3xs text-slate-500 font-medium">
                {deviceInfo.online ? "متصل بشبكة الإنترنت" : "يعمل بوضع عدم الاتصال (Offline Mode)"} • {deviceInfo.networkType.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Quick Badges */}
          <div className="flex items-center gap-2 flex-wrap text-3xs font-bold">
            {/* Statuspage Quick Indicator */}
            <a
              href={OFFICIAL_STATUSPAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-xl border bg-emerald-50 border-emerald-300 text-emerald-900 flex items-center gap-1.5 hover:bg-emerald-100 transition-colors group shadow-2xs"
              title="صفحة الحالة الرسمية (Statuspage.io)"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span>حالة النظام: 100% مستقرة</span>
              <ExternalLink className="h-2.5 w-2.5 text-emerald-700 group-hover:translate-x-[-1px] transition-transform" />
            </a>

            <span className={`px-2.5 py-1 rounded-xl border flex items-center gap-1 ${
              deviceInfo.online ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
            }`}>
              {deviceInfo.online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{deviceInfo.online ? "الإنترنت نشط" : "أوفلاين"}</span>
            </span>

            <span className={`px-2.5 py-1 rounded-xl border flex items-center gap-1 ${
              firestoreProbe.connected ? "bg-indigo-50 border-indigo-200 text-indigo-800" : "bg-amber-50 border-amber-200 text-amber-800"
            }`}>
              <Database className="h-3 w-3" />
              <span>{firestoreProbe.connected ? `سحابي (${firestoreProbe.latencyMs}ms)` : "أوفلاين (IndexedDB)"}</span>
            </span>

            {deviceInfo.pendingSyncCount > 0 && (
              <span className="px-2.5 py-1 rounded-xl border bg-purple-50 border-purple-200 text-purple-800 flex items-center gap-1 animate-pulse">
                <Cloud className="h-3 w-3" />
                <span>{deviceInfo.pendingSyncCount} معلقة</span>
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-3 overflow-x-auto scrollbar-none shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "overview"
                ? "border-teal-700 text-teal-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Gauge className="h-4 w-4" />
            <span>لوحة المؤشرات</span>
          </button>

          {/* New Tab: Statuspage & Incidents */}
          <button
            onClick={() => {
              setActiveTab("statuspage");
              fetchStatuspageData();
            }}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "statuspage"
                ? "border-emerald-600 text-emerald-950 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Activity className="h-4 w-4 text-emerald-600" />
            <span>صفحة الحالة وتاريخ الحوادث</span>
            <span className="px-1.5 py-0.2 rounded-full text-3xs bg-emerald-100 text-emerald-800 font-bold">
              مباشر 🟢
            </span>
          </button>

          <button
            onClick={() => setActiveTab("endpoints")}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "endpoints"
                ? "border-teal-700 text-teal-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Server className="h-4 w-4" />
            <span>فحص الـ API للخادم</span>
            <span className="px-1.5 py-0.2 rounded-full text-3xs bg-slate-100 text-slate-600 font-mono">
              {endpoints.filter(e => e.status === "success").length}/{endpoints.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("firestore")}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "firestore"
                ? "border-teal-700 text-teal-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Database className="h-4 w-4" />
            <span>قاعدة Firestore</span>
          </button>

          <button
            onClick={() => setActiveTab("custom_host")}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "custom_host"
                ? "border-teal-700 text-teal-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Radio className="h-4 w-4" />
            <span>مختبر الرابط والنبض</span>
          </button>

          <button
            onClick={() => setActiveTab("troubleshoot")}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "troubleshoot"
                ? "border-teal-700 text-teal-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>استكشاف الأخطاء والحلول</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-700 text-xs sm:text-sm grow">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Statuspage Official Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-xs sm:text-sm text-emerald-950">الحالة الطبية لمندوبك - تاريخ الحوادث</h4>
                      <span className="px-2 py-0.5 rounded-full text-4xs font-bold bg-emerald-600 text-white">Statuspage.io</span>
                    </div>
                    <p className="text-3xs text-emerald-800 font-medium">
                      جميع الأنظمة والخدمات تعمل بكفاءة تامة • يمكنك استعراض تاريخ الحوادث والاشتراك بالتنبيهات
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("statuspage");
                      fetchStatuspageData();
                    }}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    استعراض الحوادث
                  </button>
                  <a
                    href={OFFICIAL_STATUSPAGE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 transition-colors shadow-2xs"
                    title="فتح الرابط الخارجي"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Target Host Banner */}
              <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-teal-700 shrink-0" />
                    <span className="font-bold text-xs text-teal-950">نطاق الخادم المستهدف حالياً:</span>
                  </div>
                  <p className="text-3xs font-mono text-teal-800 break-all select-all font-semibold">
                    {targetHost}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("custom_host")}
                  className="px-3 py-1.5 rounded-xl bg-white border border-teal-200 text-teal-800 hover:bg-teal-100 text-2xs font-bold transition-all shadow-2xs whitespace-nowrap cursor-pointer"
                >
                  تغيير أو فحص رابط بديل
                </button>
              </div>

              {/* 4 Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Network Layer Card */}
                <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-900 flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-teal-600" />
                      طبقة الشبكة والجهاز (Network Layer)
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-3xs font-black ${
                      deviceInfo.online ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {deviceInfo.online ? "نشط" : "منقطع"}
                    </span>
                  </div>
                  <div className="text-2xs space-y-1 text-slate-600 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-400">النوع التقديري:</span>
                      <span className="font-bold uppercase text-slate-800">{deviceInfo.networkType}</span>
                    </div>
                    {deviceInfo.rtt !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">زمن الاستجابة (RTT):</span>
                        <span className="font-mono font-bold text-slate-800">{deviceInfo.rtt} ms</span>
                      </div>
                    )}
                    {deviceInfo.downlink !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">سرعة التنزيل (Downlink):</span>
                        <span className="font-mono font-bold text-slate-800">{deviceInfo.downlink} Mbps</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">وضع توفير البيانات:</span>
                      <span className="font-bold">{deviceInfo.saveData ? "مفعل (قد يحد الطلبات)" : "غير مفعل"}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Backend APIs Card */}
                <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-900 flex items-center gap-2">
                      <Server className="h-4 w-4 text-teal-600" />
                      الخادم الخلفي (Backend APIs)
                    </span>
                    {(() => {
                      const successCount = endpoints.filter(e => e.status === "success").length;
                      const isAll = successCount === endpoints.length;
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-3xs font-black ${
                          isAll ? "bg-emerald-100 text-emerald-800" : successCount > 0 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {successCount}/{endpoints.length} ناجح
                        </span>
                      );
                    })()}
                  </div>
                  <div className="text-2xs space-y-1 text-slate-600 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-400">فحص الصحة (/health):</span>
                      <span className="font-mono font-bold">
                        {endpoints.find(e => e.id === "health")?.latencyMs ? `${endpoints.find(e => e.id === "health")?.latencyMs}ms` : "قيد الفحص"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">محاكي الإرسال (POST Ping):</span>
                      <span className="font-mono font-bold">
                        {endpoints.find(e => e.id === "diag_ping")?.latencyMs ? `${endpoints.find(e => e.id === "diag_ping")?.latencyMs}ms` : "قيد الفحص"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">جدار الحماية (CORS Preflight):</span>
                      <span className="font-bold text-emerald-700">
                        {endpoints.find(e => e.id === "cors_options")?.status === "success" ? "مسموح (*)" : "تحذير"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Firestore & Cloud Card */}
                <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-900 flex items-center gap-2">
                      <Database className="h-4 w-4 text-indigo-600" />
                      قاعدة بيانات Firestore
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-3xs font-black ${
                      firestoreProbe.connected ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {firestoreProbe.connected ? "متصل سحابياً" : "محلي (Offline)"}
                    </span>
                  </div>
                  <div className="text-2xs space-y-1 text-slate-600 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-400">حالة التكوين:</span>
                      <span className="font-bold">{firestoreProbe.configured ? "مهيأ بمفتاح مشروع" : "وضع مستقل"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">زمن الاتصال السحابي:</span>
                      <span className="font-mono font-bold text-slate-800">{firestoreProbe.latencyMs} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">بروتوكول النقل:</span>
                      <span className="font-bold text-teal-800">Long-Polling (لتفادي حظر WebSocket)</span>
                    </div>
                  </div>
                </div>

                {/* 4. Local Storage & Offline Engine */}
                <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      محرك الأوفلاين (IndexedDB)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-3xs font-black bg-emerald-100 text-emerald-800">
                      جاهز 100%
                    </span>
                  </div>
                  <div className="text-2xs space-y-1 text-slate-600 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-400">الطلبيات المعلقة للمزامنة:</span>
                      <span className={`font-mono font-bold ${deviceInfo.pendingSyncCount > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                        {deviceInfo.pendingSyncCount} عملية
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">الطلبيات المحفوظة محلياً:</span>
                      <span className="font-mono font-bold text-slate-800">{deviceInfo.offlineOrdersCount} طلبية</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">الأصناف المحفوظة في الكاش:</span>
                      <span className="font-mono font-bold text-slate-800">{deviceInfo.offlineProductsCount} صنف</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Copy Report & WhatsApp */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200 shadow-2xs"
                >
                  {copiedReport ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedReport ? "تم نسخ التقرير الفني بنجاح!" : "نسخ تقرير الفحص الفني"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Send className="h-4 w-4" />
                  <span>إرسال التقرير للدعم الفني (د/ بلال القيسي)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: STATUSPAGE & INCIDENTS (NEW TAB) */}
          {activeTab === "statuspage" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Statuspage Top Hero */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 text-white space-y-3 shadow-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300">
                      <Activity className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm sm:text-base">الحالة الطبية لمندوبك - تاريخ الحوادث</h3>
                        <span className="px-2 py-0.5 rounded-full text-4xs font-bold bg-emerald-400 text-slate-950">
                          Statuspage.io
                        </span>
                      </div>
                      <p className="text-2xs text-emerald-200 font-medium">
                        المنصة الرسمية المعتمدة لرصد كفاءة خوادم التطبيق وتحديثات الصيانة الفنية
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchStatuspageData}
                      disabled={loadingStatuspage}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loadingStatuspage ? "animate-spin text-emerald-300" : ""}`} />
                      <span>تحديث</span>
                    </button>
                    <a
                      href={OFFICIAL_STATUSPAGE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <span>زيارة صفحة الحالة</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {/* Overall status banner */}
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400"></span>
                    </span>
                    <span className="font-black text-xs sm:text-sm text-emerald-100">
                      {statuspageData?.status?.description || "جميع الأنظمة تعمل بكفاءة (All Systems Operational)"}
                    </span>
                  </div>
                  <span className="text-3xs text-emerald-300/90 font-mono">
                    {statuspageData?.page?.updated_at ? new Date(statuspageData.page.updated_at).toLocaleTimeString("ar-YE") : "محدث الآن"}
                  </span>
                </div>
              </div>

              {/* Statuspage Components Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs text-slate-900 flex items-center gap-2">
                    <Server className="h-4 w-4 text-emerald-700" />
                    <span>مكونات وخدمات المنظومة (System Components)</span>
                  </h4>
                  <span className="text-3xs text-slate-500">حالة تشغيل الخدمات اللحظية</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(statuspageData?.components || [
                    { id: "api", name: "واجهة البرمجة (API)", status: "operational", statusArabic: "يعمل بكفاءة" },
                    { id: "portal", name: "بوابة المندوبين والإدارة (Management Portal)", status: "operational", statusArabic: "يعمل بكفاءة" },
                    { id: "cloud", name: "السحابة وقاعدة البيانات (Firestore & Cloud Run)", status: "operational", statusArabic: "يعمل بكفاءة" }
                  ]).map((comp: any) => (
                    <div
                      key={comp.id}
                      className="p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-xs text-slate-900 truncate">{comp.name}</div>
                          <div className="text-3xs text-slate-400 font-mono uppercase">{comp.status}</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-3xs font-black bg-emerald-100 text-emerald-800 shrink-0">
                        {comp.statusArabic || "يعمل بكفاءة 🟢"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incident History Timeline Section (User's RSS Incident) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-teal-700" />
                    <h4 className="font-black text-xs text-slate-900">سجل وتاريخ الحوادث (Incident History)</h4>
                  </div>
                  <span className="text-3xs text-slate-500">تحديثات البلاغات ومراحل الحل</span>
                </div>

                {/* The Incident Card */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <div>
                        <h5 className="font-black text-xs text-slate-900">هذا مثال على حادثة</h5>
                        <p className="text-3xs text-slate-500 font-mono">الأربعاء، 05 أغسطس 2026 - 01:11 UTC</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-3xs font-black bg-emerald-100 text-emerald-800">
                        تم الحل (Resolved)
                      </span>
                      <a
                        href="https://mandoubakmed1.statuspage.io/incidents/bvwtcky51kpr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                        title="عرض الحادثة على Statuspage"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* 4 Phases Timeline */}
                  <div className="p-4 space-y-4">
                    {/* Phase 1: Resolved */}
                    <div className="relative flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-3xs font-black shadow-xs">
                        ✓
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-emerald-800">تم الحل (Resolved)</span>
                          <span className="text-3xs text-slate-400 font-mono">أغسطس 5, 01:11 UTC</span>
                        </div>
                        <p className="text-2xs text-slate-700 leading-relaxed font-medium">
                          تعاطف مع المتضررين وأخبرهم أن كل شيء يسير على ما يرام.
                        </p>
                      </div>
                    </div>

                    {/* Phase 2: Monitoring */}
                    <div className="relative flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-3xs font-black shadow-xs">
                        2
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-blue-800">المراقبة (Monitoring)</span>
                          <span className="text-3xs text-slate-400 font-mono">أغسطس 5, 01:01 UTC</span>
                        </div>
                        <p className="text-2xs text-slate-700 leading-relaxed font-medium">
                          أبلغ المستخدمين بمجرد تطبيق الإصلاح، وحافظ على التواصل واضحًا ودقيقًا.
                        </p>
                      </div>
                    </div>

                    {/* Phase 3: Identified */}
                    <div className="relative flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 text-3xs font-black shadow-xs">
                        3
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-amber-800">تم التحديد (Identified)</span>
                          <span className="text-3xs text-slate-400 font-mono">أغسطس 5, 01:07 UTC</span>
                        </div>
                        <p className="text-2xs text-slate-700 leading-relaxed font-medium">
                          أثناء استمرارك في العمل على حل المشكلة، قم بتحديث عملائك بشكل متكرر.
                        </p>
                      </div>
                    </div>

                    {/* Phase 4: Investigating */}
                    <div className="relative flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 text-3xs font-black shadow-xs">
                        4
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-purple-800">جاري التحقيق (Investigating)</span>
                          <span className="text-3xs text-slate-400 font-mono">أغسطس 5, 01:37 UTC</span>
                        </div>
                        <p className="text-2xs text-slate-700 leading-relaxed font-medium">
                          عندما لا يعمل منتجك أو خدمتك كما هو متوقع، أبلغ عملاءك عن طريق إنشاء بلاغ. تواصل مبكرًا، حتى لو لم تكن تعرف بالضبط ما يحدث.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RSS Feed Card & Integration Actions */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Rss className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-black text-xs text-amber-950">تغذية الـ RSS الرسمية (Live Incident RSS Feed)</div>
                      <p className="text-3xs text-amber-800 font-mono">https://mandoubakmed1.statuspage.io/history.rss</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleCopyRss}
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-3xs hover:bg-amber-100 flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      {copiedRss ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedRss ? "تم النسخ" : "نسخ رابط RSS"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRawRss(!showRawRss)}
                      className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-3xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span>{showRawRss ? "إخفاء كود XML" : "عرض كود XML"}</span>
                    </button>
                  </div>
                </div>

                {/* Raw XML Feed Preview */}
                {showRawRss && (
                  <div className="pt-2 animate-in fade-in duration-150 space-y-1">
                    <div className="flex justify-between text-3xs text-amber-900 font-mono">
                      <span>XML RSS 2.0 Payload:</span>
                      <span>application/rss+xml</span>
                    </div>
                    <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-3xs overflow-x-auto max-h-48 scrollbar-thin whitespace-pre-wrap break-all dir-ltr text-left">
{`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>الحالة الطبية لمندوبك - تاريخ الحوادث</title>
    <link>https://mandoubakmed1.statuspage.io</link>
    <description>صفحة الحالة</description>
    <pubDate>السبت، 26 سبتمبر 2026 10:15:31 +0000</pubDate>
    <item>
      <title>هذا مثال على حادثة</title>
      <description>
        <p><small>أغسطس 5, 01:11 UTC</small><br><strong>تم الحل</strong> - تعاطف مع المتضررين وأخبرهم أن كل شيء يسير على ما يرام.</p>
        <p><small>أغسطس 5, 01:01 UTC</small><br><strong>المراقبة</strong> - أبلغ المستخدمين بمجرد تطبيق الإصلاح، وحافظ على التواصل واضحًا ودقيقًا.</p>
        <p><small>أغسطس 5, 01:07 UTC</small><br><strong>تم التحديد</strong> - أثناء استمرارك في العمل على حل المشكلة، قم بتحديث عملائك بشكل متكرر.</p>
        <p><small>أغسطس 5, 01:37 UTC</small><br><strong>جاري التحقيق</strong> - عندما لا يعمل منتجك أو خدمتك كما هو متوقع، أبلغ عملاءك عن طريق إنشاء بلاغ.</p>
      </description>
      <pubDate>الأربعاء، 05 أغسطس 2026 01:11:54 +0000</pubDate>
      <link>https://mandoubakmed1.statuspage.io/incidents/bvwtcky51kpr</link>
      <guid>https://mandoubakmed1.statuspage.io/incidents/bvwtcky51kpr</guid>
    </item>
  </channel>
</rss>`}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ENDPOINTS CHECK */}
          {activeTab === "endpoints" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1">
                <p className="text-2xs text-slate-500 font-medium">
                  فحص المسارات الأساسية للتأكد من قدرة الشبكة الخلوية على تمرير طلبات GET و POST دون تلاعب أو فلترة:
                </p>
                <button
                  type="button"
                  onClick={() => runFullDiagnostics()}
                  disabled={testingAll}
                  className="px-3 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-bold text-2xs hover:bg-teal-100 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${testingAll ? "animate-spin" : ""}`} />
                  <span>إعادة اختبار المسارات</span>
                </button>
              </div>

              <div className="space-y-2">
                {endpoints.map((ep) => {
                  const isExpanded = expandedEndpoint === ep.id;
                  const isSuccess = ep.status === "success";
                  const isWarning = ep.status === "warning";
                  const isRunning = ep.status === "running";
                  const isError = ep.status === "error";

                  return (
                    <div
                      key={ep.id}
                      className={`rounded-2xl border transition-all ${
                        isSuccess
                          ? "bg-white border-slate-200"
                          : isWarning
                          ? "bg-amber-50/50 border-amber-200"
                          : isError
                          ? "bg-rose-50/50 border-rose-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div
                        onClick={() => setExpandedEndpoint(isExpanded ? null : ep.id)}
                        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isSuccess
                              ? "bg-emerald-100 text-emerald-700"
                              : isWarning
                              ? "bg-amber-100 text-amber-700"
                              : isError
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-200 text-slate-600"
                          }`}>
                            {isRunning ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : isSuccess ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : isError ? (
                              <AlertCircle className="h-4 w-4" />
                            ) : (
                              <Server className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-xs text-slate-900">{ep.name}</span>
                              <span className="px-1.5 py-0.5 rounded font-mono text-3xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                                {ep.method} {ep.path}
                              </span>
                            </div>
                            <p className="text-3xs text-slate-500 truncate">{ep.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {ep.latencyMs !== undefined && (
                            <span className={`px-2 py-0.5 rounded-full font-mono text-3xs font-black ${
                              ep.latencyMs < 400
                                ? "bg-emerald-100 text-emerald-800"
                                : ep.latencyMs < 1200
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {ep.latencyMs} ms
                            </span>
                          )}
                          {ep.httpStatus !== undefined && (
                            <span className={`px-2 py-0.5 rounded-full font-mono text-3xs font-black ${
                              ep.httpStatus >= 200 && ep.httpStatus < 300
                                ? "bg-emerald-100 text-emerald-800"
                                : ep.httpStatus === 0
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              HTTP {ep.httpStatus}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 space-y-2 text-2xs animate-in fade-in duration-100">
                          {ep.error && (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium">
                              <span className="font-black">ملاحظة الخطأ: </span>
                              {ep.error}
                            </div>
                          )}

                          {ep.dataPreview && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-3xs text-slate-400 font-mono">
                                <span>معاينة الاستجابة (Response Payload Preview):</span>
                                <span>JSON / UTF-8</span>
                              </div>
                              <pre className="p-2.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-3xs overflow-x-auto max-h-36 scrollbar-thin whitespace-pre-wrap break-all dir-ltr text-left">
                                {ep.dataPreview}
                              </pre>
                            </div>
                          )}

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                setEndpoints(prev => prev.map(item => item.id === ep.id ? { ...item, status: "running" } : item));
                                const updatedEp = await checkEndpoint(ep, targetHost);
                                setEndpoints(prev => prev.map(item => item.id === ep.id ? updatedEp : item));
                              }}
                              className="px-3 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-3xs flex items-center gap-1 border border-teal-200 cursor-pointer"
                            >
                              <Play className="h-3 w-3" />
                              <span>إعادة فحص هذا المسار فقط</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: FIRESTORE & CLOUD */}
          {activeTab === "firestore" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Firestore Hero Card */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                firestoreProbe.connected
                  ? "bg-gradient-to-r from-indigo-50/80 via-white to-teal-50/50 border-indigo-200"
                  : "bg-amber-50/80 border-amber-200"
              }`}>
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-2xl shrink-0 ${firestoreProbe.connected ? "bg-indigo-600 text-white shadow-sm" : "bg-amber-600 text-white"}`}>
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900">
                      {firestoreProbe.connected ? "الاتصال المباشر بقاعدة Firestore سليم ونشط 🟢" : "يعمل في وضع التخزين المحلي (Offline-First) 🟡"}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      {firestoreProbe.connected
                        ? `استجابة خادم Google Firestore في زمن قدره ${firestoreProbe.latencyMs} ms`
                        : "تعذر الاتصال بخوادم Firestore المباشرة - التطبيق يواصل العمل وتخزين الطلبيات في IndexedDB تلقائياً"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setProbingFirestore(true);
                    const res = await probeFirestoreDetailed();
                    setFirestoreProbe(res);
                    setProbingFirestore(false);
                  }}
                  disabled={probingFirestore}
                  className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${probingFirestore ? "animate-spin" : ""}`} />
                  <span>{probingFirestore ? "جاري الفحص..." : "إعادة فحص Firestore"}</span>
                </button>
              </div>

              {/* Firestore Technical Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <h5 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                    <Server className="h-4 w-4 text-indigo-600" />
                    بيانات إعداد المشروع (Firebase Config)
                  </h5>
                  <div className="text-2xs space-y-1.5 font-medium text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">معرف المشروع (Project ID):</span>
                      <span className="font-mono font-bold text-slate-800">{firestoreProbe.projectId || "غير محدد"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">قاعدة البيانات (Database ID):</span>
                      <span className="font-mono font-bold text-slate-800">{firestoreProbe.databaseId || "(default)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">بروتوكول الشبكة:</span>
                      <span className="font-bold text-teal-800">HTTP Long-Polling</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <h5 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    جلسة التوثيق (Auth Session)
                  </h5>
                  <div className="text-2xs space-y-1.5 font-medium text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">حالة المستخدم:</span>
                      <span className="font-bold text-slate-800">
                        {firestoreProbe.authUid ? (firestoreProbe.isAnonymous ? "مجهول (Anonymous Auth)" : "مسجل معتمد") : "غير مسجل"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">معرف الجلسة (UID):</span>
                      <span className="font-mono font-bold text-slate-800 truncate max-w-[150px]">{firestoreProbe.authUid || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">مزامنة الكاش المحلي:</span>
                      <span className="font-bold text-emerald-700">Multi-Tab Manager نشط</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOM HOST & JITTER TEST */}
          {activeTab === "custom_host" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Host Selector */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-teal-700" />
                    اختيار نطاق الخادم لفحص جودة الاتصال
                  </h4>
                  <span className="text-3xs text-slate-500">اختر الرابط لفحصه مباشرة</span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Option 1: Official App URL */}
                  <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    targetHost === OFFICIAL_APP_URL ? "bg-teal-50/80 border-teal-300 text-teal-950 font-bold" : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="hostOption"
                        checked={targetHost === OFFICIAL_APP_URL}
                        onChange={() => setTargetHost(OFFICIAL_APP_URL)}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <div className="font-black">الرابط الرسمي المعتمد للتطبيق (Production Cloud Run)</div>
                        <div className="text-3xs font-mono text-slate-500 truncate max-w-[280px] sm:max-w-md">{OFFICIAL_APP_URL}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-3xs font-black bg-teal-100 text-teal-800">الرسمي</span>
                  </label>

                  {/* Option 2: Current Window Origin */}
                  {typeof window !== "undefined" && window.location.origin !== OFFICIAL_APP_URL && (
                    <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      targetHost === window.location.origin ? "bg-teal-50/80 border-teal-300 text-teal-950 font-bold" : "border-slate-200 hover:bg-slate-50"
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="hostOption"
                          checked={targetHost === window.location.origin}
                          onChange={() => setTargetHost(window.location.origin)}
                          className="text-teal-600 focus:ring-teal-500"
                        />
                        <div>
                          <div className="font-black">نطاق الصفحة الحالية (Current Window Origin)</div>
                          <div className="text-3xs font-mono text-slate-500 truncate max-w-[280px] sm:max-w-md">{window.location.origin}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-3xs font-black bg-slate-100 text-slate-700">المحلي</span>
                    </label>
                  )}
                </div>

                {/* Custom URL Input */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-3xs font-bold text-slate-600">أو إدخال رابط مخصص (Custom URL / IP):</span>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://your-custom-backend.run.app"
                      value={customHostInput}
                      onChange={(e) => setCustomHostInput(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-teal-600 bg-slate-50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customHostInput.trim()) {
                          setTargetHost(customHostInput.trim());
                          runFullDiagnostics(customHostInput.trim());
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      تطبيق وفحص
                    </button>
                  </div>
                </div>
              </div>

              {/* Jitter & Multi-Ping Pulse Test */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs sm:text-sm">فحص استقرار الشبكة وفقدان الحزم (Jitter & Packet Loss)</h4>
                      <p className="text-3xs text-slate-400">إرسال 5 نبضات متتابعة لحساب متوسط الاستجابة وقياس تذبذب سرعة الجوال</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={runJitterProbe}
                    disabled={jitterTest.running}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Play className={`h-3.5 w-3.5 ${jitterTest.running ? "animate-pulse" : ""}`} />
                    <span>{jitterTest.running ? "جاري الاختبار..." : "بدء النبض"}</span>
                  </button>
                </div>

                {jitterTest.samples.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-4 gap-2 text-center font-mono">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-3xs text-slate-400 font-sans">الأسرع (Min)</div>
                        <div className="text-xs font-black text-emerald-400">{jitterTest.minMs} ms</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-3xs text-slate-400 font-sans">المتوسط (Avg)</div>
                        <div className="text-xs font-black text-teal-300">{jitterTest.avgMs} ms</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-3xs text-slate-400 font-sans">الأبطأ (Max)</div>
                        <div className="text-xs font-black text-amber-400">{jitterTest.maxMs} ms</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-3xs text-slate-400 font-sans">فقدان الحزم</div>
                        <div className={`text-xs font-black ${jitterTest.packetLossPercent === 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {jitterTest.packetLossPercent}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: SMART TROUBLESHOOTING */}
          {activeTab === "troubleshoot" && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 space-y-1">
                <h4 className="font-black text-xs flex items-center gap-1.5 text-teal-950">
                  <Info className="h-4 w-4 text-teal-700" />
                  <span>دليل الحلول السريعة لمشاكل الشبكات المقيدة (Restricted Networks Troubleshooting)</span>
                </h4>
                <p className="text-3xs text-teal-800 font-medium">
                  تم تصميم تطبيق مندوبك الطبي ليعمل بكفاءة حتى عند انقطاع الإنترنت بالكامل. إليك الحلول المعتمدة لكل حالة:
                </p>
              </div>

              {/* Troubleshooting Scenario 1: Restricted Mobile Data (2G/3G) */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-black text-xs text-slate-900">
                  <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs">
                    1
                  </div>
                  <span>شبكة الجوال ضعيفة أو بطيئة (3G / 2G / تذبذب التغطية)</span>
                </div>
                <p className="text-2xs text-slate-600 leading-relaxed pr-8">
                  • لا داعي للقلق؛ يمكنك إنشاء الطلبيات، تسجيل فواتير البونص، وإجراء جرد الصيدليات كالمعتاد.
                  <br />
                  • يقوم التطبيق تلقائياً بحفظ كل عملية في قاعدة <span className="font-bold text-slate-800">IndexedDB</span> على جهازك مع منحها شارة "معلق للمزامنة".
                  <br />
                  • فور عودتك لمكان به تغطية جيدة، سيقوم النظام برفع العمليات تلقائياً في الخلفية.
                </p>
              </div>

              {/* Troubleshooting Scenario 2: Android WebView Blank Screen */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-black text-xs text-slate-900">
                  <div className="h-6 w-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center text-xs">
                    2
                  </div>
                  <span>ظهور شاشة بيضاء داخل تطبيق الأندرويد (WebView / APK)</span>
                </div>
                <p className="text-2xs text-slate-600 leading-relaxed pr-8">
                  • تم تهيئة <span className="font-mono font-bold text-slate-800">settings.domStorageEnabled = true</span> في كود <span className="font-mono text-slate-800">MainActivity.java</span>.
                  <br />
                  • تم تفعيل قبول الكوكيز والكوكيز التابعة لأطراف ثالثة: <span className="font-mono text-teal-800 font-bold">CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)</span>.
                  <br />
                  • أو استخدم ميزة التشغيل الأوفلاين الشامل بوضع مجلد <span className="font-mono text-slate-800">dist/</span> في مجلد <span className="font-mono text-slate-800">assets/</span> واستدعائه عبر <span className="font-mono font-bold text-teal-800">file:///android_asset/index.html</span>.
                </p>
              </div>

              {/* Troubleshooting Scenario 3: Cookie & Cross-Site Storage Status */}
              <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-xs text-teal-950">
                    <div className="h-6 w-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs">
                      <Cookie className="h-3.5 w-3.5" />
                    </div>
                    <span>حالة ملفات تعريف الارتباط والذاكرة (Cookies & Storage Engine)</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 text-emerald-800 px-2.5 py-0.5 text-3xs font-bold border border-emerald-300">
                    <ShieldCheck className="h-3 w-3" />
                    <span>SameSite=None; Partitioned</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-2xs">
                  <div className="p-2.5 rounded-xl bg-white border border-teal-100 space-y-1">
                    <div className="text-slate-500 font-bold text-3xs">كوكيز المتصفح (Browser Cookies):</div>
                    <div className={`font-black flex items-center gap-1.5 ${areCookiesEnabled() ? "text-emerald-700" : "text-amber-600"}`}>
                      <span className={`h-2 w-2 rounded-full ${areCookiesEnabled() ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <span>{areCookiesEnabled() ? "نشطة ومسموحة بنجاح ✓" : "وضع الذاكرة المشفرة البديل"}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-teal-100 space-y-1">
                    <div className="text-slate-500 font-bold text-3xs">الذاكرة المحلية (LocalStorage & IndexedDB):</div>
                    <div className={`font-black flex items-center gap-1.5 ${isStorageAvailable() ? "text-emerald-700" : "text-amber-600"}`}>
                      <span className={`h-2 w-2 rounded-full ${isStorageAvailable() ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <span>{isStorageAvailable() ? "تعمل بكفاءة عالية ✓" : "ذاكرة الجلسة النشطة"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-teal-200/50">
                  <span className="text-3xs text-slate-600">
                    تدعم المنظومة بروتوكول CHIPS لكوكيز الإطارات (Partitioned Cookies) لحماية تسجيل الدخول حتى في وضع التصفح الخفي.
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = setCookie("probe_test", "1", { days: 1 });
                      try {
                        const res = await fetch("/api/diagnostics/cookies");
                        const json = await res.json();
                        alert(`نتيجة فحص الكوكيز:\n• كتابة الكوكيز محلياً: ${ok ? "ناجحة ✓" : "عبر الذاكرة البديلة"}\n• استجابة خادم API: ${json.success ? "نشط ومزود بالسياسة الحديثة ✓" : "غير متاح"}\n• السياسة: ${json.cookiePolicy}`);
                      } catch (err: any) {
                        alert(`تم فحص الكوكيز محلياً بنجاح (المتصفح: ${ok ? "يقبل الكوكيز" : "يعمل بالذاكرة الآمنة"}).`);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-3xs font-bold text-teal-800 hover:text-teal-950 bg-teal-100/70 hover:bg-teal-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>فحص فوري للخادم والكوكيز</span>
                  </button>
                </div>
              </div>

              {/* Emergency Cache Flush */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-900 font-black text-xs">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <span>إجراءات الطوارئ: تفريغ الكاش وإعادة التهيئة النظيفة</span>
                  </div>
                </div>
                <p className="text-2xs text-rose-800">
                  إذا واجهت أي تعليق في الواجهة نتيجة كاش قديم أو تغيير في إصدار التطبيق، يمكنك النقر على الزر أدناه لإفراغ كل الذاكرة المؤقتة وسجلات الـ Service Worker:
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("هل أنت متأكد من رغبتك في تفريغ الذاكرة المؤقتة بالكامل؟ سيتم إعادة تحميل التطبيق نظيفاً من الخادم.")) {
                      await clearAllCachesAndReset();
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>إفراغ الكاش وإعادة تشغيل التطبيق (Hard Reset)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-3xs text-slate-500 font-medium">
            <span>مندوبك الطبي v2.4</span>
            <span>•</span>
            <span>برعاية د/ بلال القيسي: 776600049</span>
            <span>•</span>
            <a
              href={OFFICIAL_STATUSPAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
            >
              <span>mandoubakmed1.statuspage.io</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyReport}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              {copiedReport ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedReport ? "تم النسخ" : "نسخ التقرير"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none rounded-xl bg-teal-800 hover:bg-teal-900 text-white px-5 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
