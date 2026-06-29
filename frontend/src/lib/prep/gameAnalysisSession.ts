import type { DeviationAnalysisResult } from "./gameDeviations";
import type { TrainingColor } from "@/lib/training/types";

export const GAME_ANALYSIS_SESSION_KEY = "chess:game-analysis";

export interface StoredGameAnalysis {
  repertoireId: string;
  repertoireName: string;
  userColor: TrainingColor;
  analyzedAt: string;
  multiGameWarning?: boolean;
  result: DeviationAnalysisResult;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function saveGameAnalysis(analysis: StoredGameAnalysis): void {
  if (!isBrowser()) {
    return;
  }
  sessionStorage.setItem(GAME_ANALYSIS_SESSION_KEY, JSON.stringify(analysis));
}

export function loadGameAnalysis(): StoredGameAnalysis | null {
  if (!isBrowser()) {
    return null;
  }
  const raw = sessionStorage.getItem(GAME_ANALYSIS_SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (
      typeof record.repertoireId !== "string" ||
      typeof record.repertoireName !== "string" ||
      (record.userColor !== "white" && record.userColor !== "black") ||
      typeof record.analyzedAt !== "string" ||
      !record.result ||
      typeof record.result !== "object"
    ) {
      return null;
    }
    return parsed as StoredGameAnalysis;
  } catch {
    return null;
  }
}

export function clearGameAnalysis(): void {
  if (!isBrowser()) {
    return;
  }
  sessionStorage.removeItem(GAME_ANALYSIS_SESSION_KEY);
}
