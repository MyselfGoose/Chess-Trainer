import { TRAINING_HISTORY_KEY } from "@/lib/training/history";
import { LINE_MASTERY_KEY } from "@/lib/training/mastery";
import {
  getStorageBackend,
  readStorageItem,
} from "@/lib/storage/migrate";

import { MAX_CATALOG_BYTES, REPERTOIRE_CATALOG_KEY } from "./types";

export interface StorageStats {
  catalogBytes: number;
  catalogLimitBytes: number;
  trainingHistoryBytes: number;
  masteryBytes: number;
  totalBytes: number;
}

function byteLength(value: string | null): number {
  if (!value) {
    return 0;
  }
  return new TextEncoder().encode(value).length;
}

export function computeStorageStats(): StorageStats {
  if (typeof window === "undefined") {
    return {
      catalogBytes: 0,
      catalogLimitBytes: MAX_CATALOG_BYTES,
      trainingHistoryBytes: 0,
      masteryBytes: 0,
      totalBytes: 0,
    };
  }

  const catalogBytes = byteLength(readStorageItem(REPERTOIRE_CATALOG_KEY));
  const trainingHistoryBytes = byteLength(readStorageItem(TRAINING_HISTORY_KEY));
  const masteryBytes = byteLength(readStorageItem(LINE_MASTERY_KEY));

  let totalBytes = catalogBytes + trainingHistoryBytes + masteryBytes;
  if (getStorageBackend() === "localStorage" && typeof localStorage !== "undefined") {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (
        key?.startsWith("chess:") &&
        key !== REPERTOIRE_CATALOG_KEY &&
        key !== TRAINING_HISTORY_KEY &&
        key !== LINE_MASTERY_KEY
      ) {
        totalBytes += byteLength(localStorage.getItem(key));
      }
    }
  }

  return {
    catalogBytes,
    catalogLimitBytes: MAX_CATALOG_BYTES,
    trainingHistoryBytes,
    masteryBytes,
    totalBytes,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
