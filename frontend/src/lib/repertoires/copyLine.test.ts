import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import {
  applyMove,
  createEmptyStudyGame,
  resetNodeCounter,
} from "./treeBuilder";
import {
  checkGraftFenMatch,
  copyLineToGame,
  CopyLineError,
  previewCopyLineSan,
  resolveSourceRootChildId,
} from "./copyLine";

function buildD4Line(): ReturnType<typeof createEmptyStudyGame> {
  resetNodeCounter();
  let game = createEmptyStudyGame("QGD");
  const rootId = game.rootId;
  const d4 = applyMove(game, rootId, "d2" as Square, "d4" as Square)!;
  game = d4.game;
  const d5 = applyMove(game, d4.nodeId, "d7" as Square, "d5" as Square)!;
  game = d5.game;
  const c4 = applyMove(game, d5.nodeId, "c2" as Square, "c4" as Square)!;
  game = c4.game;
  return game;
}

function buildE4Position(): {
  game: ReturnType<typeof createEmptyStudyGame>;
  attachId: string;
} {
  resetNodeCounter();
  let game = createEmptyStudyGame("Target");
  const e4 = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
  game = e4.game;
  return { game, attachId: e4.nodeId };
}

describe("copyLine", () => {
  it("resolves the first move on a source line", () => {
    const source = buildD4Line();
    const leafId = Object.values(source.nodes).find(
      (node) => node.san === "c4",
    )!.id;
    const rootChild = resolveSourceRootChildId(source, leafId);
    expect(source.nodes[rootChild!]?.san).toBe("d4");
  });

  it("grafts onto matching FEN at root", () => {
    const source = buildD4Line();
    const target = createEmptyStudyGame("Target");
    const leafId = Object.values(source.nodes).find(
      (node) => node.childIds.length === 0 && node.san === "c4",
    )!.id;

    const result = copyLineToGame({
      sourceGame: source,
      sourceLeafNodeId: leafId,
      targetGame: target,
      attachAtNodeId: target.rootId,
    });

    const root = result.game.nodes[target.rootId];
    expect(root.childIds.length).toBe(1);
    expect(previewCopyLineSan({
      sourceGame: source,
      sourceLeafNodeId: leafId,
      targetGame: target,
      attachAtNodeId: target.rootId,
    })).toContain("d4");
  });

  it("grafts as a variation when attach node has children", () => {
    const source = buildD4Line();
    const { game: target, attachId } = buildE4Position();
    const leafId = Object.values(source.nodes).find(
      (node) => node.san === "c4",
    )!.id;

    expect(
      checkGraftFenMatch({
        sourceGame: source,
        sourceLeafNodeId: leafId,
        targetGame: target,
        attachAtNodeId: attachId,
      }).ok,
    ).toBe(false);
  });

  it("blocks FEN mismatch", () => {
    const source = buildD4Line();
    const { game: target, attachId } = buildE4Position();
    const leafId = Object.values(source.nodes).find(
      (node) => node.san === "c4",
    )!.id;

    const check = checkGraftFenMatch({
      sourceGame: source,
      sourceLeafNodeId: leafId,
      targetGame: target,
      attachAtNodeId: attachId,
    });
    expect(check.ok).toBe(false);

    expect(() =>
      copyLineToGame({
        sourceGame: source,
        sourceLeafNodeId: leafId,
        targetGame: target,
        attachAtNodeId: attachId,
      }),
    ).toThrow(CopyLineError);
  });

  it("regenerates grafted node IDs", () => {
    const source = buildD4Line();
    const target = createEmptyStudyGame("Target");
    const leafId = Object.values(source.nodes).find(
      (node) => node.san === "c4",
    )!.id;
    const result = copyLineToGame({
      sourceGame: source,
      sourceLeafNodeId: leafId,
      targetGame: target,
      attachAtNodeId: target.rootId,
    });
    const graftedIds = result.affectedNodeIds.filter((id) => id !== target.rootId);
    for (const graftedId of graftedIds) {
      expect(source.nodes[graftedId]).toBeUndefined();
    }
    expect(graftedIds.length).toBeGreaterThan(0);
  });
});
