import { listRepertoires } from "./storage";
import type { Repertoire } from "./types";
import { getTrainingHistory, TRAINING_HISTORY_KEY } from "@/lib/training/history";
import {
  getAllMasteryRecords,
  replaceAllMastery,
  type LineMastery,
} from "@/lib/training/mastery";
import type { TrainingSessionSummary } from "@/lib/training/types";

export interface RepertoireLabBackup {
  version: 1;
  exportedAt: string;
  catalog: Repertoire[];
  trainingHistory: TrainingSessionSummary[];
  lineMastery: Record<string, LineMastery>;
}

export type ImportBackupResult =
  | { ok: true; counts: { repertoires: number; history: number; mastery: number } }
  | { ok: false; error: string };

function isBackup(value: unknown): value is RepertoireLabBackup {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    typeof record.exportedAt === "string" &&
    Array.isArray(record.catalog) &&
    Array.isArray(record.trainingHistory) &&
    record.lineMastery !== null &&
    typeof record.lineMastery === "object"
  );
}

export function exportBackup(): RepertoireLabBackup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    catalog: listRepertoires(),
    trainingHistory: getTrainingHistory(),
    lineMastery: getAllMasteryRecords(),
  };
}

export function downloadBackupFile(): void {
  if (typeof window === "undefined") {
    return;
  }
  const backup = exportBackup();
  const date = backup.exportedAt.slice(0, 10);
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `repertoirelab-backup-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function importBackup(data: unknown): ImportBackupResult {
  if (!isBackup(data)) {
    return { ok: false, error: "Invalid backup format." };
  }

  if (
    !data.catalog.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Repertoire).id === "string" &&
        Array.isArray((item as Repertoire).games),
    )
  ) {
    return { ok: false, error: "Catalog validation failed." };
  }

  try {
    localStorage.setItem(
      "chess:repertoire-catalog",
      JSON.stringify(data.catalog),
    );
    localStorage.setItem(
      TRAINING_HISTORY_KEY,
      JSON.stringify(data.trainingHistory),
    );
    replaceAllMastery(data.lineMastery);
  } catch {
    return { ok: false, error: "Failed to write backup to storage." };
  }

  return {
    ok: true,
    counts: {
      repertoires: data.catalog.length,
      history: data.trainingHistory.length,
      mastery: Object.keys(data.lineMastery).length,
    },
  };
}
