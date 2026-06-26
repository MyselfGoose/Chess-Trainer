import type { Color, Move, Square } from "chess.js";

export type { Color, Move, Square };

export type BoardColor = "white" | "black";

export type PromotionPiece = "q" | "r" | "b" | "n";

export type GameResult =
  | { status: "ongoing" }
  | { status: "checkmate"; winner: BoardColor }
  | { status: "stalemate" }
  | { status: "draw"; reason: "stalemate" | "threefold repetition" | "insufficient material" | "fifty-move rule" };

export interface PendingPromotion {
  from: Square;
  to: Square;
}

export interface ChessGameSnapshot {
  fen: string;
  turn: BoardColor;
  lastMove: [Square, Square] | null;
  inCheck: boolean;
  result: GameResult;
  moveCount: number;
}

export function toBoardColor(color: Color): BoardColor {
  return color === "w" ? "white" : "black";
}

export function toChessColor(color: BoardColor): Color {
  return color === "white" ? "w" : "b";
}
