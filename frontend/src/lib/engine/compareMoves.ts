import { isValidFen } from "@/lib/chess/fen";

import type { EngineEvaluation, StockfishEngine } from "./types";

export interface CompareAlternative {
  nodeId: string;
  san: string;
  fenAfter: string;
}

export interface CompareMoveResult {
  nodeId: string;
  san: string;
  depth: number;
  scoreCp?: number;
  scoreMate?: number;
  scoreForMover: number;
  deltaFromBestCp: number;
  rank: number;
}

export const COMPARE_MOVES_DEPTH = 16;
export const COMPARE_MOVES_MAX_ALTERNATIVES = 3;
export const ENGINE_SUGGESTION_LABEL = "Engine suggestion";

export function sideToMoveFromFen(fen: string): "w" | "b" | null {
  const parts = fen.trim().split(/\s+/);
  const turn = parts[1];
  if (turn === "w" || turn === "b") {
    return turn;
  }
  return null;
}

export function scoreForMoverFromEvaluation(
  evaluation: Pick<EngineEvaluation, "scoreCp" | "scoreMate">,
  moverColor: "w" | "b",
  fenAfter: string,
): { scoreCp?: number; scoreMate?: number; scoreForMover: number } {
  const sideToMove = sideToMoveFromFen(fenAfter);
  const flip = sideToMove !== null && sideToMove !== moverColor;

  let scoreCp = evaluation.scoreCp;
  let scoreMate = evaluation.scoreMate;

  if (flip) {
    if (scoreCp !== undefined) {
      scoreCp = -scoreCp;
    }
    if (scoreMate !== undefined) {
      scoreMate = -scoreMate;
    }
  }

  const scoreForMover = evaluationToComparableCp({ scoreCp, scoreMate });
  return { scoreCp, scoreMate, scoreForMover };
}

export function evaluationToComparableCp(
  evaluation: Pick<EngineEvaluation, "scoreCp" | "scoreMate">,
): number {
  if (evaluation.scoreMate !== undefined) {
    const mate = evaluation.scoreMate;
    if (mate > 0) {
      return 10_000 - mate;
    }
    return -10_000 - Math.abs(mate);
  }
  return evaluation.scoreCp ?? 0;
}

export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  if (tasks.length === 0) {
    return [];
  }

  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await tasks[current]!();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

async function analyzePosition(
  engine: StockfishEngine,
  fen: string,
  depth: number,
): Promise<EngineEvaluation> {
  await engine.init();
  await engine.setPosition(fen);
  let lastEvaluation: EngineEvaluation | null = null;
  for await (const evaluation of engine.analyze(depth)) {
    lastEvaluation = evaluation;
  }
  if (!lastEvaluation) {
    throw new Error("Engine returned no evaluation.");
  }
  return lastEvaluation;
}

function rankResults(
  raw: Array<{
    alternative: CompareAlternative;
    evaluation: EngineEvaluation;
    scoreCp?: number;
    scoreMate?: number;
    scoreForMover: number;
  }>,
): CompareMoveResult[] {
  const sorted = [...raw].sort((a, b) => b.scoreForMover - a.scoreForMover);
  const bestScore = sorted[0]?.scoreForMover ?? 0;

  return sorted.map((entry, index) => ({
    nodeId: entry.alternative.nodeId,
    san: entry.alternative.san,
    depth: entry.evaluation.depth,
    scoreCp: entry.scoreCp,
    scoreMate: entry.scoreMate,
    scoreForMover: entry.scoreForMover,
    deltaFromBestCp: entry.scoreForMover - bestScore,
    rank: index + 1,
  }));
}

export interface CompareMovesOptions {
  parentFen: string;
  moverColor: "w" | "b";
  alternatives: CompareAlternative[];
  depth?: number;
  maxAlternatives?: number;
  concurrency?: number;
  onProgress?: (done: number, total: number) => void;
}

export async function compareMoves(
  engine: StockfishEngine,
  options: CompareMovesOptions,
): Promise<CompareMoveResult[]> {
  const {
    parentFen,
    moverColor,
    alternatives,
    depth = COMPARE_MOVES_DEPTH,
    maxAlternatives = COMPARE_MOVES_MAX_ALTERNATIVES,
    onProgress,
  } = options;

  if (!isValidFen(parentFen)) {
    throw new Error("Invalid parent FEN for compare moves.");
  }

  const selected = alternatives.slice(0, maxAlternatives);
  if (selected.length === 0) {
    return [];
  }

  engine.stop();
  await engine.init();

  const tasks = selected.map((alternative, index) => async () => {
    if (!isValidFen(alternative.fenAfter)) {
      throw new Error(`Invalid FEN for move ${alternative.san}.`);
    }
    const evaluation = await analyzePosition(engine, alternative.fenAfter, depth);
    onProgress?.(index + 1, selected.length);
    const moverScore = scoreForMoverFromEvaluation(
      evaluation,
      moverColor,
      alternative.fenAfter,
    );
    return {
      alternative,
      evaluation,
      scoreCp: moverScore.scoreCp,
      scoreMate: moverScore.scoreMate,
      scoreForMover: moverScore.scoreForMover,
    };
  });

  const raw = await runWithConcurrency(tasks, 1);
  return rankResults(raw);
}

export function formatCompareDelta(deltaFromBestCp: number): string {
  if (deltaFromBestCp === 0) {
    return "0.00";
  }
  const pawns = deltaFromBestCp / 100;
  const sign = pawns > 0 ? "+" : "";
  return `${sign}${pawns.toFixed(2)}`;
}
