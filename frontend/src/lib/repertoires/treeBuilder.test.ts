import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import {
  applyMove,
  createEmptyStudyGame,
  getRegisteredLines,
  registerLine,
  resetNodeCounter,
  undoLastMove,
} from "./treeBuilder";

describe("treeBuilder", () => {
  it("creates an empty study game with a root node", () => {
    resetNodeCounter();
    const game = createEmptyStudyGame("My opening");
    expect(game.meta.Event).toBe("My opening");
    expect(game.nodes[game.rootId].childIds).toEqual([]);
  });

  it("applies moves and creates variations", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Test");
    const rootId = game.rootId;

    const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square);
    expect(e4?.created).toBe(true);
    game = e4!.game;

    const e5 = applyMove(game, e4!.nodeId, "e7" as Square, "e5" as Square);
    expect(e5?.created).toBe(true);
    game = e5!.game;

    const c5 = applyMove(game, rootId, "c2" as Square, "c4" as Square);
    expect(c5?.created).toBe(true);
    game = c5!.game;
    expect(game.nodes[rootId].childIds).toHaveLength(2);
    expect(game.nodes[c5!.nodeId].isVariation).toBe(true);
  });

  it("navigates to existing child for duplicate moves", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Test");
    const rootId = game.rootId;

    const first = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
    game = first.game;
    const second = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;

    expect(second.created).toBe(false);
    expect(second.nodeId).toBe(first.nodeId);
  });

  it("registers lines at leaves", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Test");
    const rootId = game.rootId;

    const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
    game = e4.game;
    const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
    game = e5.game;

    const registered = registerLine(game, e5.nodeId, []);
    expect(registered.ok).toBe(true);
    if (registered.ok) {
      const lines = getRegisteredLines(game, registered.registeredLeafIds);
      expect(lines[0].moves).toEqual(["e4", "e5"]);
    }
  });

  it("undoes the last move on a leaf", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Test");
    const rootId = game.rootId;

    const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
    game = e4.game;
    const undone = undoLastMove(game, e4.nodeId);
    expect(undone?.nodeId).toBe(rootId);
    expect(undone?.game.nodes[rootId].childIds).toEqual([]);
  });
});
