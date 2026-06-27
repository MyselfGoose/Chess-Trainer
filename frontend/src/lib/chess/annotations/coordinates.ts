import type { Square } from "chess.js";

export type BoardOrientation = "white" | "black";

export interface Point {
  x: number;
  y: number;
}

const FILES = "abcdefgh";

export function parseSquare(square: Square): { file: number; rank: number } {
  const file = FILES.indexOf(square[0] ?? "");
  const rank = Number(square[1]) - 1;
  return { file, rank };
}

export function toSquare(file: number, rank: number): Square {
  return `${FILES[file]}${rank + 1}` as Square;
}

function orientPos(
  file: number,
  rank: number,
  orientation: BoardOrientation,
): { file: number; rank: number } {
  if (orientation === "white") {
    return { file, rank };
  }
  return { file: 7 - file, rank: 7 - rank };
}

/** Normalized board coordinates: center of square in 0–8 space (chessground-compatible). */
export function squareToPoint(
  square: Square,
  orientation: BoardOrientation,
): Point {
  const { file, rank } = parseSquare(square);
  const oriented = orientPos(file, rank, orientation);
  const xScale = 1;
  const yScale = 1;
  return {
    x: (oriented.file - 3.5) * xScale,
    y: (3.5 - oriented.rank) * yScale,
  };
}

export function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) {
    return "";
  }
  const [first, ...rest] = points;
  const start = `${first!.x},${first!.y}`;
  if (rest.length === 0) {
    return `M ${start}`;
  }
  return `M ${start} ${rest.map((p) => `L ${p.x},${p.y}`).join(" ")}`;
}

export function getKeyAtClientPos(
  clientX: number,
  clientY: number,
  bounds: DOMRect,
  orientation: BoardOrientation,
): Square | null {
  const relX = clientX - bounds.left;
  const relY = clientY - bounds.top;
  let file = Math.floor((8 * relX) / bounds.width);
  let rank = 7 - Math.floor((8 * relY) / bounds.height);
  if (orientation === "black") {
    file = 7 - file;
    rank = 7 - rank;
  }
  if (file < 0 || file > 7 || rank < 0 || rank > 7) {
    return null;
  }
  return toSquare(file, rank);
}
