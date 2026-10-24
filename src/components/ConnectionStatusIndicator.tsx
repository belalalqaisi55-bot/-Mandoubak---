import React from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

interface ConnectionStatusIndicatorProps {
  onSync: () => Promise<void>;
  isSyncing: boolean;
  latencyMs?: number;
}

/**
 * Helper function that maps latency (ms) to pulse animation duration (seconds).
 * Speed is inversely proportional to latency:
 * - Lower latency (e.g. 20-50ms) -> Faster pulse (~0.5s - 0.7s)
 * - Normal latency (e.g. 100-200ms) -> Moderate pulse (~1.0s - 1.4s)
 * - Higher latency (e.g. 500-1500ms+) -> Slower, more deliberate pulse (~2.0s - 3.0s)
 */
export function getPulseDuration(latencyMs?: number): string {
  if (latencyMs === undefined || latencyMs === null || isNaN(latencyMs) || latencyMs <= 0) {
    return '1.5s';
  }
  const minLatency = 20;
  const maxLatency = 1500;
  const clamped = Math.max(minLatency, Math.min(maxLatency, latencyMs));
  const minDuration = 0.5;
  const maxDuration = 3.0;
  const duration = minDuration + ((clamped - minLatency) / (maxLatency - minLatency)) * (maxDuration - minDuration);
  return `${duration.toFixed(2)}s`;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ 
  onSync, 
  isSyncing, 
  latencyMs 
}) => {
  const { isOnline, syncCount, latency: hookLatency } = useConnectionStatus();
  const effectiveLatency = latencyMs !== undefined ? latencyMs : hookLatency;
  const pulseDuration = getPulseDuration(effectiveLatency);

  return (
    <motion.div
      id="connection-status-indicator"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex items-center gap-2"
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
          className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold border transition-colors ${
            isOnline 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
              : "bg-amber-50 text-amber-800 border-amber-200"
          }`}
          title={isOnline ? (effectiveLatency > 0 ? `Latency: ${effectiveLatency}ms` : "متصل") : "Offline"}
        >
          {isOnline ? (
            <span
              className="inline-flex items-center justify-center"
              style={{
                animation: `connection-pulse ${pulseDuration} cubic-bezier(0.4, 0, 0.6, 1) infinite`
              }}
            >
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
            </span>
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span>{isOnline ? "متصل" : "جاري إعادة الاتصال..."}</span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

