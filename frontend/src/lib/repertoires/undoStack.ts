import type { StudyGame } from "@/lib/pgn";

export interface BuilderSnapshot {
  game: StudyGame;
  registeredLeafIds: string[];
  currentNodeId: string;
  tipNodeId: string;
}

export interface UndoStackState {
  undo: BuilderSnapshot[];
  redo: BuilderSnapshot[];
}

export const MAX_UNDO_SNAPSHOTS = 20;

export function createEmptyUndoStack(): UndoStackState {
  return { undo: [], redo: [] };
}

export function createSnapshot(state: BuilderSnapshot): BuilderSnapshot {
  return structuredClone(state);
}

export function pushSnapshot(
  stack: UndoStackState,
  snapshot: BuilderSnapshot,
): UndoStackState {
  const nextUndo = [...stack.undo, createSnapshot(snapshot)];
  if (nextUndo.length > MAX_UNDO_SNAPSHOTS) {
    nextUndo.shift();
  }
  return {
    undo: nextUndo,
    redo: [],
  };
}

export function canUndo(stack: UndoStackState): boolean {
  return stack.undo.length > 0;
}

export function canRedo(stack: UndoStackState): boolean {
  return stack.redo.length > 0;
}

export function popUndo(
  stack: UndoStackState,
  current: BuilderSnapshot,
): { stack: UndoStackState; restored: BuilderSnapshot } | null {
  if (stack.undo.length === 0) {
    return null;
  }
  const undo = [...stack.undo];
  const restored = undo.pop()!;
  return {
    stack: {
      undo,
      redo: [...stack.redo, createSnapshot(current)],
    },
    restored,
  };
}

export function popRedo(
  stack: UndoStackState,
  current: BuilderSnapshot,
): { stack: UndoStackState; restored: BuilderSnapshot } | null {
  if (stack.redo.length === 0) {
    return null;
  }
  const redo = [...stack.redo];
  const restored = redo.pop()!;
  return {
    stack: {
      undo: [...stack.undo, createSnapshot(current)],
      redo,
    },
    restored,
  };
}
