import { describe, expect, it, vi } from "vitest";
import type { Square } from "chess.js";

import { forkRepertoire, cloneStudyGame } from "./fork";
import { parsePgnDatabase } from "@/lib/pgn/parse";
import {
  applyMove,
  createEmptyStudyGame,
  resetNodeCounter,
} from "./treeBuilder";
import type { Repertoire } from "./types";
import { DEFAULT_REPERTOIRE_META } from "./meta";

function makeImportedRepertoire(games: Repertoire["games"]): Repertoire {
  return {
    id: "imported-1",
    name: "Sicilian",
    source: "imported",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    games,
    registeredLeafIds: [],
    meta: { ...DEFAULT_REPERTOIRE_META },
  };
}

describe("forkRepertoire", () => {
  it("clones study game with new node IDs", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Test");
    const e4 = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
    game = e4.game;

    const { game: cloned, idMap } = cloneStudyGame(game);
    expect(cloned.rootId).not.toBe(game.rootId);
    expect(idMap.get(e4.nodeId)).not.toBe(e4.nodeId);
    expect(Object.keys(cloned.nodes).length).toBe(
      Object.keys(game.nodes).length,
    );
    expect(cloned.nodes[cloned.rootId]?.childIds.length).toBe(1);
  });

  it("forks imported repertoire as created with forkedFromId", () => {
    resetNodeCounter();
    const game = createEmptyStudyGame("Test");
    const source = makeImportedRepertoire([game]);

    const forked = forkRepertoire(source, {
      name: "Sicilian (editable)",
      registerLines: "none",
    });

    expect(forked.source).toBe("created");
    expect(forked.meta.forkedFromId).toBe("imported-1");
    expect(forked.registeredLeafIds).toEqual([]);
    expect(forked.id).not.toBe(source.id);
  });

  it("registers all leaves when registerLines is all", () => {
    const parsed = parsePgnDatabase(`[Event "T"]
1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *
`);
    const source = makeImportedRepertoire(parsed.games);
    const forked = forkRepertoire(source, {
      name: "Forked",
      registerLines: "all",
    });
    expect(forked.registeredLeafIds.length).toBeGreaterThan(0);
    for (const leafId of forked.registeredLeafIds) {
      expect(
        Object.values(forked.games[0]!.nodes).some((node) => node.id === leafId),
      ).toBe(true);
    }
  });

  it("preserves comments and arrows on clone", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Test");
    const e4 = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
    game = {
      ...e4.game,
      nodes: {
        ...e4.game.nodes,
        [e4.nodeId]: {
          ...e4.game.nodes[e4.nodeId]!,
          comment: "King's pawn",
          arrows: [{ from: "e2", to: "e4", color: "G" }],
        },
      },
    };

    const { game: cloned, idMap } = cloneStudyGame(game);
    const clonedE4Id = idMap.get(e4.nodeId)!;
    expect(cloned.nodes[clonedE4Id]?.comment).toBe("King's pawn");
    expect(cloned.nodes[clonedE4Id]?.arrows).toHaveLength(1);
  });

  it("clones all games in multi-game repertoire", () => {
    const g1 = createEmptyStudyGame("G1");
    const g2 = createEmptyStudyGame("G2");
    const source = makeImportedRepertoire([g1, g2]);
    const forked = forkRepertoire(source, {
      name: "Multi",
      registerLines: "none",
    });
    expect(forked.games).toHaveLength(2);
    expect(forked.games[0]?.rootId).not.toBe(g1.rootId);
    expect(forked.games[1]?.rootId).not.toBe(g2.rootId);
  });

  it("uses uuid node IDs", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "clone-uuid",
    });
    resetNodeCounter();
    const game = createEmptyStudyGame("Test");
    const { game: cloned } = cloneStudyGame(game);
    expect(cloned.rootId).toBe("node-clone-uuid");
  });
});
