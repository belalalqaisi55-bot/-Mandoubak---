import React, { useState, useEffect } from "react";
import { listenToNetworkStatus, isDeviceOnline, getPendingSyncCounts } from "../utils/offlineSync";

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = React.useState(isDeviceOnline());
  const [syncCount, setSyncCount] = React.useState(0);
  const [latency, setLatency] = React.useState<number>(0);

  React.useEffect(() => {
    const cleanup = listenToNetworkStatus((online) => {
      setIsOnline(online);
      refreshSyncCount();
    });
    refreshSyncCount();

    // Latency tracking
    let isMounted = true;
    const updateLatency = () => {
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

    updateLatency();
    const conn = (navigator as any).connection;
    if (conn) conn.addEventListener("change", updateLatency);
    const interval = setInterval(updateLatency, 30000);

    return () => {
      isMounted = false;
      cleanup();
      clearInterval(interval);
      if (conn) conn.removeEventListener("change", updateLatency);
    };
  }, []);

  const refreshSyncCount = async () => {
    const counts = await getPendingSyncCounts();
    setSyncCount(counts.total);
  };

  return { isOnline, syncCount, refreshSyncCount, latency };
}
