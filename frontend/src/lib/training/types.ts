import type { StudyNode } from "@/lib/pgn";

export type TrainingColor = "white" | "black";

export type TrainingPhase = "active" | "lineFeedback" | "summary";

export interface TrainingLine {
  id: string;
  gameIndex: number;
  leafNodeId: string;
  startFen: string;
  moves: StudyNode[];
  label: string;
}

export interface TrainingLineResult {
  lineId: string;
  label: string;
  passed: boolean;
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
