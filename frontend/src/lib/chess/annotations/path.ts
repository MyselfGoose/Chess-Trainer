import type { Square } from "chess.js";

import { parseSquare, toSquare } from "./coordinates";

export function isOrthogonalStep(a: Square, b: Square): boolean {
  const pa = parseSquare(a);
  const pb = parseSquare(b);
  const fileDiff = Math.abs(pa.file - pb.file);
  const rankDiff = Math.abs(pa.rank - pb.rank);
  return (fileDiff === 1 && rankDiff === 0) || (fileDiff === 0 && rankDiff === 1);
}

/** @deprecated Use {@link isOrthogonalStep}. */
export const isOrthogonalNeighbor = isOrthogonalStep;

function isKnightMove(orig: Square, dest: Square): boolean {
  const o = parseSquare(orig);
  const d = parseSquare(dest);
  const fileDiff = Math.abs(o.file - d.file);
  const rankDiff = Math.abs(o.rank - d.rank);
  return fileDiff * rankDiff === 2;
}

/** Same rank, file, or diagonal — always rendered as a straight arrow on chess.com. */
export function isAligned(orig: Square, dest: Square): boolean {
  const o = parseSquare(orig);
  const d = parseSquare(dest);
  return (
    o.file === d.file ||
    o.rank === d.rank ||
    Math.abs(o.file - d.file) === Math.abs(o.rank - d.rank)
  );
}

function knightCornerOptions(orig: Square, dest: Square): [Square, Square] {
  const o = parseSquare(orig);
  const d = parseSquare(dest);
  const cornerA = toSquare(o.file, d.rank);
  const cornerB = toSquare(d.file, o.rank);
  return [cornerA, cornerB];
}

/**
 * Pick the L-path corner for a knight arrow.
 * Uses squares the pointer passed over during drag — never a full squiggly trail.
 */
function pickKnightCorner(
  orig: Square,
  dest: Square,
  visited: Square[],
): Square {
  const [cornerA, cornerB] = knightCornerOptions(orig, dest);
  let lastCorner: Square | null = null;
  for (const square of visited) {
    if (square === cornerA || square === cornerB) {
      lastCorner = square;
    }
  }
  if (lastCorner) {
    return lastCorner;
  }

  const o = parseSquare(orig);
  const d = parseSquare(dest);
  const fileDiff = Math.abs(o.file - d.file);
  const rankDiff = Math.abs(o.rank - d.rank);
  return fileDiff > rankDiff ? cornerB : cornerA;
}

/** Remove duplicate consecutive squares and backtracking. */
export function simplifyDragPath(path: Square[]): Square[] {
  if (path.length === 0) {
    return [];
  }
  const result: Square[] = [path[0]!];
  for (let i = 1; i < path.length; i++) {
    const square = path[i]!;
    const last = result[result.length - 1]!;
    if (square === last) {
      continue;
    }
    if (result.length >= 2 && square === result[result.length - 2]) {
      result.pop();
      continue;
    }
    result.push(square);
  }
  return result;
}

/** Collapse collinear intermediates on an orthogonal path. */
export function collapseCollinear(path: Square[]): Square[] {
  if (path.length <= 2) {
    return path;
  }
  const result: Square[] = [path[0]!];
  for (let i = 1; i < path.length - 1; i++) {
    const prev = result[result.length - 1]!;
    const current = path[i]!;
    const next = path[i + 1]!;
    const a = parseSquare(prev);
    const b = parseSquare(current);
    const c = parseSquare(next);
    const sameFile = a.file === b.file && b.file === c.file;
    const sameRank = a.rank === b.rank && b.rank === c.rank;
    if (sameFile || sameRank) {
      continue;
    }
    result.push(current);
  }
  result.push(path[path.length - 1]!);
  return result;
}

/**
 * Build the final arrow path using chess.com rules:
 * - Rank/file/diagonal → straight line (ignore drag wiggles)
 * - Knight move → single L-bend (at most one corner)
 * - Everything else → straight line between square centers
 */
export function buildArrowPath(
  orig: Square,
  dest: Square,
  visited: Square[] = [],
): Square[] {
  if (orig === dest) {
    return [orig];
  }

  if (isAligned(orig, dest)) {
    return [orig, dest];
  }

  if (isKnightMove(orig, dest)) {
    const corner = pickKnightCorner(orig, dest, visited);
    if (corner === orig || corner === dest) {
      return [orig, dest];
    }
    return [orig, corner, dest];
  }

  return [orig, dest];
}

export function arrowEndpoints(path: Square[]): { orig: Square; dest: Square } {
  return {
    orig: path[0]!,
    dest: path[path.length - 1]!,
  };
}

/** @deprecated Drag trails are no longer used; arrows snap to chess.com rules. */
export function extendDragPath(
  path: Square[],
  orig: Square,
  square: Square,
): Square[] {
  if (path.length === 0) {
    return [orig, square];
  }
  return [orig, square];
}

/** @deprecated Use {@link extendDragPath}. */
export const appendToDragPath = extendDragPath;
