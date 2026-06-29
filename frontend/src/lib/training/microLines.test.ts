import { describe, expect, it } from "vitest";

import { parsePgnDatabase } from "@/lib/pgn/parse";

import { extractTrainingLines, filterLinesForColor } from "./lines";
import {
  applyPlyRangeToLines,
  countLinesAfterPlyRange,
  sliceLineToPlyRange,
  userMovePlyIndices,
} from "./microLines";

const SIMPLE_PGN = `[Event "Test"]
[White "W"]
[Black "B"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 *
`;

function buildWhiteLine() {
  const parsed = parsePgnDatabase(SIMPLE_PGN);
  const repertoire = {
    id: "rep-1",
    name: "Test",
    source: "imported" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    games: parsed.games,
    registeredLeafIds: [],
  };
  const line = filterLinesForColor(extractTrainingLines(repertoire), "white")[0];
  if (!line) {
    throw new Error("Expected training line");
  }
  return line;
}

describe("microLines", () => {
  it("slices a mid-line range with correct start FEN", () => {
    const line = buildWhiteLine();
    const range = { from: 2, to: 4 };
    const sliced = sliceLineToPlyRange(line, range, "white");
    expect(sliced).not.toBeNull();
    expect(sliced!.moves).toHaveLength(3);
    expect(sliced!.startFen).toBe(line.moves[1]?.fen);
    expect(sliced!.label).toContain("plies 3–5");
  });

  it("keeps opponent-first slices for engine walk-in", () => {
    const line = buildWhiteLine();
    const range = { from: 1, to: 3 };
    const sliced = sliceLineToPlyRange(line, range, "white");
    expect(sliced).not.toBeNull();
    expect(sliced!.moves[0]?.color).toBe("b");
  });

  it("returns null for empty user-move slice", () => {
    const line = buildWhiteLine();
    const opponentOnly = { from: 1, to: 1 };
    expect(sliceLineToPlyRange(line, opponentOnly, "white")).toBeNull();
  });

  it("full-line range matches original moves", () => {
    const line = buildWhiteLine();
    const range = { from: 0, to: line.moves.length - 1 };
    const sliced = sliceLineToPlyRange(line, range, "white");
    expect(sliced?.moves.map((move) => move.san)).toEqual(
      line.moves.map((move) => move.san),
    );
  });

  it("lists user move ply indices", () => {
    const line = buildWhiteLine();
    const indices = userMovePlyIndices(line, "white");
    expect(indices.every((index) => line.moves[index]?.color === "w")).toBe(true);
    expect(indices.length).toBeGreaterThan(0);
  });

  it("applyPlyRangeToLines and countLinesAfterPlyRange", () => {
    const line = buildWhiteLine();
    const lines = [line];
    const range = { from: 0, to: line.moves.length - 1 };
    expect(countLinesAfterPlyRange(lines, range, "white")).toBe(1);
    expect(applyPlyRangeToLines(lines, range, "white")).toHaveLength(1);
  });
});
