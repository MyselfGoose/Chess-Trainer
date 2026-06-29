import type { PlyRange } from "./config";
import { countUserMovesInLine } from "./lines";
import type { TrainingColor, TrainingLine } from "./types";
import { trainingColorToNodeColor } from "./types";

export function userMovePlyIndices(
  line: TrainingLine,
  userColor: TrainingColor,
): number[] {
  const nodeColor = trainingColorToNodeColor(userColor);
  const indices: number[] = [];
  line.moves.forEach((move, index) => {
    if (move.color === nodeColor) {
      indices.push(index);
    }
  });
  return indices;
}

export function isValidPlyRange(
  line: TrainingLine,
  range: PlyRange,
): boolean {
  if (
    !Number.isInteger(range.from) ||
    !Number.isInteger(range.to) ||
    range.from < 0 ||
    range.to < range.from
  ) {
    return false;
  }
  return range.from < line.moves.length;
}

export function sliceLineToPlyRange(
  line: TrainingLine,
  range: PlyRange,
  userColor: TrainingColor,
): TrainingLine | null {
  if (line.moves.length === 0) {
    return null;
  }

  const from = Math.max(0, Math.min(range.from, line.moves.length - 1));
  const to = Math.max(from, Math.min(range.to, line.moves.length - 1));
  const slicedMoves = line.moves.slice(from, to + 1);

  if (slicedMoves.length === 0) {
    return null;
  }

  const startFen = from === 0 ? line.startFen : (line.moves[from - 1]?.fen ?? line.startFen);
  const startParentNodeId = from === 0 ? undefined : line.moves[from - 1]?.id;

  const slicedLine: TrainingLine = {
    ...line,
    startFen,
    moves: slicedMoves,
    startParentNodeId,
    label: `${line.label} (plies ${from + 1}–${to + 1})`,
  };

  if (countUserMovesInLine(slicedLine, userColor) === 0) {
    return null;
  }

  return slicedLine;
}

export function applyPlyRangeToLines(
  lines: TrainingLine[],
  range: PlyRange,
  userColor: TrainingColor,
): TrainingLine[] {
  const sliced: TrainingLine[] = [];
  for (const line of lines) {
    const next = sliceLineToPlyRange(line, range, userColor);
    if (next) {
      sliced.push(next);
    }
  }
  return sliced;
}

export function countLinesAfterPlyRange(
  lines: TrainingLine[],
  range: PlyRange,
  userColor: TrainingColor,
): number {
  return applyPlyRangeToLines(lines, range, userColor).length;
}
