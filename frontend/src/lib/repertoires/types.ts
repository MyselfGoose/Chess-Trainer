import type { StudyGame } from "@/lib/pgn";

export type RepertoireSource = "imported" | "created";

export interface Repertoire {
  id: string;
  name: string;
  source: RepertoireSource;
  createdAt: string;
  updatedAt: string;
  fileName?: string;
  games: StudyGame[];
  registeredLeafIds: string[];
}

export interface StudySessionState {
  currentNodeId: string;
  selectedGameIndex: number;
}

export const REPERTOIRE_CATALOG_KEY = "chess:repertoire-catalog";
export const MAX_CATALOG_BYTES = 4 * 1024 * 1024;
export const REPERTOIRE_NAME_MAX_LENGTH = 80;

export function studySessionKey(repertoireId: string): string {
  return `chess:study-session:${repertoireId}`;
}
