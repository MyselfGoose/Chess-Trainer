"use client";

import { useCallback, useState } from "react";
import type { Move, Square } from "chess.js";

import { isPromotionMove } from "@/lib/chess/destinations";
import { ChessGame } from "@/lib/chess/game";
import type {
  ChessGameSnapshot,
  PendingPromotion,
  PromotionPiece,
} from "@/lib/chess/types";

export interface UseChessGameResult {
  snapshot: ChessGameSnapshot;
  pendingPromotion: PendingPromotion | null;
  attemptMove: (from: Square, to: Square) => boolean;
  completePromotion: (piece: PromotionPiece) => void;
  cancelPromotion: () => void;
  resetGame: () => void;
  chess: ChessGame;
}

export function useChessGame(): UseChessGameResult {
  const [chess] = useState(() => new ChessGame());
  const [lastMove, setLastMove] = useState<[Square, Square] | null>(null);
  const [snapshot, setSnapshot] = useState<ChessGameSnapshot>(() =>
    chess.getSnapshot(null),
  );
  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);

  const syncSnapshot = useCallback(
    (nextLastMove: [Square, Square] | null = lastMove) => {
      setSnapshot(chess.getSnapshot(nextLastMove));
    },
    [chess, lastMove],
  );

  const applyMove = useCallback(
    (move: Move) => {
      const nextLastMove: [Square, Square] = [move.from, move.to];
      setLastMove(nextLastMove);
      setPendingPromotion(null);
      setSnapshot(chess.getSnapshot(nextLastMove));
      return true;
    },
    [chess],
  );

  const attemptMove = useCallback(
    (from: Square, to: Square): boolean => {
      const engine = chess.getEngine();

      if (isPromotionMove(engine, from, to)) {
        setPendingPromotion({ from, to });
        return false;
      }

      const move = chess.makeMove(from, to);
      if (!move) {
        return false;
      }

      return applyMove(move);
    },
    [applyMove, chess],
  );

  const completePromotion = useCallback(
    (piece: PromotionPiece) => {
      if (!pendingPromotion) {
        return;
      }

      const move = chess.makeMove(
        pendingPromotion.from,
        pendingPromotion.to,
        piece,
      );

      if (!move) {
        setPendingPromotion(null);
        syncSnapshot();
        return;
      }

      applyMove(move);
    },
    [applyMove, chess, pendingPromotion, syncSnapshot],
  );

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    syncSnapshot();
  }, [syncSnapshot]);

  const resetGame = useCallback(() => {
    chess.reset();
    setLastMove(null);
    setPendingPromotion(null);
    setSnapshot(chess.getSnapshot(null));
  }, [chess]);

  return {
    snapshot,
    pendingPromotion,
    attemptMove,
    completePromotion,
    cancelPromotion,
    resetGame,
    chess,
  };
}
