import type { CacheEntry, StorageAdapter } from "../types.js";

const DEFAULT_DB_NAME = "better-auth-offline";
const STORE_NAME = "cache";

/**
 * Creates an IndexedDB-backed storage adapter.
 *
 * @param dbName - Name of the IndexedDB database. Defaults to "better-auth-offline".
 */
export function createIndexedDBAdapter(
  dbName: string = DEFAULT_DB_NAME
): StorageAdapter {
  let dbPromise: Promise<IDBDatabase> | null = null;

  function openDB(): Promise<IDBDatabase> {
    if (dbPromise) {
      return dbPromise;
    }

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });

    return dbPromise;
  }

  return {
    async get(key: string): Promise<CacheEntry | null> {
      try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readonly");
          const store = tx.objectStore(STORE_NAME);
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result ?? null);
          request.onerror = () => reject(request.error);
        });
      } catch {
        return null;
      }
    },

    async set(key: string, value: unknown): Promise<void> {
      try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const request = store.put(value, key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch {
        // Fire-and-forget: swallow errors for cache writes
      }
    },

    async delete(key: string): Promise<void> {
      try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const request = store.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch {
        // Swallow errors
      }
    },

    async clear(): Promise<void> {
      try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch {
        // Swallow errors
      }
    },
  };
}
