import type { Notation } from "@echecs/pgn";

const PIECE_SYMBOLS: Record<Notation["piece"], string> = {
  pawn: "",
  knight: "N",
  bishop: "B",
  rook: "R",
  queen: "Q",
  king: "K",
};

const PROMOTION_SYMBOLS: Record<
  NonNullable<Notation["promotion"]>,
  string
> = {
  queen: "Q",
  rook: "R",
  bishop: "B",
  knight: "N",
};

export function notationToSan(notation: Notation): string {
  if (notation.castling) {
    let san = notation.long ? "O-O-O" : "O-O";
    if (notation.checkmate) {
      san += "#";
    } else if (notation.check) {
      san += "+";
    }
    return san;
  }

  let san = PIECE_SYMBOLS[notation.piece];

  if (notation.from) {
    san += notation.from;
  }

  if (notation.capture) {
    san += "x";
  }

  if (notation.to) {
    san += notation.to;
  }

  if (notation.promotion) {
    san += `=${PROMOTION_SYMBOLS[notation.promotion]}`;
  }

  if (notation.checkmate) {
    san += "#";
  } else if (notation.check) {
    san += "+";
  }

  return san;
}
