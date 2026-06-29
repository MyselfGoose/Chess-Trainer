import {
  readStorageItem,
  writeStorageItem,
} from "@/lib/storage/migrate";

import type { TrainingSessionSummary } from "./types";

export const TRAINING_HISTORY_KEY = "chess:training-history";
const MAX_HISTORY_ENTRIES = 50;

export interface RepertoireTrainingStats {
  sessionCount: number;
  lastTrainedAt: string | null;
  lastPassRate: number | null;
  averagePassRate: number | null;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readHistory(): TrainingSessionSummary[] {
  if (!isBrowser()) {
    return [];
  }
  const raw = readStorageItem(TRAINING_HISTORY_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as TrainingSessionSummary[];
  } catch {
    return [];
  }
}

function writeHistory(history: TrainingSessionSummary[]): void {
  if (!isBrowser()) {
    return;
  }
  writeStorageItem(
    TRAINING_HISTORY_KEY,
    JSON.stringify(history.slice(0, MAX_HISTORY_ENTRIES)),
  );
}

export function saveTrainingSession(summary: TrainingSessionSummary): void {
  const history = readHistory();
  writeHistory([summary, ...history]);
}

export function getTrainingHistory(): TrainingSessionSummary[] {
  return readHistory();
}

export function getLastSessionForRepertoire(
  repertoireId: string,
): TrainingSessionSummary | null {
  return (
    readHistory().find((session) => session.repertoireId === repertoireId) ??
    null
  );
}

export function getRepertoireStats(
  repertoireId: string,
): RepertoireTrainingStats {
  const sessions = readHistory().filter(
    (session) => session.repertoireId === repertoireId,
  );
  if (sessions.length === 0) {
    return {
      sessionCount: 0,
      lastTrainedAt: null,
      lastPassRate: null,
      averagePassRate: null,
    };
  }

  const passRates = sessions.map((session) => {
    const total = session.results.length;
    if (total === 0) {
      return 0;
    }
    const passed = session.results.filter((result) => result.passed).length;
    return passed / total;
  });

  const averagePassRate =
    passRates.reduce((sum, rate) => sum + rate, 0) / passRates.length;

  return {
    sessionCount: sessions.length,
    lastTrainedAt: sessions[0].finishedAt,
    lastPassRate: passRates[0] ?? null,
    averagePassRate,
  };
}

export function formatPassRate(rate: number | null): string {
  if (rate === null) {
    return "—";
  }
  return `${Math.round(rate * 100)}%`;
}

export function formatLastTrained(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return date.toLocaleDateString();
}
