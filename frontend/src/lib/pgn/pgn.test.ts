import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import { findChoiceByMove, getMoveChoices } from "./navigation";
import { parsePgnDatabase } from "./parse";
import { computeLineStats } from "./stats";

const SIMPLE_PGN = `[Event "Test Game"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 { King's pawn opening } 2. Nf3 Nc6 3. Bb5 $1 1-0
`;

const VARIATION_PGN = `[Event "Repertoire"]
[White "You"]
[Black "Opponent"]

1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5 *
`;

const MULTI_GAME_PGN = `[Event "Game 1"]
[White "A"]
[Black "B"]
[Result "*"]

1. d4 d5 *

[Event "Game 2"]
[White "C"]
[Black "D"]
[Result "*"]

1. e4 e5 *
`;

const CUSTOM_FEN_PGN = `[SetUp "1"]
[FEN "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"]
[White "Test"]
[Black "Test"]

1. Nf3 Nc6 *
`;

describe("parsePgnDatabase", () => {
  it("parses a simple game with headers and comments", () => {
    const result = parsePgnDatabase(SIMPLE_PGN);
    expect(result.games).toHaveLength(1);
    expect(result.games[0].meta.White).toBe("Alice");
    expect(result.games[0].meta.Black).toBe("Bob");
    expect(result.games[0].result).toBe("1-0");

    const moves = Object.values(result.games[0].nodes).filter(
      (node) => node.san !== "",
    );
    expect(moves.length).toBeGreaterThanOrEqual(5);
    expect(moves.some((node) => node.comment?.includes("King's pawn"))).toBe(
      true,
    );
  });

  it("parses nested variations", () => {
    const result = parsePgnDatabase(VARIATION_PGN);
    expect(result.games).toHaveLength(1);

    const stats = computeLineStats(result.games[0]);
    expect(stats.lineCount).toBeGreaterThan(1);
    expect(stats.variationCount).toBeGreaterThan(0);
  });

  it("parses multiple games", () => {
    const result = parsePgnDatabase(MULTI_GAME_PGN);
    expect(result.games).toHaveLength(2);
    expect(result.games[0].meta.Event).toBe("Game 1");
    expect(result.games[1].meta.Event).toBe("Game 2");
  });

  it("parses custom starting FEN", () => {
    const result = parsePgnDatabase(CUSTOM_FEN_PGN);
    expect(result.games[0].startFen).toContain("4P3");
    expect(result.games[0].startFen).not.toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
  });

  it("rejects oversized content", () => {
    const huge = "x".repeat(3 * 1024 * 1024);
    const result = parsePgnDatabase(huge);
    expect(result.games).toHaveLength(0);
    expect(result.errors[0].message).toContain("too large");
  });
});

describe("computeLineStats", () => {
  it("counts lines in a branched repertoire", () => {
    const result = parsePgnDatabase(VARIATION_PGN);
    const stats = computeLineStats(result.games[0]);
    expect(stats.lineCount).toBe(3);
    expect(stats.totalMoves).toBeGreaterThan(6);
  });
});

describe("getMoveChoices", () => {
  it("returns sibling moves at a branched position", () => {
    const result = parsePgnDatabase(VARIATION_PGN);
    const game = result.games[0];

    const e4Node = getMoveChoices(game, game.rootId).find(
      (choice) => choice.node.san === "e4",
    )?.node;
    expect(e4Node).toBeDefined();

    const afterE4 = getMoveChoices(game, e4Node!.id);
    expect(afterE4.length).toBe(2);
    expect(afterE4.map((choice) => choice.node.san).sort()).toEqual(["c5", "e5"]);
  });

  it("sorts main line before variations", () => {
    const result = parsePgnDatabase(VARIATION_PGN);
    const game = result.games[0];

    const e4Node = getMoveChoices(game, game.rootId)[0].node;
    const afterE4 = getMoveChoices(game, e4Node.id);

    expect(afterE4[0].isMainLine).toBe(true);
    expect(afterE4[0].node.san).toBe("e5");
    expect(afterE4[1].isMainLine).toBe(false);
    expect(afterE4[1].node.san).toBe("c5");
  });

  it("findChoiceByMove resolves the correct child", () => {
    const result = parsePgnDatabase(VARIATION_PGN);
    const game = result.games[0];

    const e4Node = getMoveChoices(game, game.rootId)[0].node;
    const matched = findChoiceByMove(
      game,
      e4Node.id,
      "c7" as Square,
      "c5" as Square,
    );

    expect(matched?.san).toBe("c5");
    expect(matched?.isVariation).toBe(true);
  });
});
