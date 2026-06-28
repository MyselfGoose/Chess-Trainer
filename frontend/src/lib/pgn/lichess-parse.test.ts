import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parsePgnDatabase } from "./parse";

const LICHESS_SAMPLE = readFileSync(
  resolve(__dirname, "fixtures/lichess-sample.pgn"),
  "utf-8",
);

describe("lichess sample PGN", () => {
  it("parses variations and comments without critical errors", () => {
    const result = parsePgnDatabase(LICHESS_SAMPLE);
    expect(result.games).toHaveLength(1);
    expect(result.errors).toHaveLength(0);

    const game = result.games[0]!;
    const moveNodes = Object.values(game.nodes).filter((node) => node.san !== "");
    expect(moveNodes.length).toBeGreaterThanOrEqual(6);
    expect(moveNodes.some((node) => node.san === "c5")).toBe(true);
    expect(moveNodes.some((node) => node.isVariation)).toBe(true);
  });
});
