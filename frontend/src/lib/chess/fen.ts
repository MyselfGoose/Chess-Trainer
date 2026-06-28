import { Chess } from "chess.js";

/** Strip halfmove and fullmove counters for position comparison. */
export function normalizeFen(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  return parts.slice(0, 4).join(" ");
}

/** Map key for position lookup — normalized FEN without clock counters. */
export function fenKey(fen: string): string {
  return normalizeFen(fen);
}

export function isValidFen(fen: string): boolean {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}
