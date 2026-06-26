"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";

import { buildMovableDests, isPromotionMove } from "@/lib/chess/destinations";
import type { PromotionPiece } from "@/lib/chess/types";
import { getRepertoire } from "@/lib/repertoires";
import {
  advanceFromFeedback,
  applyNextOpponentMove,
  countUserMovesInLine,
  createTrainingEngine,
  endTrainingEarly,
  getCurrentLine,
  hasPendingOpponentAnimation,
  saveTrainingSession,
  shuffleLines,
  startLineWalk,
  tryUserMove,
  type CreateTrainingEngineInput,
  type TrainingColor,
  type TrainingEngineState,
  type TrainingFeedback,
  type TrainingLine,
  type TrainingPhase,
  type TrainingSessionSummary,
} from "@/lib/training";
import {
  extractTrainingLines,
  filterLinesForColor,
} from "@/lib/training/lines";

const OPPONENT_MOVE_DELAY_MS = 350;

export interface UseTrainingSessionOptions {
  repertoireId: string;
  userColor: TrainingColor | null;
  lineSubset?: TrainingLine[];
}

export interface UseTrainingSessionResult {
  isHydrated: boolean;
  repertoireName: string | null;
  notFound: boolean;
  noLines: boolean;
  phase: TrainingPhase;
  boardFen: string;
  boardLastMove: [Square, Square] | null;
  orientation: TrainingColor;
  movableDests: Map<Square, Square[]>;
  isUserTurn: boolean;
  isAnimatingOpponent: boolean;
  currentLineIndex: number;
  totalLines: number;
  lineProgressLabel: string;
  userMoveProgressLabel: string | null;
  currentLineLabel: string | null;
  feedback: TrainingFeedback | null;
  summary: TrainingSessionSummary | null;
  tryUserMoveOnBoard: (from: Square, to: Square) => boolean;
  needsPromotion: (from: Square, to: Square) => boolean;
  completePromotion: (from: Square, to: Square, piece: PromotionPiece) => boolean;
  advanceFromFeedback: () => void;
  endTraining: () => void;
}

function isValidColor(value: string | null): value is TrainingColor {
  return value === "white" || value === "black";
}

function buildEngineInput(
  repertoireId: string,
  repertoireName: string,
  userColor: TrainingColor,
  lines: TrainingLine[],
  games: CreateTrainingEngineInput["games"],
  startedAt: string,
): CreateTrainingEngineInput {
  return {
    repertoireId,
    repertoireName,
    userColor,
    lines,
    games,
    startedAt,
  };
}

export function useTrainingSession({
  repertoireId,
  userColor,
  lineSubset,
}: UseTrainingSessionOptions): UseTrainingSessionResult {
  const [isHydrated, setIsHydrated] = useState(false);
  const [engineState, setEngineState] = useState<TrainingEngineState | null>(
    null,
  );
  const [engineInput, setEngineInput] = useState<CreateTrainingEngineInput | null>(
    null,
  );
  const [repertoireName, setRepertoireName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [noLines, setNoLines] = useState(false);
  const startedAtRef = useRef(new Date().toISOString());
  const summarySavedRef = useRef(false);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- client-only localStorage init */
    if (!isValidColor(userColor)) {
      setIsHydrated(true);
      return;
    }

    const repertoire = getRepertoire(repertoireId);
    if (!repertoire) {
      setNotFound(true);
      setIsHydrated(true);
      return;
    }

    const allLines =
      lineSubset ??
      filterLinesForColor(extractTrainingLines(repertoire), userColor);
    const lines = shuffleLines(allLines);

    if (lines.length === 0) {
      setRepertoireName(repertoire.name);
      setNoLines(true);
      setIsHydrated(true);
      return;
    }

    const input = buildEngineInput(
      repertoireId,
      repertoire.name,
      userColor,
      lines,
      repertoire.games,
      startedAtRef.current,
    );
    const initial = startLineWalk(createTrainingEngine(input), input);

    setRepertoireName(repertoire.name);
    setEngineInput(input);
    setEngineState(initial);
    setIsHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [lineSubset, repertoireId, userColor]);

  useEffect(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    if (!engineState || !engineInput) {
      return;
    }

    if (!hasPendingOpponentAnimation(engineState, engineInput)) {
      return;
    }

    animationTimerRef.current = setTimeout(() => {
      setEngineState((current) => {
        if (!current || !engineInput) {
          return current;
        }
        return applyNextOpponentMove(current, engineInput);
      });
    }, OPPONENT_MOVE_DELAY_MS);

    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [engineInput, engineState]);

  useEffect(() => {
    if (
      engineState?.phase === "summary" &&
      engineState.summary &&
      !summarySavedRef.current
    ) {
      saveTrainingSession(engineState.summary);
      summarySavedRef.current = true;
    }
  }, [engineState?.phase, engineState?.summary]);

  const phase = engineState?.phase ?? "active";
  const boardFen = engineState?.boardFen ?? "";
  const orientation = userColor && isValidColor(userColor) ? userColor : "white";

  const movableDests = useMemo(() => {
    if (!engineState?.waitingForUser || !boardFen) {
      return new Map<Square, Square[]>();
    }
    const chess = new Chess(boardFen);
    const dests = buildMovableDests(chess);
    const squareDests = new Map<Square, Square[]>();
    for (const [from, squares] of dests) {
      squareDests.set(from as Square, squares as Square[]);
    }
    return squareDests;
  }, [boardFen, engineState?.waitingForUser]);

  const currentLine = engineState ? getCurrentLine(engineState) : null;
  const totalUserMoves = currentLine
    ? countUserMovesInLine(currentLine, engineInput?.userColor ?? "white")
    : 0;

  const tryUserMoveOnBoard = useCallback(
    (from: Square, to: Square): boolean => {
      if (!engineState || !engineInput || !engineState.waitingForUser) {
        return false;
      }
      const chess = new Chess(engineState.boardFen);
      let playedSan = `${from}-${to}`;
      try {
        const move = chess.move({ from, to });
        if (move) {
          playedSan = move.san;
        }
      } catch {
        // keep coordinate fallback
      }

      const next = tryUserMove(
        engineState,
        engineInput,
        from,
        to,
        undefined,
        playedSan,
      );
      if (next === engineState) {
        return false;
      }
      setEngineState(next);
      return true;
    },
    [engineInput, engineState],
  );

  const needsPromotion = useCallback(
    (from: Square, to: Square): boolean => {
      if (!engineState?.waitingForUser || !boardFen) {
        return false;
      }
      const chess = new Chess(boardFen);
      return isPromotionMove(chess, from, to);
    },
    [boardFen, engineState?.waitingForUser],
  );

  const completePromotion = useCallback(
    (from: Square, to: Square, piece: PromotionPiece): boolean => {
      if (!engineState || !engineInput || !engineState.waitingForUser) {
        return false;
      }
      const chess = new Chess(engineState.boardFen);
      let playedSan = `${from}-${to}=${piece}`;
      try {
        const move = chess.move({ from, to, promotion: piece });
        if (move) {
          playedSan = move.san;
        }
      } catch {
        // keep fallback
      }
      const next = tryUserMove(
        engineState,
        engineInput,
        from,
        to,
        piece,
        playedSan,
      );
      if (next === engineState) {
        return false;
      }
      setEngineState(next);
      return true;
    },
    [engineInput, engineState],
  );

  const handleAdvanceFromFeedback = useCallback(() => {
    if (!engineState || !engineInput) {
      return;
    }
    setEngineState(advanceFromFeedback(engineState, engineInput));
  }, [engineInput, engineState]);

  const handleEndTraining = useCallback(() => {
    if (!engineState || !engineInput || engineState.phase === "summary") {
      return;
    }
    setEngineState(endTrainingEarly(engineState, engineInput));
  }, [engineInput, engineState]);

  const userMoveProgressLabel =
    engineState && currentLine && engineState.waitingForUser
      ? `Your move ${engineState.userMovesPlayedInLine + 1} of ${totalUserMoves}`
      : null;

  return {
    isHydrated,
    repertoireName,
    notFound,
    noLines,
    phase,
    boardFen,
    boardLastMove: engineState?.boardLastMove ?? null,
    orientation,
    movableDests,
    isUserTurn: Boolean(engineState?.waitingForUser),
    isAnimatingOpponent: Boolean(engineState?.isAnimatingOpponent),
    currentLineIndex: engineState?.currentLineIndex ?? 0,
    totalLines: engineState?.lines.length ?? 0,
    lineProgressLabel: engineState
      ? `Line ${engineState.currentLineIndex + 1} of ${engineState.lines.length}`
      : "",
    userMoveProgressLabel,
    currentLineLabel: currentLine?.label ?? null,
    feedback: engineState?.feedback ?? null,
    summary: engineState?.summary ?? null,
    tryUserMoveOnBoard,
    needsPromotion,
    completePromotion,
    advanceFromFeedback: handleAdvanceFromFeedback,
    endTraining: handleEndTraining,
  };
}
