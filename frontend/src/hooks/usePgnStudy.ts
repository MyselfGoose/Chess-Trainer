"use client";

import { useCallback, useMemo, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";

import type { PromotionPiece } from "@/lib/chess/types";
import {
  buildRepertoireDests,
  choiceRequiresPromotion,
  clearStudy,
  computeLineStats,
  findChoiceByMove,
  getMoveChoices,
  loadStudy,
  saveStudy,
} from "@/lib/pgn";
import type {
  LineStats,
  MoveChoice,
  StoredPgnStudy,
  StudyGame,
  StudyNode,
} from "@/lib/pgn";

function getNode(game: StudyGame, id: string): StudyNode | undefined {
  return game.nodes[id];
}

function buildPath(game: StudyGame, nodeId: string): StudyNode[] {
  const path: StudyNode[] = [];
  let current: StudyNode | undefined = getNode(game, nodeId);
  while (current) {
    path.unshift(current);
    if (!current.parentId) {
      break;
    }
    current = getNode(game, current.parentId);
  }
  return path;
}

export interface UsePgnStudyResult {
  study: StoredPgnStudy | null;
  currentGame: StudyGame | null;
  currentNode: StudyNode | null;
  currentNodeId: string | null;
  currentPath: StudyNode[];
  availableMoves: MoveChoice[];
  repertoireDests: Map<Square, Square[]>;
  lineStats: LineStats | null;
  boardFen: string;
  boardLastMove: [Square, Square] | null;
  turnLabel: string;
  isAtLineEnd: boolean;
  hasStudy: boolean;
  goToNode: (nodeId: string) => void;
  goBack: () => void;
  selectChoice: (nodeId: string) => void;
  tryBoardMove: (
    from: Square,
    to: Square,
    promotion?: PromotionPiece,
  ) => boolean;
  needsPromotion: (from: Square, to: Square) => boolean;
  selectGame: (index: number) => void;
  clearStudyData: () => void;
  reloadStudy: () => void;
}

interface StudyUiState {
  study: StoredPgnStudy | null;
  currentNodeId: string | null;
}

function getInitialStudyState(): StudyUiState {
  const loaded = loadStudy();
  return {
    study: loaded,
    currentNodeId: loaded?.games[loaded.selectedGameIndex]?.rootId ?? null,
  };
}

export function usePgnStudy(): UsePgnStudyResult {
  const [uiState, setUiState] = useState<StudyUiState>(getInitialStudyState);
  const { study, currentNodeId } = uiState;

  const reloadStudy = useCallback(() => {
    const loaded = loadStudy();
    setUiState({
      study: loaded,
      currentNodeId: loaded?.games[loaded.selectedGameIndex]?.rootId ?? null,
    });
  }, []);

  const currentGame = useMemo(() => {
    if (!study) {
      return null;
    }
    return study.games[study.selectedGameIndex] ?? null;
  }, [study]);

  const currentNode = useMemo(() => {
    if (!currentGame || !currentNodeId) {
      return null;
    }
    return getNode(currentGame, currentNodeId) ?? null;
  }, [currentGame, currentNodeId]);

  const currentPath = useMemo(() => {
    if (!currentGame || !currentNodeId) {
      return [];
    }
    return buildPath(currentGame, currentNodeId);
  }, [currentGame, currentNodeId]);

  const availableMoves = useMemo(() => {
    if (!currentGame || !currentNodeId) {
      return [];
    }
    return getMoveChoices(currentGame, currentNodeId);
  }, [currentGame, currentNodeId]);

  const repertoireDests = useMemo(
    () => buildRepertoireDests(availableMoves),
    [availableMoves],
  );

  const lineStats = useMemo(() => {
    if (!currentGame) {
      return null;
    }
    return computeLineStats(currentGame);
  }, [currentGame]);

  const boardFen = currentNode?.fen ?? currentGame?.startFen ?? "";

  const boardLastMove = useMemo((): [Square, Square] | null => {
    if (!currentNode || !currentNode.from || !currentNode.to) {
      return null;
    }
    return [currentNode.from as Square, currentNode.to as Square];
  }, [currentNode]);

  const turnLabel = useMemo(() => {
    if (!boardFen) {
      return "White";
    }
    const chess = new Chess(boardFen);
    return chess.turn() === "w" ? "White" : "Black";
  }, [boardFen]);

  const isAtLineEnd = useMemo(() => {
    if (!currentNode || !currentGame) {
      return false;
    }
    const isRoot = currentNode.id === currentGame.rootId;
    return !isRoot && availableMoves.length === 0;
  }, [availableMoves.length, currentGame, currentNode]);

  const goToNode = useCallback(
    (nodeId: string) => {
      if (!currentGame || !getNode(currentGame, nodeId)) {
        return;
      }
      setUiState((prev) => ({ ...prev, currentNodeId: nodeId }));
    },
    [currentGame],
  );

  const goBack = useCallback(() => {
    if (!currentNode?.parentId) {
      return;
    }
    setUiState((prev) => ({ ...prev, currentNodeId: currentNode.parentId }));
  }, [currentNode]);

  const selectChoice = goToNode;

  const tryBoardMove = useCallback(
    (from: Square, to: Square, promotion?: PromotionPiece): boolean => {
      if (!currentGame || !currentNodeId) {
        return false;
      }

      const matched = findChoiceByMove(
        currentGame,
        currentNodeId,
        from,
        to,
        promotion,
      );
      if (!matched) {
        return false;
      }

      setUiState((prev) => ({ ...prev, currentNodeId: matched.id }));
      return true;
    },
    [currentGame, currentNodeId],
  );

  const needsPromotion = useCallback(
    (from: Square, to: Square): boolean => {
      if (!currentGame || !currentNodeId) {
        return false;
      }
      return choiceRequiresPromotion(currentGame, currentNodeId, from, to);
    },
    [currentGame, currentNodeId],
  );

  const selectGame = useCallback(
    (index: number) => {
      if (!study || index < 0 || index >= study.games.length) {
        return;
      }
      const updated: StoredPgnStudy = { ...study, selectedGameIndex: index };
      saveStudy(updated);
      setUiState({
        study: updated,
        currentNodeId: updated.games[index].rootId,
      });
    },
    [study],
  );

  const clearStudyData = useCallback(() => {
    clearStudy();
    setUiState({ study: null, currentNodeId: null });
  }, []);

  return {
    study,
    currentGame,
    currentNode,
    currentNodeId,
    currentPath,
    availableMoves,
    repertoireDests,
    lineStats,
    boardFen,
    boardLastMove,
    turnLabel,
    isAtLineEnd,
    hasStudy: study !== null && study.games.length > 0,
    goToNode,
    goBack,
    selectChoice,
    tryBoardMove,
    needsPromotion,
    selectGame,
    clearStudyData,
    reloadStudy,
  };
}
