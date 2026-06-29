const DB_NAME = "chess-repertoire-lab";
const DB_VERSION = 1;
const STORE_NAME = "kv";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IDB open failed"));
  });
}

export async function idbGet(key: string): Promise<string | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => {
      const value = request.result;
      resolve(typeof value === "string" ? value : null);
    };
    request.onerror = () => reject(request.error ?? new Error("IDB get failed"));
  });
}

export async function idbSet(key: string, value: string): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("IDB set failed"));
  });
}

export async function idbGetAllKeys(): Promise<string[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    request.onsuccess = () => {
      const keys = request.result.filter((key): key is string => typeof key === "string");
      resolve(keys);
    };
    request.onerror = () => reject(request.error ?? new Error("IDB keys failed"));
  });
}

export function isIndexedDbAvailable(): boolean {
  return isBrowser();
}
