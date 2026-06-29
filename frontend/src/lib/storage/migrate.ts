import { REPERTOIRE_CATALOG_KEY } from "@/lib/repertoires/types";
import { TRAINING_HISTORY_KEY } from "@/lib/training/history";
import { LINE_MASTERY_KEY } from "@/lib/training/mastery";

import { idbGet, idbSet, isIndexedDbAvailable } from "./idb";

export const STORAGE_BACKEND_KEY = "chess:storage-backend";
export const MIGRATION_THRESHOLD_BYTES = 2_000_000;

export type StorageBackend = "localStorage" | "idb";

const memoryCache = new Map<string, string>();
let initialized = false;
let initPromise: Promise<void> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getStorageBackend(): StorageBackend {
  if (!isBrowser()) {
    return "localStorage";
  }
  const backend = localStorage.getItem(STORAGE_BACKEND_KEY);
  return backend === "idb" ? "idb" : "localStorage";
}

export function setStorageBackend(backend: StorageBackend): void {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(STORAGE_BACKEND_KEY, backend);
}

function catalogByteLength(): number {
  if (!isBrowser()) {
    return 0;
  }
  const raw = localStorage.getItem(REPERTOIRE_CATALOG_KEY);
  if (!raw) {
    return 0;
  }
  return new TextEncoder().encode(raw).length;
}

export function shouldMigrateToIdb(): boolean {
  if (!isBrowser() || !isIndexedDbAvailable()) {
    return false;
  }
  if (getStorageBackend() === "idb") {
    return false;
  }
  return catalogByteLength() > MIGRATION_THRESHOLD_BYTES;
}

const CHESS_KEYS = [
  REPERTOIRE_CATALOG_KEY,
  TRAINING_HISTORY_KEY,
  LINE_MASTERY_KEY,
];

export async function migrateToIndexedDb(): Promise<void> {
  if (!isBrowser() || !isIndexedDbAvailable()) {
    return;
  }
  for (const key of CHESS_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      await idbSet(key, value);
      memoryCache.set(key, value);
    }
  }
  setStorageBackend("idb");
}

async function hydrateIdbCache(): Promise<void> {
  for (const key of CHESS_KEYS) {
    const value = await idbGet(key);
    if (value !== null) {
      memoryCache.set(key, value);
    }
  }
}

export async function ensureStorageInitialized(): Promise<void> {
  if (!isBrowser()) {
    initialized = true;
    return;
  }
  if (initialized) {
    return;
  }
  if (!initPromise) {
    initPromise = (async () => {
      if (shouldMigrateToIdb()) {
        await migrateToIndexedDb();
      }
      if (getStorageBackend() === "idb") {
        await hydrateIdbCache();
      }
      initialized = true;
    })();
  }
  await initPromise;
}

export function readStorageItem(key: string): string | null {
  if (!isBrowser()) {
    return null;
  }
  if (getStorageBackend() === "idb") {
    return memoryCache.get(key) ?? null;
  }
  return localStorage.getItem(key);
}

export function writeStorageItem(key: string, value: string): void {
  if (!isBrowser()) {
    return;
  }
  memoryCache.set(key, value);
  if (getStorageBackend() === "idb") {
    void idbSet(key, value);
    return;
  }
  localStorage.setItem(key, value);
}

export function resetStorageForTests(): void {
  memoryCache.clear();
  initialized = false;
  initPromise = null;
}
