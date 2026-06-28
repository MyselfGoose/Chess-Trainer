import { describe, expect, it, vi } from "vitest";
import type { Square } from "chess.js";

import { parsePgnDatabase } from "@/lib/pgn/parse";
import {
  applyMove,
  createEmptyStudyGame,
  resetNodeCounter,
} from "./treeBuilder";
import {
  cloneSubtree,
  collapseEmptyBranches,
  deleteSubtree,
  findEmptyBranches,
  graftSubtree,
} from "./treeMutations";

function buildMainLine(): ReturnType<typeof createEmptyStudyGame> {
  resetNodeCounter();
  let game = createEmptyStudyGame("Test");
  const rootId = game.rootId;

  const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
  game = e4.game;
  const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
  game = e5.game;
  const nf3 = applyMove(game, e5.nodeId, "g1" as Square, "f3" as Square)!;
  game = nf3.game;

  return game;
}

describe("treeMutations", () => {
  it("deleteSubtree removes a variation branch", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Test");
    const rootId = game.rootId;

    const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
    game = e4.game;
    const c5 = applyMove(game, rootId, "c2" as Square, "c4" as Square)!;
    game = c5.game;

    const variationRoot = c5.nodeId;
    const result = deleteSubtree(game, variationRoot);

    expect(result.deletedNodeIds).toContain(variationRoot);
    expect(result.game.nodes[variationRoot]).toBeUndefined();
    expect(result.game.nodes[rootId].childIds).toEqual([e4.nodeId]);
  });

  it("deleteSubtree refuses to delete root", () => {
    const game = createEmptyStudyGame("Test");
    const result = deleteSubtree(game, game.rootId);

    expect(result.deletedNodeIds).toEqual([]);
    expect(Object.keys(result.game.nodes)).toHaveLength(
      Object.keys(game.nodes).length,
    );
  });

  it("deleteSubtree removes node and all descendants", () => {
    const game = buildMainLine();
    const rootId = game.rootId;
    const e4Id = game.nodes[rootId].childIds[0]!;

    const result = deleteSubtree(game, e4Id);
    expect(result.deletedNodeIds.length).toBeGreaterThan(1);
    expect(result.game.nodes[e4Id]).toBeUndefined();
  });

  it("graftSubtree attaches cloned line with new IDs", () => {
    resetNodeCounter();
    let target = createEmptyStudyGame("Target");
    const targetRoot = target.rootId;
    const te4 = applyMove(target, targetRoot, "e2" as Square, "e4" as Square)!;
    target = te4.game;

    const source = buildMainLine();
    const sourceRoot = source.rootId;
    const sourceE4 = source.nodes[sourceRoot].childIds[0]!;
    const sourceE5 = source.nodes[sourceE4]!.childIds[0]!;

    const result = graftSubtree(target, te4.nodeId, source, sourceE5);
    const attachNode = result.game.nodes[te4.nodeId]!;
    expect(attachNode.childIds.length).toBe(1);

    const graftedRootId = attachNode.childIds[0]!;
    expect(graftedRootId).not.toBe(sourceE5);
    expect(result.game.nodes[graftedRootId]?.san).toBe("e5");
    expect(result.affectedNodeIds).toContain(te4.nodeId);
  });

  it("graftSubtree assigns pathLabels to variations", () => {
    resetNodeCounter();
    let target = createEmptyStudyGame("Target");
    const te4 = applyMove(
      target,
      target.rootId,
      "e2" as Square,
      "e4" as Square,
    )!;
    target = te4.game;

    const source = buildMainLine();
    const sourceE4 = source.nodes[source.rootId].childIds[0]!;

    const result = graftSubtree(target, target.rootId, source, sourceE4);
    const graftedId = result.game.nodes[target.rootId].childIds[1]!;
    expect(result.game.nodes[graftedId]?.pathLabel).toBe("root/alt-2");
  });

  it("cloneSubtree deep copies with new IDs", () => {
    const game = buildMainLine();
    const e4Id = game.nodes[game.rootId].childIds[0]!;

    const cloned = cloneSubtree(game, e4Id);
    expect(cloned.rootId).not.toBe(e4Id);
    expect(Object.keys(cloned.nodes).length).toBeGreaterThan(1);

    for (const id of Object.keys(cloned.nodes)) {
      expect(id).not.toBe(e4Id);
      expect(game.nodes[id]).toBeUndefined();
    }

    const clonedRoot = cloned.nodes[cloned.rootId];
    expect(clonedRoot?.san).toBe("e4");
    expect(clonedRoot?.parentId).toBeNull();
  });

  it("findEmptyBranches finds leaf nodes without annotations", () => {
    const game = buildMainLine();
    const empty = findEmptyBranches(game);
    const leafId = Object.values(game.nodes).find(
      (n) => n.childIds.length === 0 && n.san !== "",
    )?.id;
    expect(leafId).toBeDefined();
    expect(empty).toContain(leafId);
  });

  it("collapseEmptyBranches removes unannotated leaves", () => {
    const game = buildMainLine();
    const beforeCount = Object.keys(game.nodes).length;
    const collapsed = collapseEmptyBranches(game);
    expect(Object.keys(collapsed.nodes).length).toBeLessThan(beforeCount);
  });

  it("handles parsed variation trees", () => {
    const parsed = parsePgnDatabase(`[Event "T"]
1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *
`);
    const game = parsed.games[0]!;
    const rootId = game.rootId;
    const e4Id = game.nodes[rootId].childIds.find(
      (id) => game.nodes[id]?.san === "e4",
    );
    expect(e4Id).toBeDefined();

    const afterE4 = game.nodes[e4Id!];
    const c5Var = afterE4?.childIds.find((id) => game.nodes[id]?.san === "c5");
    expect(c5Var).toBeDefined();

    const result = deleteSubtree(game, c5Var!);
    expect(result.deletedNodeIds.length).toBeGreaterThan(0);
    expect(result.game.nodes[c5Var!]).toBeUndefined();
  });

  it("uses uuid-based IDs for grafted nodes", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "graft-uuid-1234",
    });

    resetNodeCounter();
    let target = createEmptyStudyGame("Target");
    const te4 = applyMove(
      target,
      target.rootId,
      "e2" as Square,
      "e4" as Square,
    )!;
    target = te4.game;

    const source = buildMainLine();
    const sourceE4 = source.nodes[source.rootId].childIds[0]!;

    const result = graftSubtree(target, te4.nodeId, source, sourceE4);
    const graftedId = result.game.nodes[te4.nodeId].childIds[0]!;
    expect(graftedId).toBe("node-graft-uuid-1234");
  });
});
