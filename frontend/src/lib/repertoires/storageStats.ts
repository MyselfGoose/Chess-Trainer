import { MAX_CATALOG_BYTES, REPERTOIRE_CATALOG_KEY } from "./types";
import { TRAINING_HISTORY_KEY } from "@/lib/training/history";
import { LINE_MASTERY_KEY } from "@/lib/training/mastery";

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
  if (typeof localStorage === "undefined") {
    return {
      catalogBytes: 0,
      catalogLimitBytes: MAX_CATALOG_BYTES,
      trainingHistoryBytes: 0,
      masteryBytes: 0,
      totalBytes: 0,
    };
  }

  let totalBytes = 0;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("chess:")) {
      totalBytes += byteLength(localStorage.getItem(key));
    }
  }

  const catalogBytes = byteLength(localStorage.getItem(REPERTOIRE_CATALOG_KEY));
  const trainingHistoryBytes = byteLength(
    localStorage.getItem(TRAINING_HISTORY_KEY),
  );
  const masteryBytes = byteLength(localStorage.getItem(LINE_MASTERY_KEY));

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
