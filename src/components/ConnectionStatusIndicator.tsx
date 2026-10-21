import React from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

interface ConnectionStatusIndicatorProps {
  onSync: () => Promise<void>;
  isSyncing: boolean;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ onSync, isSyncing }) => {
  const { isOnline, syncCount } = useConnectionStatus();

  return (
    <div className="flex items-center gap-2">
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
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${isOnline ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}
        >
          <div className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`} />
          {isOnline ? "متصل" : "غير متصل"}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
