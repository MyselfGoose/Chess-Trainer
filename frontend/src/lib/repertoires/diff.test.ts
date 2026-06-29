import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import { forkRepertoire } from "./fork";
import { DEFAULT_REPERTOIRE_META } from "./meta";
import {
  applyMove,
  createEmptyStudyGame,
  resetNodeCounter,
} from "./treeBuilder";
import type { Repertoire } from "./types";
import { diffRepertoires, hasRepertoireDiff, linePathKey } from "./diff";

function buildRepertoireWithBranch(): Repertoire {
  resetNodeCounter();
  let game = createEmptyStudyGame("Main");
  const e4 = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
  game = e4.game;
  const c5 = applyMove(game, e4.nodeId, "c7" as Square, "c5" as Square)!;
  game = c5.game;
  c5.game.nodes[c5.nodeId] = {
    ...c5.game.nodes[c5.nodeId]!,
    comment: "Sicilian main",
  };

  return {
    id: "rep-diff",
    name: "Diff Test",
    source: "imported",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    games: [game],
    registeredLeafIds: [],
    meta: { ...DEFAULT_REPERTOIRE_META },
  };
}

describe("diffRepertoires", () => {
  it("detects no differences for identical repertoires", () => {
    const repertoire = buildRepertoireWithBranch();
    const diff = diffRepertoires(repertoire, structuredClone(repertoire));
    expect(hasRepertoireDiff(diff)).toBe(false);
  });

  it("detects changed comments on same path", () => {
    const before = buildRepertoireWithBranch();
    const after = structuredClone(before);
    const leafId = after.games[0]!.nodes[after.games[0]!.rootId]!.childIds[0]!;
    const c5Id = after.games[0]!.nodes[leafId]!.childIds[0]!;
    after.games[0]!.nodes[c5Id] = {
      ...after.games[0]!.nodes[c5Id]!,
      comment: "Updated note",
    };

    const diff = diffRepertoires(before, after);
    expect(diff.changedComments).toHaveLength(1);
    expect(diff.changedComments[0]?.before).toBe("Sicilian main");
    expect(diff.changedComments[0]?.after).toBe("Updated note");
  });

  it("detects added and removed lines", () => {
    const before = buildRepertoireWithBranch();
    const after = structuredClone(before);
    const e4Id = after.games[0]!.nodes[after.games[0]!.rootId]!.childIds[0]!;
    const e5 = applyMove(after.games[0]!, e4Id, "e7" as Square, "e5" as Square)!;
    after.games[0] = e5.game;

    const diff = diffRepertoires(before, after);
    expect(diff.addedLines.length).toBeGreaterThan(0);
    expect(diff.removedLines).toHaveLength(0);
  });

  it("diffs fork parent vs child when lines are registered", () => {
    const parent = buildRepertoireWithBranch();
    const child = forkRepertoire(parent, {
      name: "Forked",
      registerLines: "all",
    });
    const diff = diffRepertoires(parent, child);
    expect(hasRepertoireDiff(diff)).toBe(false);
  });

  it("builds stable path keys", () => {
    const repertoire = buildRepertoireWithBranch();
    const lines = repertoire.games[0]!;
    const e4Id = lines.nodes[lines.rootId]!.childIds[0]!;
    const c5Id = lines.nodes[e4Id]!.childIds[0]!;
    const path = linePathKey({
      id: "0:x",
      gameIndex: 0,
      leafNodeId: c5Id,
      startFen: "",
      label: "1. e4 c5",
      moves: [lines.nodes[e4Id]!, lines.nodes[c5Id]!],
    });
    expect(path).toBe("e4 c5");
  });
});
