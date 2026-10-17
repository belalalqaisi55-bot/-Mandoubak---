/**
 * Safe Storage wrapper for Mandoubak Med.
 * Guarantees that calls to localStorage / sessionStorage NEVER throw DOMException
 * in browsers with third-party cookie restrictions, partitioned storage, or iframes.
 */

class MemoryStorageBackend {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(String(key)) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.store.delete(String(key));
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  get length(): number {
    return this.store.size;
  }
}

const memoryBackend = new MemoryStorageBackend();

/**
 * Tests if the native storage engine is functional and permitted.
 */
function testStorage(type: "localStorage" | "sessionStorage"): boolean {
  if (typeof window === "undefined") return false;
  try {
    const storage = window[type];
    if (!storage) return false;
    const testKey = `__test_${type}__`;
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch (_) {
    return false;
  }
}

const isLocalFunctional = testStorage("localStorage");
const isSessionFunctional = testStorage("sessionStorage");

export const safeLocalStorage = {
  getItem(key: string): string | null {
    if (isLocalFunctional) {
      try {
        return window.localStorage.getItem(key);
      } catch (_) {}
    }
    return memoryBackend.getItem(key);
  },

  setItem(key: string, value: string): boolean {
    memoryBackend.setItem(key, value);
    if (isLocalFunctional) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (_) {}
    }
    return true;
  },

  removeItem(key: string): void {
    memoryBackend.removeItem(key);
    if (isLocalFunctional) {
      try {
        window.localStorage.removeItem(key);
      } catch (_) {}
    }
  },

  clear(): void {
    memoryBackend.clear();
    if (isLocalFunctional) {
      try {
        window.localStorage.clear();
      } catch (_) {}
    }
  },
};

export const safeSessionStorage = {
  getItem(key: string): string | null {
    if (isSessionFunctional) {
      try {
        return window.sessionStorage.getItem(key);
      } catch (_) {}
    }
    return memoryBackend.getItem(key);
  },

  setItem(key: string, value: string): boolean {
    memoryBackend.setItem(key, value);
    if (isSessionFunctional) {
      try {
        window.sessionStorage.setItem(key, value);
        return true;
      } catch (_) {}
    }
    return true;
  },

  removeItem(key: string): void {
    memoryBackend.removeItem(key);
    if (isSessionFunctional) {
      try {
        window.sessionStorage.removeItem(key);
      } catch (_) {}
    }
  },

  clear(): void {
    memoryBackend.clear();
    if (isSessionFunctional) {
      try {
        window.sessionStorage.clear();
      } catch (_) {}
    }
  },
};
