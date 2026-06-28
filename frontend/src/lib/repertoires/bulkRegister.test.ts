import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import {
  applyMove,
  createEmptyStudyGame,
  registerLine,
  resetNodeCounter,
} from "./treeBuilder";
import {
  applyBulkRegister,
  findLeavesAtMaxDepth,
  mergeRegisteredLeaves,
  previewBulkRegister,
} from "./bulkRegister";

function buildBranchingGame(): ReturnType<typeof createEmptyStudyGame> {
  resetNodeCounter();
  let game = createEmptyStudyGame("Branch");
  const rootId = game.rootId;
  const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
  game = e4.game;
  const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
  game = e5.game;
  const nf3 = applyMove(game, e5.nodeId, "g1" as Square, "f3" as Square)!;
  game = nf3.game;
  const nc6Main = applyMove(game, nf3.nodeId, "b8" as Square, "c6" as Square)!;
  game = nc6Main.game;
  const bc4 = applyMove(game, e5.nodeId, "f1" as Square, "c4" as Square)!;
  game = bc4.game;
  const nc6Alt = applyMove(game, bc4.nodeId, "b8" as Square, "c6" as Square)!;
  game = nc6Alt.game;
  return game;
}

describe("bulkRegister", () => {
  it("finds leaves at or below max ply", () => {
    const game = buildBranchingGame();
    const shallow = findLeavesAtMaxDepth(game, 2);
    const all = findLeavesAtMaxDepth(game, 20);
    expect(shallow.length).toBe(0);
    expect(all.length).toBe(2);
  });

  it("excludes leaves deeper than max ply", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Deep");
    const rootId = game.rootId;
    const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
    game = e4.game;
    const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
    game = e5.game;
    const nf3 = applyMove(game, e5.nodeId, "g1" as Square, "f3" as Square)!;
    game = nf3.game;
    const nc6 = applyMove(game, nf3.nodeId, "b8" as Square, "c6" as Square)!;
    game = nc6.game;

    expect(findLeavesAtMaxDepth(game, 3)).toHaveLength(0);
    expect(findLeavesAtMaxDepth(game, 4)).toHaveLength(1);
  });

  it("dedupes registered leaves", () => {
    expect(mergeRegisteredLeaves(["a", "b"], ["b", "c"])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("previews already registered leaves", () => {
    const game = buildBranchingGame();
    const leaves = findLeavesAtMaxDepth(game, 20);
    const first = leaves[0]!;
    const registerResult = registerLine(game, first, []);
    expect(registerResult.ok).toBe(true);
    if (!registerResult.ok) {
      return;
    }
    const preview = previewBulkRegister(game, registerResult.registeredLeafIds, 20);
    expect(preview.alreadyRegistered).toContain(first);
    expect(preview.toRegister.length).toBe(1);
  });

  it("returns no leaves for max ply 0", () => {
    const game = buildBranchingGame();
    expect(findLeavesAtMaxDepth(game, 0)).toEqual([]);
  });

  it("applies bulk register and returns added count", () => {
    const game = buildBranchingGame();
    const result = applyBulkRegister(game, [], 20);
    expect(result.addedCount).toBe(2);
    expect(result.registeredLeafIds).toHaveLength(2);
  });
});
