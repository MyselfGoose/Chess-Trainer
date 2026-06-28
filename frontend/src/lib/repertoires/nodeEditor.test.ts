import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import {
  removeRegisteredLeaves,
  updateNodeAnnotations,
  updateNodeComment,
} from "./nodeEditor";
import { applyMove, createEmptyStudyGame, resetNodeCounter } from "./treeBuilder";

describe("nodeEditor", () => {
  it("updates node comment immutably", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Test");
    const rootId = game.rootId;
    const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
    game = e4.game;

    const updated = updateNodeComment(game, e4.nodeId, "  King's pawn  ");
    expect(updated.nodes[e4.nodeId]?.comment).toBe("King's pawn");
    expect(game.nodes[e4.nodeId]?.comment).toBeUndefined();
  });

  it("clears comment when empty", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Test");
    const rootId = game.rootId;
    const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
    game = updateNodeComment(e4.game, e4.nodeId, "note");
    const cleared = updateNodeComment(game, e4.nodeId, "   ");
    expect(cleared.nodes[e4.nodeId]?.comment).toBeUndefined();
  });

  it("updates node arrows and squares", () => {
    resetNodeCounter();
    const game = createEmptyStudyGame("Test");
    const rootId = game.rootId;
    const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;

    const updated = updateNodeAnnotations(
      e4.game,
      e4.nodeId,
      [{ from: "e2", to: "e4", color: "G" }],
      [{ square: "e4", color: "Y" }],
    );
    expect(updated.nodes[e4.nodeId]?.arrows).toHaveLength(1);
    expect(updated.nodes[e4.nodeId]?.squares).toHaveLength(1);
  });

  it("removes registered leaves in deleted subtree", () => {
    expect(removeRegisteredLeaves(["a", "b", "c"], ["b", "d"])).toEqual([
      "a",
      "c",
    ]);
  });
});
