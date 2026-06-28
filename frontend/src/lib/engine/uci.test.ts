import { describe, expect, it } from "vitest";

import {
  evalBarPercent,
  formatEvalScore,
  infoLineToEvaluation,
  parseBestMoveLine,
  parseInfoLine,
  uciToSan,
} from "./uci";

describe("uci", () => {
  it("parses info depth score cp and pv", () => {
    const parsed = parseInfoLine(
      "info depth 12 seldepth 18 score cp 34 nodes 12345 pv e2e4 e7e5 g1f3",
    );
    expect(parsed).toEqual({
      depth: 12,
      scoreCp: 34,
      pv: ["e2e4", "e7e5", "g1f3"],
    });
    expect(infoLineToEvaluation(parsed!)).toMatchObject({
      depth: 12,
      scoreCp: 34,
      pv: ["e2e4", "e7e5", "g1f3"],
    });
  });

  it("parses mate scores", () => {
    const parsed = parseInfoLine("info depth 20 score mate -3 pv e2e4");
    expect(parsed?.scoreMate).toBe(-3);
    expect(formatEvalScore({ scoreMate: -3 }, "white")).toBe("#3");
    expect(formatEvalScore({ scoreMate: 3 }, "white")).toBe("M3");
  });

  it("parses bestmove lines", () => {
    expect(parseBestMoveLine("bestmove e2e4 ponder e7e5")).toBe("e2e4");
    expect(parseBestMoveLine("bestmove (none)")).toBeNull();
  });

  it("formats centipawn scores from white perspective", () => {
    expect(formatEvalScore({ scoreCp: 34 }, "white")).toBe("+0.34");
    expect(formatEvalScore({ scoreCp: -120 }, "white")).toBe("-1.20");
    expect(formatEvalScore({ scoreCp: 34 }, "black")).toBe("-0.34");
  });

  it("maps eval to bar percent", () => {
    expect(evalBarPercent({ scoreCp: 0 }, "white")).toBe(50);
    expect(evalBarPercent({ scoreCp: 400 }, "white")).toBeGreaterThan(50);
    expect(evalBarPercent({ scoreMate: 2 }, "white")).toBe(100);
    expect(evalBarPercent({ scoreMate: -2 }, "white")).toBe(0);
  });

  it("converts uci to san", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(uciToSan(fen, "e2e4")).toBe("e4");
  });

  it("returns null for non-info lines", () => {
    expect(parseInfoLine("uciok")).toBeNull();
  });
});
