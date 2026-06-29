import type { LineMastery } from "./mastery";
import { countUserMovesInLine } from "./lines";
import type { TrainingColor, TrainingLine, TrainingLineResult } from "./types";
import { trainingColorToNodeColor } from "./types";

/**
 * Failure-point drill: start at the parent of the ply where the user failed,
 * training only the suffix from that move onward.
 */
export function failurePlyFromResult(
  result: TrainingLineResult,
): number | null {
  if (result.passed || result.failedAtPly === undefined) {
    return null;
  }
  if (!Number.isInteger(result.failedAtPly) || result.failedAtPly < 0) {
    return null;
  }
  return result.failedAtPly;
}

export function failurePlyFromMastery(
  mastery: LineMastery | undefined,
): number | null {
  if (!mastery || mastery.failedAtPly === undefined) {
    return null;
  }
  if (!Number.isInteger(mastery.failedAtPly) || mastery.failedAtPly < 0) {
    return null;
  }
  return mastery.failedAtPly;
}

export function buildFailureDrillLine(
  line: TrainingLine,
  failPly: number,
  userColor: TrainingColor,
): TrainingLine | null {
  if (
    !Number.isInteger(failPly) ||
    failPly < 0 ||
    failPly >= line.moves.length
  ) {
    return null;
  }

  const slicedMoves = line.moves.slice(failPly);
  const userNodeColor = trainingColorToNodeColor(userColor);
  const hasUserMoves = slicedMoves.some((move) => move.color === userNodeColor);
  if (!hasUserMoves) {
    return null;
  }

  const startFen =
    failPly === 0 ? line.startFen : (line.moves[failPly - 1]?.fen ?? line.startFen);
  const startParentNodeId =
    failPly === 0 ? undefined : line.moves[failPly - 1]?.id;

  const drillLine: TrainingLine = {
    ...line,
    startFen,
    moves: slicedMoves,
    startParentNodeId,
    label: `${line.label} (from ply ${failPly + 1})`,
  };

  if (countUserMovesInLine(drillLine, userColor) === 0) {
    return null;
  }

  return drillLine;
}

export function applyFailureDrillToLines(
  lines: TrainingLine[],
  userColor: TrainingColor,
  masteryByLine: Map<string, LineMastery>,
): TrainingLine[] {
  const drilled: TrainingLine[] = [];
  for (const line of lines) {
    const failPly = failurePlyFromMastery(masteryByLine.get(line.id));
    if (failPly === null) {
      continue;
    }
    const drillLine = buildFailureDrillLine(line, failPly, userColor);
    if (drillLine) {
      drilled.push(drillLine);
    }
  }
  return drilled;
}

export function linesWithFailurePly(
  results: TrainingLineResult[],
): TrainingLineResult[] {
  return results.filter((result) => failurePlyFromResult(result) !== null);
}
