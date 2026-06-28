import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";
import { DEFAULT_POSITION } from "chess.js";

import { studyGameToPgn } from "@/lib/pgn/export";
import { parsePgnDatabase } from "@/lib/pgn/parse";

import {
  applyMove,
  createEmptyStudyGame,
  resetNodeCounter,
} from "./treeBuilder";
import { gameHasMoves, setGameStartFen } from "./setStartFen";

const CUSTOM_FEN =
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

describe("setGameStartFen", () => {
  it("sets a custom starting FEN on an empty game", () => {
    resetNodeCounter();
    const game = createEmptyStudyGame("Custom");
    const result = setGameStartFen(game, CUSTOM_FEN);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.game.startFen).toContain("4P3");
    expect(result.game.meta.SetUp).toBe("1");
    expect(result.game.meta.FEN).toContain("4P3");
    expect(result.game.nodes[result.game.rootId]?.fen).toContain("4P3");
    expect(gameHasMoves(result.game)).toBe(false);
  });

  it("rejects invalid FEN", () => {
    const game = createEmptyStudyGame("Test");
    const result = setGameStartFen(game, "not-a-fen");
    expect(result.ok).toBe(false);
  });

  it("rejects when moves exist without force", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Test");
    const move = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
    game = move.game;
    const result = setGameStartFen(game, CUSTOM_FEN);
    expect(result.ok).toBe(false);
  });

  it("allows force reset when moves exist", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Test");
    const move = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
    game = move.game;
    const result = setGameStartFen(game, CUSTOM_FEN, { force: true });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(Object.keys(result.game.nodes)).toHaveLength(1);
  });

  it("supports playing moves after custom start", () => {
    resetNodeCounter();
    const game = createEmptyStudyGame("Custom");
    const setResult = setGameStartFen(game, CUSTOM_FEN);
    expect(setResult.ok).toBe(true);
    if (!setResult.ok) {
      return;
    }
    const move = applyMove(
      setResult.game,
      setResult.game.rootId,
      "g1" as Square,
      "f3" as Square,
    );
    expect(move).not.toBeNull();
  });

  it("round-trips custom FEN through export", () => {
    resetNodeCounter();
    const game = createEmptyStudyGame("Custom");
    const setResult = setGameStartFen(game, CUSTOM_FEN);
    expect(setResult.ok).toBe(true);
    if (!setResult.ok) {
      return;
    }
    const exported = studyGameToPgn(setResult.game);
    const reparsed = parsePgnDatabase(exported).games[0]!;
    expect(reparsed.startFen).toContain("4P3");
  });

  it("removes SetUp headers when resetting to standard start", () => {
    resetNodeCounter();
    const game = createEmptyStudyGame("Custom");
    const custom = setGameStartFen(game, CUSTOM_FEN);
    expect(custom.ok).toBe(true);
    if (!custom.ok) {
      return;
    }
    const standard = setGameStartFen(custom.game, DEFAULT_POSITION, {
      force: true,
    });
    expect(standard.ok).toBe(true);
    if (!standard.ok) {
      return;
    }
    expect(standard.game.meta.SetUp).toBeUndefined();
    expect(standard.game.meta.FEN).toBeUndefined();
  });
});
