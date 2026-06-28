import { describe, expect, it, beforeEach } from "vitest";

import {
  lookupOpeningByFen,
  lookupOpeningByMoves,
  primeEcoData,
  resetEcoCache,
  type EcoEntry,
} from "./lookup";

const TEST_ENTRIES: EcoEntry[] = [
  { eco: "B20", name: "Sicilian Defense", pgn: "1. e4 c5" },
  { eco: "B90", name: "Sicilian Defense: Najdorf", pgn: "1. e4 c5 2. Nf3 d6" },
  { eco: "C50", name: "Italian Game", pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4" },
  { eco: "D06", name: "Queen's Gambit", pgn: "1. d4 d5 2. c4" },
];

describe("opening lookup", () => {
  beforeEach(() => {
    resetEcoCache();
    primeEcoData(TEST_ENTRIES);
  });

  it("matches Sicilian by moves", () => {
    const info = lookupOpeningByMoves(["e4", "c5"], TEST_ENTRIES);
    expect(info?.eco).toMatch(/^B20/);
    expect(info?.name).toContain("Sicilian");
  });

  it("matches Italian by moves", () => {
    const info = lookupOpeningByMoves(
      ["e4", "e5", "Nf3", "Nc6", "Bc4"],
      TEST_ENTRIES,
    );
    expect(info?.eco).toBe("C50");
    expect(info?.name).toContain("Italian");
  });

  it("matches Queen's Gambit by moves", () => {
    const info = lookupOpeningByMoves(["d4", "d5", "c4"], TEST_ENTRIES);
    expect(info?.eco).toBe("D06");
  });

  it("returns null for starting position without moves", () => {
    expect(lookupOpeningByMoves([], TEST_ENTRIES)).toBeNull();
  });

  it("matches by FEN after Italian moves", () => {
    const info = lookupOpeningByFen(
      "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
      TEST_ENTRIES,
    );
    expect(info?.eco).toBe("C50");
  });
});
