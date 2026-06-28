"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";

import { buildMovableDests, isPromotionMove } from "@/lib/chess/destinations";
import type { PromotionPiece } from "@/lib/chess/types";
import {
  loadOrientationPreferenceOrDefault,
  saveOrientationPreference,
  trainingOrientationKey,
} from "@/lib/chess/orientationPreference";
import { getRepertoire } from "@/lib/repertoires";
import type { BoardOrientation } from "@/lib/repertoires/types";
import {
  advanceFromFeedback,
  applyNextOpponentMove,
  applySessionLineLimit,
  countUserMovesInLine,
  createTrainingEngine,
  endTrainingEarly,
  extractTrainingLines,
  filterLinesForColor,
  filterLinesFromAnchorForGame,
  getCurrentLine,
  getMasteryForRepertoire,
  getTrainingPositionContext,
  hasPendingOpponentAnimation,
  prioritizeLines,
  recordLineResult,
  saveTrainingSession,
  startLineWalk,
  tryUserMove,
  type CreateTrainingEngineInput,
  type TrainingEngineState,
  type TrainingFeedback,
  type TrainingPhase,
  type TrainingPositionContext,
  type TrainingPositionHint,
  type TrainingSessionConfig,
  type TrainingSessionSummary,
} from "@/lib/training";
import { playChessMoveSound, playFailSound, playNotificationSound, playPassSound } from "@/lib/training/sounds";

const OPPONENT_MOVE_DELAY_MS = 350;
const LEARN_OPPONENT_DELAY_MS = 600;

function isValidColor(value: string | null): value is "white" | "black" {
  return value === "white" || value === "black";
}

function buildEngineInput(
  config: TrainingSessionConfig,
  repertoireName: string,
  lines: CreateTrainingEngineInput["lines"],
  games: CreateTrainingEngineInput["games"],
  startedAt: string,
): CreateTrainingEngineInput {
  return {
    repertoireId: config.repertoireId,
    repertoireName,
    userColor: config.userColor,
    lines,
    games,
    startedAt,
    mode: config.mode,
    showCommentsAfterLine: config.showCommentsAfterLine,
    opponentPolicy: config.opponentPolicy,
  };
}

export interface UseTrainingSessionOptions {
  config: TrainingSessionConfig | null;
}

export interface UseTrainingSessionResult {
  isHydrated: boolean;
  repertoireName: string | null;
  notFound: boolean;
  noLines: boolean;
  phase: TrainingPhase;
  boardFen: string;
  boardLastMove: [Square, Square] | null;
  orientation: BoardOrientation;
  movableDests: Map<Square, Square[]>;
  isUserTurn: boolean;
  isAnimatingOpponent: boolean;
  currentLineIndex: number;
  totalLines: number;
  lineProgressLabel: string;
  userMoveProgressLabel: string | null;
  currentLineLabel: string | null;
  feedback: TrainingFeedback | null;
  positionHint: TrainingPositionHint | null;
  positionContext: TrainingPositionContext | null;
  summary: TrainingSessionSummary | null;
  tryUserMoveOnBoard: (from: Square, to: Square) => boolean;
  needsPromotion: (from: Square, to: Square) => boolean;
  completePromotion: (from: Square, to: Square, piece: PromotionPiece) => boolean;
  advanceFromFeedback: () => void;
  endTraining: () => void;
}

export function useTrainingSession({
  config,
}: UseTrainingSessionOptions): UseTrainingSessionResult {
  const repertoireId = config?.repertoireId ?? "";
  const userColor = config?.userColor ?? null;

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
  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>("white");
  const startedAtRef = useRef(new Date().toISOString());
  const summarySavedRef = useRef(false);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordedResultsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- client-only localStorage init */
    if (!config || !isValidColor(userColor)) {
      setIsHydrated(true);
      return;
    }

    const repertoire = getRepertoire(repertoireId);
    if (!repertoire) {
      setNotFound(true);
      setIsHydrated(true);
      return;
    }

    let allLines = filterLinesForColor(
      extractTrainingLines(repertoire),
      userColor,
    );

    if (config.anchorLeafNodeId) {
      allLines = filterLinesFromAnchorForGame(
        allLines,
        repertoire.games,
        config.anchorLeafNodeId,
      );
    }

    if (config.lineIds.length > 0) {
      const ids = new Set(config.lineIds);
      allLines = allLines.filter((line) => ids.has(line.id));
    }

    const masteryMap = new Map(
      getMasteryForRepertoire(repertoireId).map((entry) => [
        entry.lineId,
        entry,
      ]),
    );
    const prioritized =
      masteryMap.size > 0
        ? prioritizeLines(allLines, masteryMap)
        : allLines;
    const lines = applySessionLineLimit(
      prioritized,
      config.maxLines,
      masteryMap.size === 0,
    );

    if (lines.length === 0) {
      setRepertoireName(repertoire.name);
      setNoLines(true);
      setIsHydrated(true);
      return;
    }

    const input = buildEngineInput(
      config,
      repertoire.name,
      lines,
      repertoire.games,
      startedAtRef.current,
    );
    const initial = startLineWalk(createTrainingEngine(input), input);

    setRepertoireName(repertoire.name);
    setEngineInput(input);
    setEngineState(initial);
    setBoardOrientation(
      loadOrientationPreferenceOrDefault(
        trainingOrientationKey(userColor),
        userColor,
      ),
    );
    setIsHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [config, repertoireId, userColor]);

  useEffect(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    if (!engineState || !engineInput || !config) {
      return;
    }

    if (!hasPendingOpponentAnimation(engineState, engineInput)) {
      return;
    }

    const delay =
      config.mode === "learn" ? LEARN_OPPONENT_DELAY_MS : OPPONENT_MOVE_DELAY_MS;

    animationTimerRef.current = setTimeout(() => {
      setEngineState((current) => {
        if (!current || !engineInput) {
          return current;
        }
        if (config.soundEnabled) {
          const line = getCurrentLine(current);
          const move = line?.moves[current.moveIndex];
          if (move?.san) {
            playChessMoveSound({ san: move.san });
          }
        }
        return applyNextOpponentMove(current, engineInput);
      });
    }, delay);

    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [config, engineInput, engineState]);

  useEffect(() => {
    if (
      engineState?.phase === "lineFeedback" &&
      engineState.feedback &&
      config
    ) {
      const result = engineState.results[engineState.results.length - 1];
      if (result && !recordedResultsRef.current.has(result.lineId)) {
        recordLineResult(repertoireId, result.lineId, result.passed);
        recordedResultsRef.current.add(result.lineId);
      }
      if (config.soundEnabled) {
        if (engineState.feedback.passed) {
          playPassSound();
        } else {
          playFailSound();
        }
      }
    }
  }, [config, engineState?.feedback, engineState?.phase, engineState?.results, repertoireId]);

  useEffect(() => {
    if (
      engineState?.phase === "summary" &&
      engineState.summary &&
      !summarySavedRef.current
    ) {
      saveTrainingSession(engineState.summary);
      summarySavedRef.current = true;
      if (config?.soundEnabled) {
        playNotificationSound();
      }
    }
  }, [config?.soundEnabled, engineState?.phase, engineState?.summary]);

  useEffect(() => {
    if (isHydrated && userColor) {
      saveOrientationPreference(
        trainingOrientationKey(userColor),
        boardOrientation,
      );
    }
  }, [boardOrientation, isHydrated, userColor]);

  const phase = engineState?.phase ?? "active";
  const boardFen = engineState?.boardFen ?? "";
  const orientation = boardOrientation;

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
      let captured: string | undefined;
      let promotion: string | undefined;
      let flags: string | undefined;
      try {
        const move = chess.move({ from, to });
        if (move) {
          playedSan = move.san;
          captured = move.captured;
          promotion = move.promotion;
          flags = move.flags;
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

      const isAlternateRepertoireMove = next.positionHint !== null;

      if (config?.soundEnabled) {
        if (isAlternateRepertoireMove) {
          playNotificationSound();
        } else {
          playChessMoveSound({
            san: playedSan,
            captured: captured ?? null,
            promotion: promotion ?? null,
            flags,
          });
        }
      }

      setEngineState(next);
      return !isAlternateRepertoireMove;
    },
    [config?.soundEnabled, engineInput, engineState],
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
      let captured: string | undefined;
      let promotion: string | undefined;
      let flags: string | undefined;
      try {
        const move = chess.move({ from, to, promotion: piece });
        if (move) {
          playedSan = move.san;
          captured = move.captured;
          promotion = move.promotion;
          flags = move.flags;
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

      const isAlternateRepertoireMove = next.positionHint !== null;

      if (config?.soundEnabled) {
        if (isAlternateRepertoireMove) {
          playNotificationSound();
        } else {
          playChessMoveSound({
            san: playedSan,
            captured: captured ?? null,
            promotion: promotion ?? null,
            flags,
          });
        }
      }

      setEngineState(next);
      return !isAlternateRepertoireMove;
    },
    [config?.soundEnabled, engineInput, engineState],
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

  const positionContext =
    engineState && engineInput
      ? getTrainingPositionContext(engineState, engineInput)
      : null;

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
    positionHint: engineState?.positionHint ?? null,
    positionContext,
    summary: engineState?.summary ?? null,
    tryUserMoveOnBoard,
    needsPromotion,
    completePromotion,
    advanceFromFeedback: handleAdvanceFromFeedback,
    endTraining: handleEndTraining,
  };
}
