import { SQUARES, type Chess, type Square } from "chess.js";
import type { Key } from "@lichess-org/chessground/types";

export function buildMovableDests(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>();
  const turn = chess.turn();

  for (const square of SQUARES) {
    const piece = chess.get(square);
    if (!piece || piece.color !== turn) {
      continue;
    }

    const moves = chess.moves({ square, verbose: true });
    if (moves.length === 0) {
      continue;
    }

    dests.set(
      square as Key,
      moves.map((move) => move.to as Key),
    );
  }

  return dests;
}

export function isPromotionMove(chess: Chess, from: Square, to: Square): boolean {
  return chess.moves({ square: from, verbose: true }).some(
    (move) => move.from === from && move.to === to && move.promotion !== undefined,
  );
}
