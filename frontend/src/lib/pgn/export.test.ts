import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import { parsePgnDatabase } from "../pgn/parse";
import { studyGameToPgn } from "../pgn/export";
import {
  applyMove,
  createEmptyStudyGame,
  resetNodeCounter,
} from "../repertoires/treeBuilder";

const SIMPLE_PGN = `[Event "Test Game"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0
`;

describe("studyGameToPgn", () => {
  it("exports a manually built game", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Manual");
    const rootId = game.rootId;

    const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
    game = e4.game;
    const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
    game = e5.game;

    const pgn = studyGameToPgn(game);
    expect(pgn).toContain("1. e4");
    expect(pgn).toContain("e5");
  });

  it("round-trips a simple parsed game", () => {
    const parsed = parsePgnDatabase(SIMPLE_PGN);
    const game = parsed.games[0];
    const exported = studyGameToPgn(game);
    const reparsed = parsePgnDatabase(exported);

    expect(reparsed.games).toHaveLength(1);
    const moves = Object.values(reparsed.games[0].nodes).filter(
      (node) => node.san !== "",
    );
    expect(moves.length).toBeGreaterThanOrEqual(5);
    expect(moves.some((node) => node.san === "e4")).toBe(true);
    expect(moves.some((node) => node.san === "Bb5")).toBe(true);
  });
});
