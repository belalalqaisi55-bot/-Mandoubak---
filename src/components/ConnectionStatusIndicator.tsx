import React from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

interface ConnectionStatusIndicatorProps {
  onSync: () => Promise<void>;
  isSyncing: boolean;
  latency?: number;
  latencyMs?: number;
}

/**
 * دالة حسابية لربط زمن الاستجابة (latency) بسرعة النبض في CSS:
 * كلما انخفضت القيمة الرقمية لـ latency (مثل 20ms)، كلما قلّت مدة النبضة (duration) وزادت سرعة النبض.
 */
export function getPulseDuration(latencyVal?: number): string {
  if (latencyVal === undefined || latencyVal === null || isNaN(latencyVal) || latencyVal <= 0) {
    return '1.5s';
  }
  const minLatency = 10;
  const maxLatency = 2000;
  const clamped = Math.max(minLatency, Math.min(maxLatency, latencyVal));
  const minDuration = 0.3; // أسرع نبضة عند أقل زمن استجابة
  const maxDuration = 3.0; // أبطأ نبضة عند أعلى زمن استجابة
  const duration = minDuration + ((clamped - minLatency) / (maxLatency - minLatency)) * (maxDuration - minDuration);
  return `${duration.toFixed(2)}s`;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ 
  onSync, 
  isSyncing, 
  latency,
  latencyMs 
}) => {
  const { isOnline, syncCount, latency: hookLatency } = useConnectionStatus();
  const effectiveLatency = latency !== undefined ? latency : (latencyMs !== undefined ? latencyMs : hookLatency);
  const pulseDuration = getPulseDuration(effectiveLatency);
  const latencyPercent = Math.min(100, Math.max(0, ((effectiveLatency || 100) - 10) / (2000 - 10) * 100));

  return (
    <motion.div
      id="connection-status-indicator"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex items-center gap-2 connection-status-indicator"
      style={{
        '--latency': effectiveLatency || 100,
        '--latency-percent': `${latencyPercent}%`,
        animation: isOnline ? `connection-pulse calc(var(--latency, 100) * 0.01s) cubic-bezier(0.4, 0, 0.6, 1) infinite` : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      } as React.CSSProperties}
    >
      <button
        onClick={onSync}
        disabled={isSyncing || !isOnline}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold border shadow-2xs transition-colors ${
          isSyncing 
            ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" 
            : !isOnline
            ? "bg-rose-50 text-rose-800 border-rose-200 cursor-not-allowed opacity-50"
            : "bg-teal-50 text-teal-800 border-teal-200/80 hover:bg-teal-100"
        }`}
        title="مزامنة يدوية مع Firestore"
      >
        {isSyncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        <span>{syncCount > 0 ? `مزامنة (${syncCount})` : "مزامنة"}</span>
      </button>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={isOnline ? "online" : "offline"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`relative group flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold border transition-colors ${
            isOnline 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
              : "bg-amber-50 text-amber-800 border-amber-200"
          }`}
        >
          {isOnline ? (
            <>
              <span
                className="inline-flex items-center justify-center"
                style={{
                  color: `color-mix(in srgb, #10b981, #f43f5e ${latencyPercent}%)`
                }}
              >
                <Wifi className="h-3.5 w-3.5" />
              </span>
              <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:block group-hover:opacity-100">
                Latency: {effectiveLatency}ms
              </div>
            </>
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span>{isOnline ? "متصل" : "جاري إعادة الاتصال..."}</span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

