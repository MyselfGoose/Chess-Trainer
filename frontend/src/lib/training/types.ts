import type { StudyNode } from "@/lib/pgn";

export type TrainingColor = "white" | "black";

export type TrainingPhase = "active" | "lineFeedback" | "summary";

export interface TrainingLine {
  id: string;
  repertoireId: string;
  gameIndex: number;
  leafNodeId: string;
  startFen: string;
  /** Parent of moves[0] when line starts mid-path (drill / ply range). */
  startParentNodeId?: string;
  moves: StudyNode[];
  label: string;
}

export interface TrainingLineResult {
  lineId: string;
  label: string;
  passed: boolean;
  failedAtPly?: number;
  failedAtSan?: string;
  expectedSan?: string;
  userMovesPlayed: number;
  totalUserMoves: number;
}

export interface TrainingSkippedLine {
  lineId: string;
  label: string;
}

export interface TrainingSessionSummary {
  repertoireId: string;
  repertoireName: string;
  repertoireNames?: string[];
  userColor: TrainingColor;
  startedAt: string;
  finishedAt: string;
  results: TrainingLineResult[];
  endedEarly: boolean;
  totalLinesPlanned: number;
  skippedLines: TrainingSkippedLine[];
}

export interface TrainingFeedback {
  passed: boolean;
  message: string;
  expectedSan?: string;
  playedSan?: string;
  comment?: string;
}

/** Shown during active play when the user finds a valid repertoire move that is not this line. */
export interface TrainingPositionHint {
  kind: "alternate_repertoire_move";
  playedSan: string;
  expectedSan: string;
  otherRepertoireSans: string[];
}

export function trainingColorToNodeColor(
  color: TrainingColor,
): "w" | "b" {
  return color === "white" ? "w" : "b";
}

export function nodeColorToTrainingColor(
  color: "w" | "b" | null,
): TrainingColor | null {
  if (color === "w") {
    return "white";
  }
  if (color === "b") {
    return "black";
  }
  return null;
}
