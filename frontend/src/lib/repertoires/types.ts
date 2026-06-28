import type { StudyGame } from "@/lib/pgn";

export type RepertoireSource = "imported" | "created";

export interface RepertoireChapter {
  id: string;
  name: string;
  /** Node IDs or line IDs belonging to this chapter */
  lineIds: string[];
  color?: "white" | "black" | "both";
  tags: string[];
  sortOrder: number;
}

export interface RepertoireMeta {
  description?: string;
  tags: string[];
  chapters: RepertoireChapter[];
  forkedFromId?: string;
  version: number;
  lastStudiedAt?: string;
  coverOpening?: string;
}

export interface Repertoire {
  id: string;
  name: string;
  source: RepertoireSource;
  createdAt: string;
  updatedAt: string;
  fileName?: string;
  games: StudyGame[];
  registeredLeafIds: string[];
  meta: RepertoireMeta;
}

export type BoardOrientation = "white" | "black";

export interface StudySessionStateV1 {
  currentNodeId: string;
  selectedGameIndex: number;
}

export interface StudySessionState {
  version: 2;
  currentNodeId: string;
  selectedGameIndex: number;
  tipNodeId: string;
  orientation: BoardOrientation;
}

export const REPERTOIRE_CATALOG_KEY = "chess:repertoire-catalog";
export const MAX_CATALOG_BYTES = 4 * 1024 * 1024;
export const REPERTOIRE_NAME_MAX_LENGTH = 80;

export function studySessionKey(repertoireId: string): string {
  return `chess:study-session:${repertoireId}`;
}
