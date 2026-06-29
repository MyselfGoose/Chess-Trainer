import { beforeEach, describe, expect, it, vi } from "vitest";

import { parsePgnDatabase } from "@/lib/pgn/parse";

import {
  applyFailureDrillToLines,
  buildFailureDrillLine,
  failurePlyFromMastery,
  failurePlyFromResult,
} from "./failureDrill";
import { extractTrainingLines, filterLinesForColor } from "./lines";
import { recordLineResult } from "./mastery";
import type { TrainingLineResult } from "./types";

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
});

const SIMPLE_PGN = `[Event "Test"]
[White "W"]
[Black "B"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 *
`;

function buildWhiteLine(): ReturnType<typeof filterLinesForColor>[number] {
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
  const lines = filterLinesForColor(extractTrainingLines(repertoire), "white");
  const line = lines[0];
  if (!line) {
    throw new Error("Expected training line");
  }
  return line;
}

describe("failureDrill", () => {
  it("slices at mid-line failure for white", () => {
    const line = buildWhiteLine();
    const failPly = line.moves.findIndex((move) => move.san === "Bb5");
    expect(failPly).toBeGreaterThan(0);

    const drill = buildFailureDrillLine(line, failPly, "white");
    expect(drill).not.toBeNull();
    expect(drill!.moves[0]?.san).toBe("Bb5");
    expect(drill!.startFen).toBe(line.moves[failPly - 1]?.fen);
    expect(drill!.startParentNodeId).toBe(line.moves[failPly - 1]?.id);
    expect(drill!.label).toContain(`ply ${failPly + 1}`);
  });

  it("handles failure on first user move", () => {
    const line = buildWhiteLine();
    const firstWhitePly = line.moves.findIndex((move) => move.color === "w");
    const drill = buildFailureDrillLine(line, firstWhitePly, "white");
    expect(drill).not.toBeNull();
    expect(drill!.startFen).toBe(line.startFen);
    expect(drill!.startParentNodeId).toBeUndefined();
  });

  it("handles failure on last user move", () => {
    const line = buildWhiteLine();
    const whitePlies = line.moves
      .map((move, index) => (move.color === "w" ? index : -1))
      .filter((index) => index >= 0);
    const lastWhitePly = whitePlies[whitePlies.length - 1]!;
    const drill = buildFailureDrillLine(line, lastWhitePly, "white");
    expect(drill).not.toBeNull();
    expect(drill!.moves).toHaveLength(line.moves.length - lastWhitePly);
  });

  it("returns null for invalid ply", () => {
    const line = buildWhiteLine();
    expect(buildFailureDrillLine(line, -1, "white")).toBeNull();
    expect(buildFailureDrillLine(line, line.moves.length, "white")).toBeNull();
  });

  it("reads failure ply from result and mastery", () => {
    const result: TrainingLineResult = {
      lineId: "0:leaf",
      label: "test",
      passed: false,
      failedAtPly: 4,
      userMovesPlayed: 1,
      totalUserMoves: 3,
    };
    expect(failurePlyFromResult(result)).toBe(4);
    expect(failurePlyFromResult({ ...result, passed: true })).toBeNull();

    const mastery = recordLineResult("rep-1", "0:leaf", false, undefined, {
      failedAtPly: 2,
      failedAtSan: "Nf3",
    });
    expect(failurePlyFromMastery(mastery)).toBe(2);

    const cleared = recordLineResult("rep-1", "0:leaf", true);
    expect(cleared.failedAtPly).toBeUndefined();
    expect(failurePlyFromMastery(cleared)).toBeNull();
  });

  it("applyFailureDrillToLines skips lines without mastery failure ply", () => {
    const line = buildWhiteLine();
    const masteryByLine = new Map([
      [
        line.id,
        recordLineResult(line.repertoireId, line.id, false, undefined, {
          failedAtPly: 2,
        }),
      ],
    ]);
    const drilled = applyFailureDrillToLines([line], "white", masteryByLine);
    expect(drilled).toHaveLength(1);
    expect(drilled[0]!.moves.length).toBeLessThan(line.moves.length);
  });
});
