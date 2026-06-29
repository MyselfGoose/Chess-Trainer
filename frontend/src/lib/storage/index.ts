export {
  ensureStorageInitialized,
  getStorageBackend,
  migrateToIndexedDb,
  readStorageItem,
  shouldMigrateToIdb,
  writeStorageItem,
  MIGRATION_THRESHOLD_BYTES,
  STORAGE_BACKEND_KEY,
} from "./migrate";
export type { StorageBackend } from "./migrate";
export { idbGet, idbSet, isIndexedDbAvailable } from "./idb";
