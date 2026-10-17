import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { Order, StockReport, Product, SyncQueueItem, OfflineSyncStats } from "../types";
import { isFirebaseConfigured, db } from "../firebase";

const DB_NAME = "mandoubak_offline_db";
const DB_VERSION = 2;

// IndexedDB Store Names
export const STORES = {
  ORDERS: "orders",
  STOCK_REPORTS: "stockReports",
  PRODUCTS: "products",
  SYNC_QUEUE: "syncQueue",
  METADATA: "metadata",
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes and upgrades the IndexedDB instance
 */
export function initOfflineDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB is not supported in this environment"));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Orders Store
        if (!db.objectStoreNames.contains(STORES.ORDERS)) {
          const ordersStore = db.createObjectStore(STORES.ORDERS, { keyPath: "id" });
          ordersStore.createIndex("clientId", "clientId", { unique: false });
          ordersStore.createIndex("createdAt", "createdAt", { unique: false });
          ordersStore.createIndex("syncStatus", "syncStatus", { unique: false });
          ordersStore.createIndex("status", "status", { unique: false });
        }

        // 2. Stock Reports Store
        if (!db.objectStoreNames.contains(STORES.STOCK_REPORTS)) {
          const stockStore = db.createObjectStore(STORES.STOCK_REPORTS, { keyPath: "id" });
          stockStore.createIndex("clientId", "clientId", { unique: false });
          stockStore.createIndex("productId", "productId", { unique: false });
          stockStore.createIndex("reportedAt", "reportedAt", { unique: false });
          stockStore.createIndex("syncStatus", "syncStatus", { unique: false });
        }

        // 3. Products Catalog Store
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productsStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: "id" });
          productsStore.createIndex("category", "category", { unique: false });
          productsStore.createIndex("name", "name", { unique: false });
        }

        // 4. Sync Queue Store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: "id" });
          syncStore.createIndex("entityType", "entityType", { unique: false });
          syncStore.createIndex("status", "status", { unique: false });
          syncStore.createIndex("createdAt", "createdAt", { unique: false });
        }

        // 5. Metadata Store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: "key" });
        }
      };

      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Handle database close on unexpected disconnect
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };

        resolve(db);
      };

      request.onerror = (event: Event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        console.warn("IndexedDB open error:", error);
        reject(error);
      };

      request.onblocked = () => {
        console.warn("IndexedDB blocked by another open tab. Please close other tabs.");
      };
    } catch (e) {
      reject(e);
    }
  });

  return dbPromise;
}

/**
 * Executes a transaction on an object store safely
 */
async function performTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  const db = await initOfflineDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);

      let request: IDBRequest<T> | void;
      try {
        request = operation(store);
      } catch (err) {
        return reject(err);
      }

      transaction.oncomplete = () => {
        if (request && "result" in request) {
          resolve(request.result);
        } else {
          resolve(undefined as unknown as T);
        }
      };

      transaction.onerror = (event) => {
        reject((event.target as IDBTransaction).error);
      };

      transaction.onabort = () => {
        reject(new Error(`IndexedDB transaction aborted on store: ${storeName}`));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Checks if the browser is currently online
 */
export function isDeviceOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/**
 * Listens to online / offline network state changes
 */
export function listenToNetworkStatus(onChange: (isOnline: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => onChange(true);
  const handleOffline = () => onChange(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

// =========================================================================
// ORDERS OFFLINE OPERATIONS
// =========================================================================

/**
 * Saves or updates an order in IndexedDB and registers it in the sync queue if pending
 */
export async function saveOfflineOrder(
  order: Order,
  options: { forcePending?: boolean } = {}
): Promise<{ order: Order; queued: boolean }> {
  const isOnline = isDeviceOnline();
  const shouldQueue = options.forcePending || !isOnline;

  const normalizedOrder: Order = {
    ...order,
    syncStatus: shouldQueue ? "pending_sync" : (order.syncStatus || "synced"),
    syncedAt: shouldQueue ? undefined : (order.syncedAt || new Date().toISOString()),
  };

  // 1. Save to orders store in IndexedDB
  await performTransaction(STORES.ORDERS, "readwrite", (store) => {
    store.put(normalizedOrder);
  });

  // 2. Also keep localStorage in sync as a fast backup
  try {
    const raw = localStorage.getItem("mandoubak_local_orders");
    let ordersList: Order[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(ordersList)) ordersList = [];
    const filtered = ordersList.filter((o) => o.id !== normalizedOrder.id);
    localStorage.setItem("mandoubak_local_orders", JSON.stringify([normalizedOrder, ...filtered]));
  } catch (e) {}

  // 3. If offline/pending, add to syncQueue
  let queued = false;
  if (shouldQueue) {
    const queueItem: SyncQueueItem = {
      id: `queue_order_${normalizedOrder.id}`,
      entityType: "order",
      action: "create",
      data: normalizedOrder,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: "pending",
      priority: 1, // High priority for orders
    };

    await performTransaction(STORES.SYNC_QUEUE, "readwrite", (store) => {
      store.put(queueItem);
    });
    queued = true;
  }

  return { order: normalizedOrder, queued };
}

/**
 * Retrieves all stored orders from IndexedDB
 */
export async function getOfflineOrders(clientId?: string, role?: string): Promise<Order[]> {
  try {
    const db = await initOfflineDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.ORDERS, "readonly");
      const store = transaction.objectStore(STORES.ORDERS);
      const request = store.getAll();

      request.onsuccess = () => {
        let list: Order[] = request.result || [];
        if (clientId && role !== "rep") {
          list = list.filter((o) => o.clientId === clientId || (o as any).userId === clientId);
        }
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(list);
      };

      request.onerror = () => {
        // Fallback to localStorage
        try {
          const raw = localStorage.getItem("mandoubak_local_orders");
          const list: Order[] = raw ? JSON.parse(raw) : [];
          resolve(Array.isArray(list) ? list : []);
        } catch {
          resolve([]);
        }
      };
    });
  } catch (err) {
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem("mandoubak_local_orders");
      const list: Order[] = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
}

/**
 * Updates an order status in IndexedDB (e.g. from admin)
 */
export async function updateOfflineOrderStatus(orderId: string, status: Order["status"]): Promise<void> {
  try {
    const order = await performTransaction<Order | undefined>(STORES.ORDERS, "readonly", (store) => {
      return store.get(orderId);
    });

    if (order) {
      order.status = status;
      await performTransaction(STORES.ORDERS, "readwrite", (store) => {
        store.put(order);
      });

      // Update localStorage backup
      try {
        const raw = localStorage.getItem("mandoubak_local_orders");
        let ordersList: Order[] = raw ? JSON.parse(raw) : [];
        if (Array.isArray(ordersList)) {
          ordersList = ordersList.map((o) => (o.id === orderId ? { ...o, status } : o));
          localStorage.setItem("mandoubak_local_orders", JSON.stringify(ordersList));
        }
      } catch (e) {}
    }
  } catch (e) {
    console.warn("Failed to update offline order status:", e);
  }
}

/**
 * Deletes an order from IndexedDB
 */
export async function deleteOfflineOrder(orderId: string): Promise<void> {
  try {
    await performTransaction(STORES.ORDERS, "readwrite", (store) => {
      store.delete(orderId);
    });
    // Remove from syncQueue if exists
    await performTransaction(STORES.SYNC_QUEUE, "readwrite", (store) => {
      store.delete(`queue_order_${orderId}`);
    });
    // Clean from localStorage fallback
    try {
      const raw = localStorage.getItem("mandoubak_local_orders");
      if (raw) {
        const ordersList: Order[] = JSON.parse(raw);
        if (Array.isArray(ordersList)) {
          const filtered = ordersList.filter((o) => o.id !== orderId);
          localStorage.setItem("mandoubak_local_orders", JSON.stringify(filtered));
        }
      }
    } catch (e) {}
  } catch (e) {
    console.warn("Failed to delete offline order:", e);
  }
}

/**
 * Automatically separates an orders array into active and archived orders,
 * transferring all 'completed' orders into the separate archivedOrders array.
 */
export function separateActiveAndArchivedOrders(ordersList: Order[]): {
  activeOrders: Order[];
  archivedOrders: Order[];
} {
  const now = new Date().toISOString();
  const activeOrders: Order[] = [];
  const archivedOrders: Order[] = [];

  for (const order of ordersList) {
    if (order.status === "completed" || order.isArchived) {
      archivedOrders.push({
        ...order,
        isArchived: true,
        archivedAt: order.archivedAt || now,
      });
    } else {
      activeOrders.push({
        ...order,
        isArchived: false,
      });
    }
  }

  return { activeOrders, archivedOrders };
}

/**
 * Retrieves only active (uncompleted and unarchived) orders from IndexedDB
 */
export async function getOfflineActiveOrders(clientId?: string, role?: string): Promise<Order[]> {
  const allOrders = await getOfflineOrders(clientId, role);
  return allOrders.filter((o) => !o.isArchived && o.status !== "completed");
}

/**
 * Retrieves only completed and archived orders from IndexedDB into separate archived array
 */
export async function getOfflineArchivedOrders(clientId?: string, role?: string): Promise<Order[]> {
  const allOrders = await getOfflineOrders(clientId, role);
  return allOrders
    .filter((o) => Boolean(o.isArchived || o.status === "completed"))
    .map((o) => ({
      ...o,
      isArchived: true,
      archivedAt: o.archivedAt || o.createdAt,
    }));
}

/**
 * Toggles an order's archive status in IndexedDB and localStorage
 */
export async function archiveOfflineOrder(orderId: string, isArchived: boolean = true): Promise<void> {
  try {
    const archivedAt = isArchived ? new Date().toISOString() : undefined;
    const order = await performTransaction<Order | undefined>(STORES.ORDERS, "readonly", (store) => {
      return store.get(orderId);
    });

    if (order) {
      order.isArchived = isArchived;
      order.archivedAt = archivedAt;
      const now = new Date().toISOString();
      if (isArchived) {
        order.status = "completed";
        (order as any).completedAt = (order as any).completedAt || now;
      }
      (order as any).updatedAt = now;
      await performTransaction(STORES.ORDERS, "readwrite", (store) => {
        store.put(order);
      });

      // Update localStorage backup
      try {
        const raw = localStorage.getItem("mandoubak_local_orders");
        let ordersList: Order[] = raw ? JSON.parse(raw) : [];
        if (Array.isArray(ordersList)) {
          ordersList = ordersList.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  isArchived,
                  archivedAt,
                  status: isArchived ? "completed" : o.status,
                  completedAt: isArchived ? ((o as any).completedAt || now) : (o as any).completedAt,
                  updatedAt: now,
                }
              : o
          );
          localStorage.setItem("mandoubak_local_orders", JSON.stringify(ordersList));
        }
      } catch (e) {}
    }
  } catch (e) {
    console.warn("Failed to archive offline order:", e);
  }
}

/**
 * Restores an archived order back to active state in IndexedDB and localStorage
 */
export async function restoreArchivedOfflineOrder(orderId: string): Promise<Order | null> {
  try {
    const order = await performTransaction<Order | undefined>(STORES.ORDERS, "readonly", (store) => {
      return store.get(orderId);
    });

    if (order) {
      order.isArchived = false;
      order.archivedAt = undefined;
      order.status = "approved";

      await performTransaction(STORES.ORDERS, "readwrite", (store) => {
        store.put(order);
      });

      try {
        const raw = localStorage.getItem("mandoubak_local_orders");
        let ordersList: Order[] = raw ? JSON.parse(raw) : [];
        if (Array.isArray(ordersList)) {
          ordersList = ordersList.map((o) => (o.id === orderId ? { ...o, isArchived: false, status: "approved", archivedAt: undefined } : o));
          localStorage.setItem("mandoubak_local_orders", JSON.stringify(ordersList));
        }
      } catch (e) {}

      return order;
    }
  } catch (e) {
    console.warn("Failed to restore archived offline order:", e);
  }
  return null;
}

/**
 * Batch archives all completed/delivered orders offline and returns separated arrays
 */
export async function archiveAllCompletedOfflineOrders(): Promise<{ count: number; activeOrders: Order[]; archivedOrders: Order[] }> {
  let count = 0;
  const now = new Date().toISOString();
  let updatedOrders: Order[] = [];
  try {
    const allOrders = await performTransaction<Order[]>(STORES.ORDERS, "readonly", (store) => {
      return store.getAll();
    });

    if (Array.isArray(allOrders)) {
      updatedOrders = allOrders.map((order) => {
        if (order.status === "completed" && !order.isArchived) {
          count++;
          return { ...order, isArchived: true, archivedAt: now };
        }
        return order;
      });

      for (const order of updatedOrders) {
        if (order.status === "completed" && order.isArchived) {
          await performTransaction(STORES.ORDERS, "readwrite", (store) => {
            store.put(order);
          });
        }
      }

      try {
        const raw = localStorage.getItem("mandoubak_local_orders");
        let ordersList: Order[] = raw ? JSON.parse(raw) : [];
        if (Array.isArray(ordersList)) {
          ordersList = ordersList.map((o) => (o.status === "completed" && !o.isArchived ? { ...o, isArchived: true, archivedAt: now } : o));
          localStorage.setItem("mandoubak_local_orders", JSON.stringify(ordersList));
        }
      } catch (e) {}
    }
  } catch (e) {
    console.warn("Failed to archive completed offline orders:", e);
  }

  const activeOrders = updatedOrders.filter((o) => !o.isArchived && o.status !== "completed");
  const archivedOrders = updatedOrders.filter((o) => Boolean(o.isArchived || o.status === "completed"));

  return { count, activeOrders, archivedOrders };
}

/**
 * Permanently deletes all archived orders offline
 */
export async function clearAllArchivedOfflineOrders(): Promise<number> {
  let count = 0;
  try {
    const allOrders = await performTransaction<Order[]>(STORES.ORDERS, "readonly", (store) => {
      return store.getAll();
    });

    if (Array.isArray(allOrders)) {
      for (const order of allOrders) {
        if (order.isArchived) {
          await deleteOfflineOrder(order.id);
          count++;
        }
      }
    }
  } catch (e) {
    console.warn("Failed to clear archived offline orders:", e);
  }
  return count;
}

// =========================================================================
// STOCK REPORTS OFFLINE OPERATIONS
// =========================================================================

/**
 * Saves an array of stock reports to IndexedDB and syncQueue
 */
export async function saveOfflineStockReports(
  reports: StockReport[],
  options: { forcePending?: boolean } = {}
): Promise<{ reports: StockReport[]; queued: boolean }> {
  if (!reports || reports.length === 0) return { reports: [], queued: false };

  const isOnline = isDeviceOnline();
  const shouldQueue = options.forcePending || !isOnline;

  const normalizedReports: StockReport[] = reports.map((r) => ({
    ...r,
    syncStatus: shouldQueue ? "pending_sync" : (r.syncStatus || "synced"),
    syncedAt: shouldQueue ? undefined : (r.syncedAt || new Date().toISOString()),
  }));

  const db = await initOfflineDB();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([STORES.STOCK_REPORTS, STORES.SYNC_QUEUE], "readwrite");
    const stockStore = transaction.objectStore(STORES.STOCK_REPORTS);
    const queueStore = transaction.objectStore(STORES.SYNC_QUEUE);

    normalizedReports.forEach((report) => {
      stockStore.put(report);

      if (shouldQueue) {
        const queueItem: SyncQueueItem = {
          id: `queue_stock_${report.id}`,
          entityType: "stockReport",
          action: "create",
          data: report,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          status: "pending",
          priority: 2, // Medium priority for stock reports
        };
        queueStore.put(queueItem);
      }
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  // Also update localStorage backup
  try {
    const raw = localStorage.getItem("mandoubak_local_stock_reports");
    let currentList: StockReport[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(currentList)) currentList = [];
    const reportIds = new Set(normalizedReports.map((r) => r.id));
    const filtered = currentList.filter((r) => !reportIds.has(r.id));
    localStorage.setItem("mandoubak_local_stock_reports", JSON.stringify([...normalizedReports, ...filtered]));
  } catch (e) {}

  return { reports: normalizedReports, queued: shouldQueue };
}

/**
 * Retrieves all stored stock reports from IndexedDB
 */
export async function getOfflineStockReports(clientId?: string, role?: string): Promise<StockReport[]> {
  try {
    const db = await initOfflineDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.STOCK_REPORTS, "readonly");
      const store = transaction.objectStore(STORES.STOCK_REPORTS);
      const request = store.getAll();

      request.onsuccess = () => {
        let list: StockReport[] = request.result || [];
        if (clientId && role !== "rep") {
          list = list.filter((r) => r.clientId === clientId || (r as any).userId === clientId);
        }
        list.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
        resolve(list);
      };

      request.onerror = () => {
        try {
          const raw = localStorage.getItem("mandoubak_local_stock_reports");
          const list: StockReport[] = raw ? JSON.parse(raw) : [];
          resolve(Array.isArray(list) ? list : []);
        } catch {
          resolve([]);
        }
      };
    });
  } catch (err) {
    try {
      const raw = localStorage.getItem("mandoubak_local_stock_reports");
      const list: StockReport[] = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
}

/**
 * Deletes a stock report from IndexedDB
 */
export async function deleteOfflineStockReport(reportId: string): Promise<void> {
  try {
    await performTransaction(STORES.STOCK_REPORTS, "readwrite", (store) => {
      store.delete(reportId);
    });
    await performTransaction(STORES.SYNC_QUEUE, "readwrite", (store) => {
      store.delete(`queue_stock_${reportId}`);
    });
  } catch (e) {
    console.warn("Failed to delete offline stock report:", e);
  }
}

// =========================================================================
// PRODUCTS CATALOG CACHING
// =========================================================================

/**
 * Caches products catalog into IndexedDB for offline access
 */
export async function cacheProductsOffline(products: Product[]): Promise<void> {
  if (!products || products.length === 0) return;
  try {
    const db = await initOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORES.PRODUCTS, "readwrite");
      const store = transaction.objectStore(STORES.PRODUCTS);

      products.forEach((p) => {
        if (p && p.id) {
          store.put(p);
        }
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    try {
      localStorage.setItem("mandoubak_local_products", JSON.stringify(products));
    } catch (e) {}
  } catch (e) {
    console.warn("Failed to cache products in IndexedDB:", e);
  }
}

/**
 * Retrieves cached products from IndexedDB
 */
export async function getCachedProductsOffline(): Promise<Product[]> {
  try {
    const db = await initOfflineDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.PRODUCTS, "readonly");
      const store = transaction.objectStore(STORES.PRODUCTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const list: Product[] = request.result || [];
        resolve(list);
      };

      request.onerror = () => {
        try {
          const raw = localStorage.getItem("mandoubak_local_products");
          const list: Product[] = raw ? JSON.parse(raw) : [];
          resolve(Array.isArray(list) ? list : []);
        } catch {
          resolve([]);
        }
      };
    });
  } catch (err) {
    try {
      const raw = localStorage.getItem("mandoubak_local_products");
      const list: Product[] = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
}

// =========================================================================
// SYNC QUEUE & FIREBASE SYNCHRONIZATION ENGINE
// =========================================================================

/**
 * Gets all pending items currently queued for synchronization
 */
export async function getPendingSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const db = await initOfflineDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, "readonly");
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.getAll();

      request.onsuccess = () => {
        const list: SyncQueueItem[] = request.result || [];
        // Robust prioritization: sort by priority (1 = orders, 2 = stock reports, 3 = others), then by creation date
        list.sort((a, b) => {
          const pA = a.priority ?? (a.entityType === "order" ? 1 : a.entityType === "stockReport" ? 2 : 3);
          const pB = b.priority ?? (b.entityType === "order" ? 1 : b.entityType === "stockReport" ? 2 : 3);
          if (pA !== pB) return pA - pB;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        resolve(list);
      };

      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Returns counts of pending offline items
 */
export async function getPendingSyncCounts(): Promise<{
  total: number;
  orders: number;
  stockReports: number;
  others: number;
}> {
  const queue = await getPendingSyncQueue();
  let orders = 0;
  let stockReports = 0;
  let others = 0;

  queue.forEach((item) => {
    if (item.entityType === "order") orders++;
    else if (item.entityType === "stockReport") stockReports++;
    else others++;
  });

  return {
    total: queue.length,
    orders,
    stockReports,
    others,
  };
}

/**
 * Main Sync Engine: Pushes pending offline items from IndexedDB to Firebase & Backend API
 */
export async function syncPendingWithFirebase(
  customDb?: any,
  onProgress?: (message: string, current: number, total: number) => void
): Promise<{
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}> {
  const targetDb = customDb || db;
  const queue = await getPendingSyncQueue();

  if (queue.length === 0) {
    return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];
  const dbInstance = await initOfflineDB();

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    onProgress?.(`جاري مزامنة ${item.entityType === "order" ? "الطلبية" : "الجرد"} (${i + 1}/${queue.length})...`, i + 1, queue.length);

    try {
      let syncSuccess = false;

      // 1. Sync to Firebase Firestore if configured
      if (isFirebaseConfigured && targetDb) {
        try {
          if (item.entityType === "order") {
            const orderDocData = {
              ...item.data,
              syncStatus: "synced",
              syncedAt: new Date().toISOString(),
            };
            await setDoc(doc(targetDb, "orders", item.data.id), orderDocData, { merge: true });
            syncSuccess = true;
          } else if (item.entityType === "stockReport") {
            const reportDocData = {
              ...item.data,
              syncStatus: "synced",
              syncedAt: new Date().toISOString(),
            };
            await setDoc(doc(targetDb, "stockReports", item.data.id), reportDocData, { merge: true });
            syncSuccess = true;
          }
        } catch (fsErr: any) {
          console.warn(`Firestore sync error for ${item.id}:`, fsErr);
          errors.push(`خطأ Firestore: ${fsErr?.message || String(fsErr)}`);
        }
      }

      // 2. Also forward to Backend API endpoints
      try {
        if (item.entityType === "order") {
          const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: item.data.id,
              clientId: item.data.clientId,
              clientName: item.data.clientName,
              entityName: item.data.entityName,
              items: item.data.items,
              notes: item.data.notes,
              createdAt: item.data.createdAt,
            }),
          });
          if (res.ok) syncSuccess = true;
        } else if (item.entityType === "stockReport") {
          const res = await fetch("/api/stock-reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: item.data.id,
              clientId: item.data.clientId,
              clientName: item.data.clientName,
              entityName: item.data.entityName,
              reports: [
                {
                  productId: item.data.productId,
                  productName: item.data.productName,
                  remainingQty: item.data.remainingQty,
                },
              ],
            }),
          });
          if (res.ok) syncSuccess = true;
        }
      } catch (apiErr: any) {
        console.warn(`API sync error for ${item.id}:`, apiErr);
      }

      // 3. Handle successful synchronization
      if (syncSuccess) {
        // Mark as synced in local IndexedDB store
        if (item.entityType === "order") {
          const updatedOrder: Order = {
            ...item.data,
            syncStatus: "synced",
            syncedAt: new Date().toISOString(),
          };
          await performTransaction(STORES.ORDERS, "readwrite", (store) => {
            store.put(updatedOrder);
          });
        } else if (item.entityType === "stockReport") {
          const updatedReport: StockReport = {
            ...item.data,
            syncStatus: "synced",
            syncedAt: new Date().toISOString(),
          };
          await performTransaction(STORES.STOCK_REPORTS, "readwrite", (store) => {
            store.put(updatedReport);
          });
        }

        // Remove from syncQueue
        await performTransaction(STORES.SYNC_QUEUE, "readwrite", (store) => {
          store.delete(item.id);
        });

        syncedCount++;
      } else {
        // Update retry count
        const updatedQueueItem: SyncQueueItem = {
          ...item,
          retryCount: (item.retryCount || 0) + 1,
          lastError: errors[errors.length - 1] || "تعذر الاتصال بالسيرفر",
          status: (item.retryCount || 0) >= 3 ? "failed" : "pending",
        };
        await performTransaction(STORES.SYNC_QUEUE, "readwrite", (store) => {
          store.put(updatedQueueItem);
        });
        failedCount++;
      }
    } catch (err: any) {
      console.warn(`Critical error syncing item ${item.id}:`, err);
      failedCount++;
      errors.push(err?.message || "خطأ غير متوقع في معالجة المزامنة");
    }
  }

  // Update last sync time metadata
  try {
    const nowIso = new Date().toISOString();
    await performTransaction(STORES.METADATA, "readwrite", (store) => {
      store.put({ key: "last_sync_time", value: nowIso });
    });
    localStorage.setItem("mandoubak_last_sync_time", nowIso);
  } catch (e) {}

  return {
    success: failedCount === 0,
    syncedCount,
    failedCount,
    errors,
  };
}

/**
 * Returns overall storage summary and diagnostics
 */
export async function getOfflineStorageSummary(): Promise<OfflineSyncStats> {
  const orders = await getOfflineOrders();
  const stockReports = await getOfflineStockReports();
  const products = await getCachedProductsOffline();
  const queue = await getPendingSyncQueue();

  let lastSyncTime: string | null = null;
  try {
    const meta = await performTransaction<{ key: string; value: string } | undefined>(
      STORES.METADATA,
      "readonly",
      (store) => store.get("last_sync_time")
    );
    lastSyncTime = meta ? meta.value : localStorage.getItem("mandoubak_last_sync_time");
  } catch {
    lastSyncTime = localStorage.getItem("mandoubak_last_sync_time");
  }

  return {
    ordersCount: orders.length,
    pendingOrdersCount: queue.filter((q) => q.entityType === "order").length,
    stockReportsCount: stockReports.length,
    pendingStockReportsCount: queue.filter((q) => q.entityType === "stockReport").length,
    productsCount: products.length,
    lastSyncTime,
    isOnline: isDeviceOnline(),
  };
}

/**
 * Resets or clears local IndexedDB databases safely (for testing or cache refresh)
 */
export async function clearOfflineDatabase(): Promise<void> {
  const db = await initOfflineDB();
  const stores = [STORES.ORDERS, STORES.STOCK_REPORTS, STORES.SYNC_QUEUE, STORES.PRODUCTS, STORES.METADATA];
  
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(stores, "readwrite");
    stores.forEach((s) => {
      transaction.objectStore(s).clear();
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Completely clears IndexedDB, LocalStorage and reloads app (Clean Project & IndexedDB cache)
 */
export async function clearAllCachesAndReset(): Promise<void> {
  try {
    if (dbPromise) {
      const dbInstance = await dbPromise;
      dbInstance.close();
      dbPromise = null;
    }
  } catch (e) {}

  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch (e) {
      resolve();
    }
  });

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {}

  window.location.reload();
}

