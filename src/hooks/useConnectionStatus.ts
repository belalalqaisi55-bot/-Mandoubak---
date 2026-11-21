import { useState, useEffect, useCallback } from "react";
import { listenToNetworkStatus, isDeviceOnline, getPendingSyncCounts } from "../utils/offlineSync";

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(isDeviceOnline());
  const [syncCount, setSyncCount] = useState(0);
  const [latency, setLatency] = useState<number>(0);

  const refreshSyncCount = useCallback(async () => {
    const counts = await getPendingSyncCounts();
    setSyncCount(counts.total);
  }, []);

  useEffect(() => {
    const cleanup = listenToNetworkStatus((online) => {
      setIsOnline(online);
      refreshSyncCount();
    });
    refreshSyncCount();

    // Latency tracking
    let isMounted = true;
    const updateLatency = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const conn = (navigator as any).connection;
      if (conn && typeof conn.rtt === "number" && conn.rtt > 0) {
        if (isMounted) setLatency(conn.rtt);
      } else if (navigator.onLine) {
        const start = performance.now();
        fetch("/api/health", { method: "HEAD", cache: "no-store" })
          .then(() => {
            if (isMounted) {
              const rtt = Math.round(performance.now() - start);
              setLatency(rtt > 0 ? rtt : 45);
            }
          })
          .catch(() => {
            if (isMounted) setLatency(45);
          });
      }
    };

    const initialTimer = setTimeout(updateLatency, 300);
    const conn = (navigator as any).connection;
    if (conn) conn.addEventListener("change", updateLatency);
    const interval = setInterval(updateLatency, 60000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      cleanup();
      clearInterval(interval);
      if (conn) conn.removeEventListener("change", updateLatency);
    };
  }, []);

  return { isOnline, syncCount, refreshSyncCount, latency };
}
