import { describe, expect, it } from "vitest";

import {
  canRedo,
  canUndo,
  createEmptyUndoStack,
  createSnapshot,
  MAX_UNDO_SNAPSHOTS,
  popRedo,
  popUndo,
  pushSnapshot,
} from "./undoStack";
import { createEmptyStudyGame } from "./treeBuilder";

function snapshot(label: string) {
  const game = createEmptyStudyGame(label);
  return createSnapshot({
    game,
    registeredLeafIds: [],
    currentNodeId: game.rootId,
    tipNodeId: game.rootId,
  });
}

describe("undoStack", () => {
  it("pushes and pops undo snapshots", () => {
    let stack = createEmptyUndoStack();
    const first = snapshot("first");
    stack = pushSnapshot(stack, first);
    expect(canUndo(stack)).toBe(true);

    const current = snapshot("current");
    const result = popUndo(stack, current);
    expect(result?.restored.game.meta.Event).toBe("first");
    expect(canRedo(result!.stack)).toBe(true);
  });

  it("redoes after undo", () => {
    let stack = createEmptyUndoStack();
    stack = pushSnapshot(stack, snapshot("before"));
    const current = snapshot("current");
    const undone = popUndo(stack, current)!;
    const redone = popRedo(undone.stack, undone.restored)!;
    expect(redone.restored.game.meta.Event).toBe("current");
  });

  it("clears redo on new push", () => {
    let stack = createEmptyUndoStack();
    stack = pushSnapshot(stack, snapshot("a"));
    const undone = popUndo(stack, snapshot("b"))!;
    stack = pushSnapshot(undone.stack, snapshot("c"));
    expect(canRedo(stack)).toBe(false);
  });

  it("caps undo stack at MAX_UNDO_SNAPSHOTS", () => {
    let stack = createEmptyUndoStack();
    for (let i = 0; i < MAX_UNDO_SNAPSHOTS + 5; i += 1) {
      stack = pushSnapshot(stack, snapshot(`s${i}`));
    }
    expect(stack.undo).toHaveLength(MAX_UNDO_SNAPSHOTS);
  });
});
