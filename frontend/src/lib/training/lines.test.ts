import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Square } from "chess.js";

import { parsePgnDatabase } from "@/lib/pgn/parse";
import { createRepertoire } from "@/lib/repertoires/storage";
import { applyMove, createEmptyStudyGame } from "@/lib/repertoires/treeBuilder";

import {
  applySessionLineLimit,
  countUserMovesInLine,
  extractTrainingLines,
  filterLinesForColor,
  shuffleLines,
} from "./lines";

const VARIATION_PGN = `[Event "Repertoire"]
[White "You"]
[Black "Opponent"]

1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5 *
`;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

beforeEach(() => {
  localStorageMock.clear();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("crypto", { randomUUID: () => "test-uuid" });
});

describe("extractTrainingLines", () => {
  it("extracts all leaf lines from imported repertoires", () => {
    const parsed = parsePgnDatabase(VARIATION_PGN);
    const repertoire = createRepertoire({
      name: "Test",
      source: "imported",
      games: parsed.games,
    });
    const lines = extractTrainingLines(repertoire);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.moves.length > 0)).toBe(true);
  });

  it("uses registered lines only for created repertoires", () => {
    let game = createEmptyStudyGame("Created");
    const rootId = game.rootId;
    const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
    game = e4.game;
    const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
    game = e5.game;

    const repertoire = createRepertoire({
      name: "Created",
      source: "created",
      games: [game],
      registeredLeafIds: [e5.nodeId],
    });

    const lines = extractTrainingLines(repertoire);
    expect(lines).toHaveLength(1);
    expect(lines[0].leafNodeId).toBe(e5.nodeId);
  });
});

describe("filterLinesForColor", () => {
  it("removes lines with no moves for the chosen color", () => {
    const parsed = parsePgnDatabase(VARIATION_PGN);
    const repertoire = createRepertoire({
      name: "Test",
      source: "imported",
      games: parsed.games,
    });
    const lines = extractTrainingLines(repertoire);
    const whiteLines = filterLinesForColor(lines, "white");
    const blackLines = filterLinesForColor(lines, "black");
    expect(whiteLines.length).toBeGreaterThan(0);
    expect(blackLines.length).toBeGreaterThan(0);
    whiteLines.forEach((line) => {
      expect(countUserMovesInLine(line, "white")).toBeGreaterThan(0);
    });
  });
});

describe("applySessionLineLimit", () => {
  it("returns all lines when maxLines is 0", () => {
    const lines = extractTrainingLines(
      createRepertoire({
        name: "T",
        source: "imported",
        games: parsePgnDatabase(VARIATION_PGN).games,
      }),
    );
    expect(applySessionLineLimit(lines, 0, false)).toHaveLength(lines.length);
  });

  it("limits to N lines after shuffle", () => {
    const lines = [{ id: "1" }, { id: "2" }, { id: "3" }] as ReturnType<
      typeof extractTrainingLines
    >;
    const limited = applySessionLineLimit(lines, 2, false);
    expect(limited).toHaveLength(2);
  });
});

describe("shuffleLines", () => {
  it("returns a permutation of the input", () => {
    const lines = [1, 2, 3, 4, 5];
    const shuffled = shuffleLines(lines);
    expect(shuffled).toHaveLength(lines.length);
    expect([...shuffled].sort()).toEqual([...lines].sort());
  });
});
