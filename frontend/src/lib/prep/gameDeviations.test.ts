import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import { parsePgnDatabase } from "@/lib/pgn/parse";
import { applyMove, createEmptyStudyGame } from "@/lib/repertoires/treeBuilder";

import {
  analyzeGameDeviation,
  isDeviationError,
} from "./gameDeviations";

const REPERTOIRE_PGN = `[Event "Rep"]
[White "W"]
[Black "B"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 *
`;

const IN_BOOK_GAME = `[Event "Game"]
[White "W"]
[Black "B"]

1. e4 e5 2. Nf3 Nc6 *
`;

const OFF_BOOK_GAME = `[Event "Game"]
[White "W"]
[Black "B"]

1. e4 e5 2. Nc3 Nc6 *
`;

function buildRepertoire(pgn: string) {
  const parsed = parsePgnDatabase(pgn);
  return {
    id: "rep-1",
    name: "Test repertoire",
    source: "imported" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    games: parsed.games,
    registeredLeafIds: [],
    meta: {
      tags: [],
      chapters: [],
      version: 1,
    },
  };
}

function buildBranchingRepertoire() {
  let game = createEmptyStudyGame("Branch");
  const rootId = game.rootId;
  const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
  game = e4.game;
  const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
  game = e5.game;
  const nf3 = applyMove(game, e5.nodeId, "g1" as Square, "f3" as Square)!;
  game = nf3.game;
  applyMove(game, nf3.nodeId, "b8" as Square, "c6" as Square);
  const bc4 = applyMove(game, e5.nodeId, "f1" as Square, "c4" as Square)!;
  game = bc4.game;
  applyMove(game, bc4.nodeId, "b8" as Square, "c6" as Square);

  return {
    id: "rep-branch",
    name: "Branching",
    source: "imported" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    games: [game],
    registeredLeafIds: [],
    meta: {
      tags: [],
      chapters: [],
      version: 1,
    },
  };
}

describe("gameDeviations", () => {
  it("reports full game in book", () => {
    const repertoire = buildRepertoire(REPERTOIRE_PGN);
    const game = parsePgnDatabase(IN_BOOK_GAME).games[0]!;
    const result = analyzeGameDeviation(game, repertoire, "white");
    expect(isDeviationError(result)).toBe(false);
    if (!isDeviationError(result)) {
      expect(result.deviation).toBeNull();
      expect(result.inBookPlies).toBeGreaterThan(0);
    }
  });

  it("detects mid-game deviation", () => {
    const repertoire = buildRepertoire(REPERTOIRE_PGN);
    const game = parsePgnDatabase(OFF_BOOK_GAME).games[0]!;
    const result = analyzeGameDeviation(game, repertoire, "white");
    expect(isDeviationError(result)).toBe(false);
    if (!isDeviationError(result)) {
      expect(result.deviation?.playedSan).toBe("Nc3");
      expect(result.deviation?.repertoireSans).toContain("Nf3");
      expect(result.deviation?.expectedSan).toBe("Nf3");
      expect(result.deviation?.parentNodeId).toBeDefined();
    }
  });

  it("detects deviation on first user move", () => {
    const repertoire = buildRepertoire(REPERTOIRE_PGN);
    const gamePgn = `[Event "G"]
1. d4 d5 *
`;
    const game = parsePgnDatabase(gamePgn).games[0]!;
    const result = analyzeGameDeviation(game, repertoire, "white");
    expect(isDeviationError(result)).toBe(false);
    if (!isDeviationError(result)) {
      expect(result.deviation?.playedSan).toBe("d4");
      expect(result.inBookPlies).toBe(0);
    }
  });

  it("accepts valid repertoire alternative at branch", () => {
    const repertoire = buildBranchingRepertoire();
    const gamePgn = `[Event "G"]
1. e4 e5 2. Bc4 Nc6 *
`;
    const game = parsePgnDatabase(gamePgn).games[0]!;
    const result = analyzeGameDeviation(game, repertoire, "white");
    expect(isDeviationError(result)).toBe(false);
    if (!isDeviationError(result)) {
      expect(result.deviation).toBeNull();
    }
  });

  it("flags off-book move at branch", () => {
    const repertoire = buildBranchingRepertoire();
    const game = parsePgnDatabase(OFF_BOOK_GAME).games[0]!;
    const result = analyzeGameDeviation(game, repertoire, "white");
    expect(isDeviationError(result)).toBe(false);
    if (!isDeviationError(result)) {
      expect(result.deviation?.playedSan).toBe("Nc3");
    }
  });

  it("returns error for empty game", () => {
    const repertoire = buildRepertoire(REPERTOIRE_PGN);
    const game = createEmptyStudyGame("Empty");
    const result = analyzeGameDeviation(game, repertoire, "white");
    expect(isDeviationError(result)).toBe(true);
    if (isDeviationError(result)) {
      expect(result.error).toMatch(/no moves/i);
    }
  });
});
