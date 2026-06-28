"use client";

import { useCallback, useMemo, useState } from "react";
import type { Move, Square } from "chess.js";

import { isPromotionMove } from "@/lib/chess/destinations";
import { ChessGame } from "@/lib/chess/game";
import { playChessMoveSound } from "@/lib/sounds/feedbackSounds";
import type {
  ChessGameSnapshot,
  PendingPromotion,
  PromotionPiece,
} from "@/lib/chess/types";
import {
  appendHistoryEntry,
  canJumpToEnd,
  canJumpToStart,
  canStepBack,
  canStepForward,
  createInitialHistory,
  type PlayHistoryEntry,
} from "@/lib/navigation/playHistory";
import type { MoveNavigationHandlers } from "@/hooks/useMoveNavigation";

export interface UseChessGameResult {
  snapshot: ChessGameSnapshot;
  pendingPromotion: PendingPromotion | null;
  attemptMove: (from: Square, to: Square) => boolean;
  completePromotion: (piece: PromotionPiece) => void;
  cancelPromotion: () => void;
  resetGame: () => void;
  chess: ChessGame;
  navigation: MoveNavigationHandlers;
}

function snapshotFromHistory(
  chess: ChessGame,
  entry: PlayHistoryEntry,
): ChessGameSnapshot {
  chess.loadFen(entry.fen);
  return chess.getSnapshot(entry.lastMove);
}

export function useChessGame(): UseChessGameResult {
  const [chess] = useState(() => new ChessGame());
  const [history, setHistory] = useState<PlayHistoryEntry[]>(() =>
    createInitialHistory(chess.getFen()),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [snapshot, setSnapshot] = useState<ChessGameSnapshot>(() =>
    chess.getSnapshot(null),
  );
  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);

  const applyHistoryIndex = useCallback(
    (index: number, nextHistory: PlayHistoryEntry[]) => {
      const entry = nextHistory[index];
      if (!entry) {
        return;
      }
      setHistory(nextHistory);
      setCurrentIndex(index);
      setPendingPromotion(null);
      setSnapshot(snapshotFromHistory(chess, entry));
    },
    [chess],
  );

  const pushHistoryEntry = useCallback(
    (entry: PlayHistoryEntry) => {
      setHistory((prevHistory) => {
        const next = appendHistoryEntry(prevHistory, currentIndex, entry);
        setCurrentIndex(next.currentIndex);
        setSnapshot(snapshotFromHistory(chess, entry));
        return next.history;
      });
    },
    [chess, currentIndex],
  );

  const applyMove = useCallback(
    (move: Move) => {
      const nextLastMove: [Square, Square] = [move.from, move.to];
      setPendingPromotion(null);
      playChessMoveSound({
        san: move.san,
        captured: move.captured,
        promotion: move.promotion,
        flags: move.flags,
      });
      pushHistoryEntry({
        fen: chess.getFen(),
        lastMove: nextLastMove,
      });
      return true;
    },
    [chess, pushHistoryEntry],
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
        setSnapshot(snapshotFromHistory(chess, history[currentIndex]!));
        return;
      }

      applyMove(move);
    },
    [applyMove, chess, currentIndex, history, pendingPromotion],
  );

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    setSnapshot(snapshotFromHistory(chess, history[currentIndex]!));
  }, [chess, currentIndex, history]);

  const resetGame = useCallback(() => {
    chess.reset();
    const initialHistory = createInitialHistory(chess.getFen());
    setHistory(initialHistory);
    setCurrentIndex(0);
    setPendingPromotion(null);
    setSnapshot(chess.getSnapshot(null));
  }, [chess]);

  const goBack = useCallback(() => {
    if (!canStepBack(currentIndex)) {
      return;
    }
    applyHistoryIndex(currentIndex - 1, history);
  }, [applyHistoryIndex, currentIndex, history]);

  const goForward = useCallback(() => {
    if (!canStepForward(history, currentIndex)) {
      return;
    }
    applyHistoryIndex(currentIndex + 1, history);
  }, [applyHistoryIndex, currentIndex, history]);

  const goToStart = useCallback(() => {
    if (!canJumpToStart(currentIndex)) {
      return;
    }
    applyHistoryIndex(0, history);
  }, [applyHistoryIndex, currentIndex, history]);

  const goToEnd = useCallback(() => {
    if (!canJumpToEnd(history, currentIndex)) {
      return;
    }
    applyHistoryIndex(history.length - 1, history);
  }, [applyHistoryIndex, currentIndex, history]);

  const navigation = useMemo(
    (): MoveNavigationHandlers => ({
      goBack,
      goForward,
      goToStart,
      goToEnd,
      canGoBack: canStepBack(currentIndex) && pendingPromotion === null,
      canGoForward:
        canStepForward(history, currentIndex) && pendingPromotion === null,
      canGoToStart: canJumpToStart(currentIndex) && pendingPromotion === null,
      canGoToEnd: canJumpToEnd(history, currentIndex) && pendingPromotion === null,
    }),
    [
      currentIndex,
      goBack,
      goForward,
      goToEnd,
      goToStart,
      history,
      pendingPromotion,
    ],
  );

  return {
    snapshot,
    pendingPromotion,
    attemptMove,
    completePromotion,
    cancelPromotion,
    resetGame,
    chess,
    navigation,
  };
}
