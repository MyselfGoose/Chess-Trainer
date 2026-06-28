import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import { DEFAULT_REPERTOIRE_META } from "@/lib/repertoires/meta";
import {
  applyMove,
  createEmptyStudyGame,
  resetNodeCounter,
} from "@/lib/repertoires/treeBuilder";
import type { Repertoire } from "@/lib/repertoires/types";

import { searchAllRepertoires } from "./globalSearch";

function buildE4Game(): ReturnType<typeof createEmptyStudyGame> {
  resetNodeCounter();
  let game = createEmptyStudyGame("e4 line");
  const e4 = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
  game = e4.game;
  const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
  game = e5.game;
  const nf3 = applyMove(game, e5.nodeId, "g1" as Square, "f3" as Square)!;
  return nf3.game;
}

function buildD4Game(): ReturnType<typeof createEmptyStudyGame> {
  resetNodeCounter();
  const game = createEmptyStudyGame("d4 line");
  const d4 = applyMove(game, game.rootId, "d2" as Square, "d4" as Square)!;
  return d4.game;
}

function makeRepertoire(
  id: string,
  name: string,
  games: ReturnType<typeof createEmptyStudyGame>[],
): Repertoire {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    id,
    name,
    source: "imported",
    createdAt: now,
    updatedAt: now,
    games,
    registeredLeafIds: [],
    meta: { ...DEFAULT_REPERTOIRE_META },
  };
}

describe("searchAllRepertoires", () => {
  it("finds SAN matches across multiple repertoires", () => {
    const catalog = [
      makeRepertoire("rep-a", "Sicilian Prep", [buildE4Game()]),
      makeRepertoire("rep-b", "Queen's Gambit", [buildD4Game()]),
    ];

    const results = searchAllRepertoires(catalog, "e4");
    const repertoireNames = new Set(results.map((result) => result.repertoireName));

    expect(repertoireNames.has("Sicilian Prep")).toBe(true);
    expect(repertoireNames.has("Queen's Gambit")).toBe(false);
    expect(results.every((result) => result.matchType === "line")).toBe(true);
  });

  it("matches comments with snippet", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Annotated");
    const e4 = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
    game = e4.game;
    game.nodes[e4.nodeId] = {
      ...game.nodes[e4.nodeId]!,
      comment: "Sicilian idea — prepare d4 break",
    };

    const catalog = [makeRepertoire("rep-comment", "Comments", [game])];
    const results = searchAllRepertoires(catalog, "sicilian idea");

    expect(results).toHaveLength(1);
    expect(results[0]?.matchType).toBe("comment");
    expect(results[0]?.snippet?.toLowerCase()).toContain("sicilian idea");
  });

  it("finds positions by valid FEN", () => {
    const e4Game = buildE4Game();
    const afterE4 = Object.values(e4Game.nodes).find((node) => node.san === "e4");
    const fen = afterE4?.fen;
    expect(fen).toBeDefined();

    const catalog = [makeRepertoire("rep-fen", "FEN test", [e4Game])];
    const results = searchAllRepertoires(catalog, fen!);

    expect(results.some((result) => result.matchType === "position")).toBe(true);
    expect(results[0]?.nodeId).toBe(afterE4?.id);
  });

  it("returns nothing for empty query", () => {
    const catalog = [makeRepertoire("rep-empty", "Empty", [buildE4Game()])];
    expect(searchAllRepertoires(catalog, "")).toEqual([]);
    expect(searchAllRepertoires(catalog, "   ")).toEqual([]);
  });

  it("skips SAN and comment matches when fenOnly is true", () => {
    const catalog = [makeRepertoire("rep-fen-only", "FEN only", [buildE4Game()])];
    const results = searchAllRepertoires(catalog, "e4", { fenOnly: true });
    expect(results).toEqual([]);
  });

  it("ranks prefix SAN matches ahead of substring matches", () => {
    const e4Game = buildE4Game();
    const d4Game = buildD4Game();
    const catalog = [
      makeRepertoire("rep-rank-a", "A", [e4Game]),
      makeRepertoire("rep-rank-b", "B", [d4Game]),
    ];

    const results = searchAllRepertoires(catalog, "1. e4");
    const e4Result = results.find((result) => result.label.toLowerCase().includes("e4"));
    const d4Result = results.find((result) => result.label.toLowerCase().includes("d4"));

    expect(e4Result).toBeDefined();
    expect(d4Result).toBeUndefined();
    if (e4Result && results.length > 1) {
      expect(results.indexOf(e4Result)).toBeLessThan(
        results.findIndex((result) => !result.label.toLowerCase().startsWith("1. e4")),
      );
    }
  });

  it("deduplicates identical hits", () => {
    const catalog = [makeRepertoire("rep-dedup", "Dedup", [buildE4Game()])];
    const results = searchAllRepertoires(catalog, "e4");
    const keys = results.map(
      (result) =>
        `${result.repertoireId}:${result.gameIndex}:${result.nodeId}:${result.matchType}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
