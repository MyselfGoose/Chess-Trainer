import { describe, expect, it } from "vitest";

import { createEmptyStudyGame } from "@/lib/repertoires/treeBuilder";
import { applyMove } from "@/lib/repertoires/treeBuilder";

import { indexLines, searchLines } from "./lineSearch";

describe("lineSearch", () => {
  it("indexes leaf paths with SAN labels", () => {
    let game = createEmptyStudyGame("Test");
    game = applyMove(game, game.rootId, "e2", "e4").game;
    const afterE4 = game.nodes[game.rootId]?.childIds[0];
    if (!afterE4) {
      throw new Error("missing e4 node");
    }
    game = applyMove(game, afterE4, "e7", "e5").game;

    const index = indexLines(game);
    expect(index.length).toBeGreaterThanOrEqual(1);
    expect(index[0]?.label.toLowerCase()).toContain("e4");
  });

  it("finds lines containing Nf3", () => {
    const index: ReturnType<typeof indexLines> = [
      { leafNodeId: "a", label: "1. e4 e5 2. Nf3 Nc6", moveCount: 4 },
      { leafNodeId: "b", label: "1. d4 d5 2. c4", moveCount: 3 },
    ];
    const results = searchLines(index, "nf3");
    expect(results).toHaveLength(1);
    expect(results[0]?.leafNodeId).toBe("a");
  });

  it("returns nothing for empty query", () => {
    const index = [{ leafNodeId: "a", label: "1. e4", moveCount: 1 }];
    expect(searchLines(index, "")).toEqual([]);
    expect(searchLines(index, "   ")).toEqual([]);
  });

  it("ranks prefix matches higher", () => {
    const index = [
      { leafNodeId: "a", label: "1. e4 c5 2. Nf3", moveCount: 3 },
      { leafNodeId: "b", label: "1. d4 Nf6", moveCount: 2 },
    ];
    const results = searchLines(index, "1. e4");
    expect(results[0]?.leafNodeId).toBe("a");
  });
});
