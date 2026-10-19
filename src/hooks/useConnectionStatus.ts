import { useState, useEffect } from "react";
import { listenToNetworkStatus, isDeviceOnline, getPendingSyncCounts } from "../utils/offlineSync";

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(isDeviceOnline());
  const [syncCount, setSyncCount] = useState(0);

  useEffect(() => {
    const cleanup = listenToNetworkStatus((online) => {
      setIsOnline(online);
      refreshSyncCount();
    });
    refreshSyncCount();
    return cleanup;
  }, []);

  const refreshSyncCount = async () => {
    const counts = await getPendingSyncCounts();
    setSyncCount(counts.total);
  };

  return { isOnline, syncCount, refreshSyncCount };
}
