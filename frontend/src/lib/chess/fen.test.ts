import { describe, expect, it } from "vitest";

import { fenKey, isValidFen, normalizeFen } from "./fen";

const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("fen utilities", () => {
  it("normalizes FEN by stripping move counters", () => {
    const withCounters =
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2";
    expect(normalizeFen(START_FEN)).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -",
    );
    expect(normalizeFen(withCounters)).toBe(normalizeFen(START_FEN));
  });

  it("fenKey matches normalizeFen", () => {
    expect(fenKey(START_FEN)).toBe(normalizeFen(START_FEN));
  });

  it("validates standard and custom FEN", () => {
    expect(isValidFen(START_FEN)).toBe(true);
    expect(
      isValidFen(
        "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
      ),
    ).toBe(true);
    expect(isValidFen("not a fen")).toBe(false);
    expect(isValidFen("")).toBe(false);
  });
});
