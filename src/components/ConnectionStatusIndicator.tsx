import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  ChevronDown, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Cloud, 
  Database, 
  Clock, 
  ArrowUpRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { getSyncLogs, addSyncLog } from '../utils/offlineSync';
import { SyncLogEntry } from '../types';

export interface ConnectionStatusIndicatorProps {
  onSync: () => Promise<void>;
  isSyncing: boolean;
  latency?: number;
  latencyMs?: number;
  onOpenSyncCenter?: () => void;
  syncLogs?: SyncLogEntry[];
  className?: string;
}

/**
 * دالة حسابية لربط زمن الاستجابة (latency) بسرعة النبض في CSS
 */
export function getPulseDuration(latencyVal?: number): string {
  if (latencyVal === undefined || latencyVal === null || isNaN(latencyVal) || latencyVal <= 0) {
    return '1.5s';
  }
  const minLatency = 10;
  const maxLatency = 2000;
  const clamped = Math.max(minLatency, Math.min(maxLatency, latencyVal));
  const minDuration = 0.3;
  const maxDuration = 3.0;
  const duration = minDuration + ((clamped - minLatency) / (maxLatency - minLatency)) * (maxDuration - minDuration);
  return `${duration.toFixed(2)}s`;
}

/**
 * دالة لتنسيق الوقت بصيغة عربية سهلة القراءة
 */
function formatArabicTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "الآن";
    if (diffMins === 1) return "منذ دقيقة";
    if (diffMins === 2) return "منذ دقيقتين";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "منذ ساعة";
    if (diffHours === 2) return "منذ ساعتين";
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;

    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ 
  onSync, 
  isSyncing, 
  latency,
  latencyMs,
  onOpenSyncCenter,
  syncLogs: externalLogs,
  className = ""
}) => {
  const { isOnline, syncCount, latency: hookLatency } = useConnectionStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const effectiveLatency = latency !== undefined ? latency : (latencyMs !== undefined ? latencyMs : hookLatency);
  const latencyPercent = Math.min(100, Math.max(0, ((effectiveLatency || 100) - 10) / (2000 - 10) * 100));

  // تحديث سجلات المزامنة
  const refreshLogs = () => {
    if (externalLogs && externalLogs.length > 0) {
      setLogs(externalLogs.slice(0, 5));
    } else {
      const stored = getSyncLogs();
      setLogs(stored.slice(0, 5));
    }
  };

  useEffect(() => {
    refreshLogs();

    const handleSyncUpdate = () => {
      refreshLogs();
    };

    window.addEventListener("mandoubak_sync_updated", handleSyncUpdate);
    window.addEventListener("storage", handleSyncUpdate);

    return () => {
      window.removeEventListener("mandoubak_sync_updated", handleSyncUpdate);
      window.removeEventListener("storage", handleSyncUpdate);
    };
  }, [externalLogs]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const displayedLogs = (externalLogs && externalLogs.length > 0 ? externalLogs : logs).slice(0, 5);

  return (
    <div 
      ref={dropdownRef}
      className={`relative inline-flex items-center gap-2 connection-status-indicator select-none ${className}`}
      id="connection-status-indicator"
      style={{
        '--latency': effectiveLatency || 100,
        '--latency-percent': `${latencyPercent}%`,
        animation: isOnline ? `connection-pulse calc(var(--latency, 100) * 0.01s) cubic-bezier(0.4, 0, 0.6, 1) infinite` : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      } as React.CSSProperties}
    >
      {/* زر المزامنة اليدوية المباشرة */}
      <button
        type="button"
        onClick={onSync}
        disabled={isSyncing || !isOnline}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold border shadow-2xs transition-all cursor-pointer ${
          isSyncing 
            ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" 
            : !isOnline
            ? "bg-rose-50 text-rose-800 border-rose-200 cursor-not-allowed opacity-60"
            : "bg-teal-50 text-teal-800 border-teal-200/80 hover:bg-teal-100 hover:border-teal-300 active:scale-95"
        }`}
        title="مزامنة يدوية فورية مع السحابة (Firestore)"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-teal-600" : ""}`} />
        <span>{isSyncing ? "جاري المزامنة..." : syncCount > 0 ? `مزامنة (${syncCount})` : "مزامنة"}</span>
      </button>

      {/* زر حالة الاتصال والقائمة المنسدلة لسجل المزامنة */}
      <button
        type="button"
        onClick={() => {
          refreshLogs();
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="انقر لعرض سجل بآخر 5 عمليات مزامنة ناجحة وفاشلة مع السحابة"
        className={`relative group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer shadow-2xs active:scale-95 ${
          isOpen
            ? "ring-2 ring-teal-500/40 border-teal-400 bg-teal-50/90 text-teal-900"
            : isOnline 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300" 
            : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 hover:border-amber-300"
        }`}
      >
        {isOnline ? (
          <>
            <span
              className="inline-flex items-center justify-center transition-colors"
              style={{
                color: `color-mix(in srgb, #10b981, #f43f5e ${latencyPercent}%)`
              }}
            >
              <Wifi className="h-3.5 w-3.5" />
            </span>
            <span>متصل</span>
            {effectiveLatency !== undefined && (
              <span className="font-mono text-[10px] bg-emerald-100/70 text-emerald-900 px-1.5 py-0.2 rounded-md font-medium">
                {effectiveLatency}ms
              </span>
            )}
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
            <span>غير متصل</span>
          </>
        )}

        <ChevronDown 
          className={`h-3 w-3 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180 text-teal-700" : "group-hover:translate-y-0.5"}`} 
        />
      </button>

      {/* القائمة المنسدلة: سجل آخر 5 عمليات مزامنة مع السحابة */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-84 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white shadow-2xl border border-slate-200/90 z-50 overflow-hidden text-right"
            style={{ direction: 'rtl' }}
          >
            {/* رأس القائمة المنسدلة */}
            <div className="p-3.5 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-xs">
                    <Cloud className="h-4 w-4 text-teal-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black tracking-tight text-white">
                        سجل مزامنة السحابة
                      </h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500/30 text-teal-100 border border-teal-400/30">
                        آخر 5 عمليات
                      </span>
                    </div>
                    <p className="text-[10px] text-teal-100/80 mt-0.5">
                      مزامنة البيانات مع خوادم Firebase Firestore
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="إغلاق القائمة"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* شريط حالة الاتصال والشبكة اللحظية */}
              <div className="mt-3 flex items-center justify-between bg-black/20 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-white/10 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                  <span className="font-semibold text-slate-100">
                    {isOnline ? "السحابة متصلة ونشطة" : "وضع غير متصل بالإنترنت"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-teal-100 text-[10px]">
                  {effectiveLatency !== undefined && (
                    <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white font-medium">
                      {effectiveLatency}ms
                    </span>
                  )}
                  <span>{syncCount > 0 ? `${syncCount} معلق` : "البيانات متطابقة ✓"}</span>
                </div>
              </div>
            </div>

            {/* قائمة آخر 5 عمليات مزامنة (ناجحة أو فاشلة) */}
            <div className="p-3 bg-slate-50/60 max-h-80 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  العمليات المسجلة مؤخراً
                </span>
                <span className="text-[10px] text-slate-400">
                  {displayedLogs.length} من 5
                </span>
              </div>

              {displayedLogs.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                  <Database className="h-6 w-6 mx-auto mb-1.5 text-slate-300" />
                  <p className="text-xs font-semibold">لا يوجد سجل مزامنة مسجل حالياً</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">انقر على زر المزامنة لتحديث السجلات</p>
                </div>
              ) : (
                displayedLogs.map((log) => {
                  const isSuccess = log.status === "success";
                  return (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-xl transition-all border ${
                        isSuccess
                          ? "bg-white hover:bg-emerald-50/30 border-slate-200/80 hover:border-emerald-200 shadow-2xs"
                          : "bg-rose-50/40 hover:bg-rose-50/70 border-rose-200/80 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div 
                            className={`mt-0.5 flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                              isSuccess 
                                ? "bg-emerald-100 text-emerald-600 border border-emerald-200" 
                                : "bg-rose-100 text-rose-600 border border-rose-200"
                            }`}
                          >
                            {isSuccess ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 leading-tight">
                                {log.message}
                              </span>
                              <span 
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                  isSuccess 
                                    ? "bg-emerald-100 text-emerald-800" 
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {isSuccess ? "ناجحة ✓" : "فاشلة ✗"}
                              </span>
                              {log.type && (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                  {log.type === "manual" ? "يدوية" : log.type === "auto" ? "تلقائية" : "فحص"}
                                </span>
                              )}
                            </div>

                            {log.details && (
                              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                                {log.details}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="text-[9px] font-mono font-medium text-slate-400 whitespace-nowrap mt-0.5">
                          {formatArabicTime(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ذيل القائمة المنسدلة: إجراءات سريعة */}
            <div className="p-3 bg-white border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await onSync();
                    refreshLogs();
                  }}
                  disabled={isSyncing || !isOnline}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    isSyncing || !isOnline
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-teal-600 hover:bg-teal-700 text-white active:scale-98"
                  }`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>{isSyncing ? "جاري المزامنة..." : "مزامنة سحابية الآن 🔄"}</span>
                </button>

                {onOpenSyncCenter && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenSyncCenter();
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors shadow-2xs cursor-pointer"
                    title="فتح مركز المزامنة المتقدم"
                  >
                    <span>مركز المزامنة</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                )}
              </div>

              <div className="text-center">
                <p className="text-[9px] text-slate-400">
                  🔒 يتم تسجيل عمليات المزامنة محلياً لضمان موثوقية وشفافية البيانات
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
