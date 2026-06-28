import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import { computePruneImpact, pruneSubtree } from "./pruneImpact";
import {
  applyMove,
  createEmptyStudyGame,
  registerLine,
  resetNodeCounter,
} from "./treeBuilder";

describe("pruneImpact", () => {
  it("returns null for root delete", () => {
    const game = createEmptyStudyGame("Test");
    expect(computePruneImpact(game, game.rootId, [])).toBeNull();
  });

  it("counts positions and registered lines", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Test");
    const rootId = game.rootId;
    const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
    game = e4.game;
    const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
    game = e5.game;
    const c5 = applyMove(game, rootId, "c2" as Square, "c4" as Square)!;
    game = c5.game;

    const reg = registerLine(game, e5.nodeId, []);
    const registeredLeafIds = reg.ok ? reg.registeredLeafIds : [];

    const impact = computePruneImpact(game, c5.nodeId, registeredLeafIds)!;
    expect(impact.positionCount).toBe(1);
    expect(impact.registeredLineCount).toBe(0);

    const impactMain = computePruneImpact(game, e5.nodeId, registeredLeafIds)!;
    expect(impactMain.positionCount).toBeGreaterThan(0);
    expect(impactMain.registeredLineCount).toBe(1);
  });

  it("pruneSubtree removes nodes and registered leaves", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Test");
    const rootId = game.rootId;
    const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
    game = e4.game;
    const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
    game = e5.game;
    const reg = registerLine(game, e5.nodeId, []);
    const registeredLeafIds = reg.ok ? reg.registeredLeafIds : [];

    const result = pruneSubtree(game, e5.nodeId, registeredLeafIds)!;
    expect(result.deletedNodeIds).toContain(e5.nodeId);
    expect(result.registeredLeafIds).toEqual([]);
    expect(result.game.nodes[e5.nodeId]).toBeUndefined();
  });
});
