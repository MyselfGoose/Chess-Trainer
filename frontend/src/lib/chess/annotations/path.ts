import type { Square } from "chess.js";

import { parseSquare, toSquare } from "./coordinates";

function isKnightMove(orig: Square, dest: Square): boolean {
  const o = parseSquare(orig);
  const d = parseSquare(dest);
  const fileDiff = Math.abs(o.file - d.file);
  const rankDiff = Math.abs(o.rank - d.rank);
  return fileDiff * rankDiff === 2;
}

function isAligned(orig: Square, dest: Square): boolean {
  const o = parseSquare(orig);
  const d = parseSquare(dest);
  return o.file === d.file || o.rank === d.rank || Math.abs(o.file - d.file) === Math.abs(o.rank - d.rank);
}

function knightCornerOptions(orig: Square, dest: Square): [Square, Square] {
  const o = parseSquare(orig);
  const d = parseSquare(dest);
  const cornerA = toSquare(o.file, d.rank);
  const cornerB = toSquare(d.file, o.rank);
  return [cornerA, cornerB];
}

function pickKnightCorner(
  orig: Square,
  dest: Square,
  dragPath: Square[],
): Square {
  const [cornerA, cornerB] = knightCornerOptions(orig, dest);
  const pathSet = new Set(dragPath);
  if (pathSet.has(cornerA) && !pathSet.has(cornerB)) {
    return cornerA;
  }
  if (pathSet.has(cornerB) && !pathSet.has(cornerA)) {
    return cornerB;
  }

  const lastIntermediate = dragPath.length >= 2 ? dragPath[dragPath.length - 2] : null;
  if (lastIntermediate === cornerA) {
    return cornerA;
  }
  if (lastIntermediate === cornerB) {
    return cornerB;
  }

  const o = parseSquare(orig);
  const d = parseSquare(dest);
  const fileDiff = Math.abs(o.file - d.file);
  const rankDiff = Math.abs(o.rank - d.rank);
  return fileDiff > rankDiff ? cornerB : cornerA;
}

function buildKnightPath(orig: Square, dest: Square, dragPath: Square[]): Square[] {
  const corner = pickKnightCorner(orig, dest, dragPath);
  if (corner === orig) {
    return [orig, dest];
  }
  return [orig, corner, dest];
}

function isOrthogonalStep(a: Square, b: Square): boolean {
  const p = parseSquare(a);
  const q = parseSquare(b);
  const fileDiff = Math.abs(p.file - q.file);
  const rankDiff = Math.abs(p.rank - q.rank);
  return (fileDiff === 1 && rankDiff === 0) || (fileDiff === 0 && rankDiff === 1);
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

function isValidOrthogonalPath(path: Square[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    if (!isOrthogonalStep(path[i]!, path[i + 1]!)) {
      return false;
    }
  }
  return true;
}

export function buildArrowPath(
  orig: Square,
  dest: Square,
  dragPath: Square[],
): Square[] {
  if (orig === dest) {
    return [orig];
  }

  const simplified = simplifyDragPath(dragPath);
  const startsAtOrig = simplified[0] === orig;
  const endsAtDest = simplified[simplified.length - 1] === dest;

  if (
    simplified.length >= 3 &&
    startsAtOrig &&
    endsAtDest &&
    isValidOrthogonalPath(simplified)
  ) {
    return collapseCollinear(simplified);
  }

  if (isKnightMove(orig, dest)) {
    return buildKnightPath(orig, dest, simplified);
  }

  if (isAligned(orig, dest)) {
    return [orig, dest];
  }

  if (simplified.length >= 2 && startsAtOrig && endsAtDest) {
    const collapsed = collapseCollinear(simplified);
    if (isValidOrthogonalPath(collapsed)) {
      return collapsed;
    }
  }

  return [orig, dest];
}

export function arrowEndpoints(path: Square[]): { orig: Square; dest: Square } {
  return {
    orig: path[0]!,
    dest: path[path.length - 1]!,
  };
}
