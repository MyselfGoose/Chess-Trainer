import type { Arrow, Eval, SquareAnnotation } from "@echecs/pgn";

export interface StudyNode {
  id: string;
  san: string;
  fen: string;
  color: "w" | "b" | null;
  moveNumber?: number;
  ply: number;
  from?: string;
  to?: string;
  comment?: string;
  annotations?: string[];
  arrows?: Arrow[];
  squares?: SquareAnnotation[];
  clock?: number;
  eval?: Eval;
  parentId: string | null;
  childIds: string[];
  pathLabel: string;
  isVariation: boolean;
}

export interface StudyGame {
  meta: Record<string, string>;
  result: string;
  startFen: string;
  rootId: string;
  nodes: Record<string, StudyNode>;
}

export interface PgnParseIssue {
  message: string;
  line?: number;
  column?: number;
}

export interface PgnParseResult {
  games: StudyGame[];
  errors: PgnParseIssue[];
  warnings: PgnParseIssue[];
}

export interface LineStats {
  lineCount: number;
  maxDepth: number;
  totalMoves: number;
  variationCount: number;
}

export interface StoredPgnStudy {
  fileName?: string;
  importedAt: string;
  games: StudyGame[];
  selectedGameIndex: number;
}

export const PGN_STORAGE_KEY = "chess:pgn-study";
export const MAX_PGN_BYTES = 2 * 1024 * 1024;
