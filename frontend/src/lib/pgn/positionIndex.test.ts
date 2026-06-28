import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import { parsePgnDatabase } from "./parse";
import { buildPositionIndex, findNodesByFen } from "./positionIndex";
import { createRepertoire } from "@/lib/repertoires/storage";
import { applyMove, createEmptyStudyGame, resetNodeCounter } from "@/lib/repertoires/treeBuilder";

const VARIATION_PGN = `[Event "Repertoire"]
[White "You"]
[Black "Opponent"]

1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6 *
`;

describe("positionIndex", () => {
  it("indexes nodes across games in a repertoire", () => {
    const parsed = parsePgnDatabase(VARIATION_PGN);
    const repertoire = createRepertoire({
      name: "Test",
      source: "imported",
      games: parsed.games,
    });

    const index = buildPositionIndex(repertoire);
    expect(index.size).toBeGreaterThan(0);

    const startFen =
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const matches = findNodesByFen(repertoire, startFen);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.nodeIds.length).toBeGreaterThan(0);
  });

  it("finds same position across two games", () => {
    resetNodeCounter();
    let game1 = createEmptyStudyGame("G1");
    const e4 = applyMove(game1, game1.rootId, "e2" as Square, "e4" as Square)!;
    game1 = e4.game;

    resetNodeCounter();
    let game2 = createEmptyStudyGame("G2");
    const e4b = applyMove(game2, game2.rootId, "e2" as Square, "e4" as Square)!;
    game2 = e4b.game;

    const repertoire = createRepertoire({
      name: "Two games",
      source: "created",
      games: [game1, game2],
    });

    const afterE4Fen = game1.nodes[e4.nodeId].fen;
    const matches = findNodesByFen(repertoire, afterE4Fen);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.nodeIds).toHaveLength(2);
  });

  it("returns empty for invalid FEN", () => {
    const repertoire = createRepertoire({
      name: "Empty",
      source: "created",
      games: [createEmptyStudyGame("E")],
    });
    expect(findNodesByFen(repertoire, "invalid")).toEqual([]);
  });

  it("returns empty index for repertoire with only root", () => {
    const repertoire = createRepertoire({
      name: "Root only",
      source: "created",
      games: [createEmptyStudyGame("R")],
    });
    const index = buildPositionIndex(repertoire);
    expect(index.size).toBe(1);
  });
});
