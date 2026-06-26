import { describe, expect, it } from "vitest";

import { buildMovableDests, isPromotionMove } from "./destinations";
import { ChessGame } from "./game";

describe("ChessGame", () => {
  it("starts with white to move from the standard position", () => {
    const game = new ChessGame();
    expect(game.getTurn()).toBe("white");
    expect(game.getFen()).toContain(" w ");
  });

  it("plays a legal pawn move", () => {
    const game = new ChessGame();
    const move = game.makeMove("e2", "e4");
    expect(move).not.toBeNull();
    expect(move?.san).toBe("e4");
    expect(game.getTurn()).toBe("black");
  });

  it("rejects illegal moves", () => {
    const game = new ChessGame();
    expect(game.makeMove("e2", "e5")).toBeNull();
    expect(game.getTurn()).toBe("white");
  });

  it("detects checkmate in fools mate", () => {
    const game = new ChessGame();
    game.makeMove("f2", "f3");
    game.makeMove("e7", "e5");
    game.makeMove("g2", "g4");
    game.makeMove("d8", "h4");

    const result = game.getResult();
    expect(result.status).toBe("checkmate");
    if (result.status === "checkmate") {
      expect(result.winner).toBe("black");
    }
  });

  it("handles kingside castling", () => {
    const game = new ChessGame("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const move = game.makeMove("e1", "g1");
    expect(move?.san).toBe("O-O");
  });

  it("handles en passant", () => {
    const game = new ChessGame(
      "rnbqkbnr/ppp2ppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3",
    );
    const move = game.makeMove("e5", "d6");
    expect(move?.isEnPassant()).toBe(true);
  });

  it("handles pawn promotion", () => {
    const game = new ChessGame("8/P7/8/8/8/8/8/4K2k w - - 0 1");
    const move = game.makeMove("a7", "a8", "q");
    expect(move?.isPromotion()).toBe(true);
    expect(move?.promotion).toBe("q");
  });
});

describe("buildMovableDests", () => {
  it("returns legal destinations for white pawns at start", () => {
    const game = new ChessGame();
    const dests = buildMovableDests(game.getEngine());

    expect(dests.get("e2")).toEqual(expect.arrayContaining(["e3", "e4"]));
    expect(dests.get("e2")).not.toContain("e5");
  });

  it("restricts moves when in check", () => {
    const game = new ChessGame("rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPP2PP/RNBQKBNR w KQkq - 0 3");
    const dests = buildMovableDests(game.getEngine());

    expect(dests.get("g2")).toEqual(["g3"]);
    expect(dests.has("f2")).toBe(false);
  });
});

describe("isPromotionMove", () => {
  it("detects promotion candidates", () => {
    const game = new ChessGame("8/P7/8/8/8/8/8/4K2k w - - 0 1");
    expect(isPromotionMove(game.getEngine(), "a7", "a8")).toBe(true);
    expect(isPromotionMove(game.getEngine(), "a7", "a6")).toBe(false);
  });
});
