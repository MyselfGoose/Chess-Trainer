import { Chess, type Move, type Square } from "chess.js";

import type {
  BoardColor,
  ChessGameSnapshot,
  GameResult,
  PromotionPiece,
} from "./types";
import { toBoardColor } from "./types";

export class ChessGame {
  private readonly chess: Chess;

  constructor(fen?: string) {
    this.chess = new Chess(fen);
  }

  getFen(): string {
    return this.chess.fen();
  }

  getTurn(): BoardColor {
    return toBoardColor(this.chess.turn());
  }

  isInCheck(): boolean {
    return this.chess.inCheck();
  }

  getLegalMoves(square?: Square): Move[] {
    if (square) {
      return this.chess.moves({ square, verbose: true });
    }
    return this.chess.moves({ verbose: true });
  }

  makeMove(
    from: Square,
    to: Square,
    promotion?: PromotionPiece,
  ): Move | null {
    try {
      return this.chess.move({ from, to, promotion });
    } catch {
      return null;
    }
  }

  getResult(): GameResult {
    if (!this.chess.isGameOver()) {
      return { status: "ongoing" };
    }

    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === "w" ? "black" : "white";
      return { status: "checkmate", winner };
    }

    if (this.chess.isStalemate()) {
      return { status: "stalemate" };
    }

    if (this.chess.isThreefoldRepetition()) {
      return { status: "draw", reason: "threefold repetition" };
    }

    if (this.chess.isInsufficientMaterial()) {
      return { status: "draw", reason: "insufficient material" };
    }

    if (this.chess.isDraw()) {
      return { status: "draw", reason: "fifty-move rule" };
    }

    return { status: "draw", reason: "stalemate" };
  }

  getSnapshot(lastMove: [Square, Square] | null): ChessGameSnapshot {
    return {
      fen: this.getFen(),
      turn: this.getTurn(),
      lastMove,
      inCheck: this.isInCheck(),
      result: this.getResult(),
      moveCount: this.chess.moveNumber(),
    };
  }

  reset(): void {
    this.chess.reset();
  }

  loadFen(fen: string): boolean {
    try {
      this.chess.load(fen);
      return true;
    } catch {
      return false;
    }
  }

  getEngine(): Chess {
    return this.chess;
  }
}
