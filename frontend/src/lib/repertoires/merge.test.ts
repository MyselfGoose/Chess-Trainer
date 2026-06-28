import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import { parsePgnDatabase } from "@/lib/pgn/parse";

import { mergeRepertoires } from "./merge";
import { DEFAULT_REPERTOIRE_META } from "./meta";
import {
  applyMove,
  createEmptyStudyGame,
  registerLine,
  resetNodeCounter,
} from "./treeBuilder";
import type { Repertoire } from "./types";

function baseRepertoire(overrides: Partial<Repertoire>): Repertoire {
  return {
    id: crypto.randomUUID(),
    name: "Base",
    source: "imported",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    games: [],
    registeredLeafIds: [],
    meta: { ...DEFAULT_REPERTOIRE_META },
    ...overrides,
  };
}

describe("mergeRepertoires", () => {
  it("appends all games from secondary to primary", () => {
    const gameA = createEmptyStudyGame("A");
    const gameB = createEmptyStudyGame("B");
    const primary = baseRepertoire({ id: "p1", games: [gameA] });
    const secondary = baseRepertoire({ id: "s1", games: [gameB] });

    const { repertoire } = mergeRepertoires(primary, secondary, {
      name: "Merged",
      includeSecondaryRegistered: false,
    });

    expect(repertoire.games).toHaveLength(2);
    expect(repertoire.source).toBe("created");
    expect(repertoire.meta.chapters).toEqual([]);
  });

  it("deduplicates Event headers", () => {
    const gameA = createEmptyStudyGame("Same Event");
    const gameB = createEmptyStudyGame("Same Event");
    const primary = baseRepertoire({ id: "p1", games: [gameA] });
    const secondary = baseRepertoire({ id: "s1", games: [gameB] });

    const { repertoire } = mergeRepertoires(primary, secondary, {
      name: "Merged",
      includeSecondaryRegistered: false,
    });

    const events = repertoire.games.map((game) => game.meta.Event);
    expect(events[0]).toBe("Same Event");
    expect(events[1]).toBe("Same Event (2)");
  });

  it("remaps registered leaves from both repertoires", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Created");
    const e4 = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
    game = e4.game;
    const reg = registerLine(game, e4.nodeId, []);
    expect(reg.ok).toBe(true);
    if (!reg.ok) {
      return;
    }

    const primary = baseRepertoire({
      id: "p1",
      source: "created",
      games: [game],
      registeredLeafIds: reg.registeredLeafIds,
    });

    resetNodeCounter();
    let game2 = createEmptyStudyGame("Created2");
    const d4 = applyMove(game2, game2.rootId, "d2" as Square, "d4" as Square)!;
    game2 = d4.game;
    const reg2 = registerLine(game2, d4.nodeId, []);
    expect(reg2.ok).toBe(true);
    if (!reg2.ok) {
      return;
    }

    const secondary = baseRepertoire({
      id: "s1",
      source: "created",
      games: [game2],
      registeredLeafIds: reg2.registeredLeafIds,
    });

    const { repertoire } = mergeRepertoires(primary, secondary, {
      name: "Merged",
      includeSecondaryRegistered: true,
    });

    expect(repertoire.registeredLeafIds).toHaveLength(2);
    for (const leafId of repertoire.registeredLeafIds) {
      const found = repertoire.games.some((g) => g.nodes[leafId] !== undefined);
      expect(found).toBe(true);
    }
  });

  it("preserves SAN paths after merge", () => {
    const parsed = parsePgnDatabase(`[Event "T"]
1. e4 e5 *
`);
    const primary = baseRepertoire({ id: "p1", games: parsed.games });
    const secondary = baseRepertoire({
      id: "s1",
      games: parsePgnDatabase(`[Event "T2"]
1. d4 d5 *
`).games,
    });

    const { repertoire } = mergeRepertoires(primary, secondary, {
      name: "Merged",
      includeSecondaryRegistered: false,
    });

    expect(repertoire.games).toHaveLength(2);
    const allNodeIds = new Set<string>();
    for (const game of repertoire.games) {
      for (const id of Object.keys(game.nodes)) {
        expect(allNodeIds.has(id)).toBe(false);
        allNodeIds.add(id);
      }
    }
  });

  it("rejects merging the same repertoire", () => {
    const rep = baseRepertoire({ id: "same", games: [createEmptyStudyGame("A")] });
    expect(() =>
      mergeRepertoires(rep, rep, {
        name: "X",
        includeSecondaryRegistered: false,
      }),
    ).toThrow(/itself/);
  });
});
