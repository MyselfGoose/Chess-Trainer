import type { Square } from "chess.js";

export interface PlayHistoryEntry {
  fen: string;
  lastMove: [Square, Square] | null;
}

export function createInitialHistory(fen: string): PlayHistoryEntry[] {
  return [{ fen, lastMove: null }];
}

export function appendHistoryEntry(
  history: PlayHistoryEntry[],
  currentIndex: number,
  entry: PlayHistoryEntry,
): { history: PlayHistoryEntry[]; currentIndex: number } {
  const truncated = history.slice(0, currentIndex + 1);
  return {
    history: [...truncated, entry],
    currentIndex: truncated.length,
  };
}

export function canStepBack(currentIndex: number): boolean {
  return currentIndex > 0;
}

export function canStepForward(
  history: PlayHistoryEntry[],
  currentIndex: number,
): boolean {
  return currentIndex < history.length - 1;
}

export function canJumpToStart(currentIndex: number): boolean {
  return currentIndex > 0;
}

export function canJumpToEnd(
  history: PlayHistoryEntry[],
  currentIndex: number,
): boolean {
  return currentIndex < history.length - 1;
}
