"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";

import type { PromotionPiece } from "@/lib/chess/types";
import {
  buildRepertoireDests,
  choiceRequiresPromotion,
  computeLineStats,
  findChoiceByMove,
  getMoveChoices,
} from "@/lib/pgn";
import type {
  LineStats,
  MoveChoice,
  StudyGame,
  StudyNode,
} from "@/lib/pgn";
import {
  getRepertoire,
  loadStudySession,
  saveStudySession,
  type Repertoire,
} from "@/lib/repertoires";

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
  repertoire: Repertoire | null;
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
  isHydrated: boolean;
  selectedGameIndex: number;
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
  reloadStudy: () => void;
}

interface StudyUiState {
  repertoire: Repertoire | null;
  currentNodeId: string | null;
  selectedGameIndex: number;
}

const EMPTY_STUDY_STATE: StudyUiState = {
  repertoire: null,
  currentNodeId: null,
  selectedGameIndex: 0,
};

function readStudyState(repertoireId: string): StudyUiState {
  const repertoire = getRepertoire(repertoireId);
  if (!repertoire || repertoire.games.length === 0) {
    return { ...EMPTY_STUDY_STATE };
  }

  const session = loadStudySession(repertoireId);
  const gameIndex = session?.selectedGameIndex ?? 0;
  const game = repertoire.games[gameIndex] ?? repertoire.games[0];
  const defaultNodeId = game.rootId;
  const sessionNodeId = session?.currentNodeId;
  const currentNodeId =
    sessionNodeId && game.nodes[sessionNodeId]
      ? sessionNodeId
      : defaultNodeId;

  return {
    repertoire,
    currentNodeId,
    selectedGameIndex: gameIndex,
  };
}

function persistSession(
  repertoireId: string,
  currentNodeId: string | null,
  selectedGameIndex: number,
): void {
  if (!currentNodeId) {
    return;
  }
  saveStudySession(repertoireId, { currentNodeId, selectedGameIndex });
}

export function usePgnStudy(repertoireId: string): UsePgnStudyResult {
  const [uiState, setUiState] = useState<StudyUiState>(EMPTY_STUDY_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const { repertoire, currentNodeId, selectedGameIndex } = uiState;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only
    setUiState(readStudyState(repertoireId));
    setIsHydrated(true);
  }, [repertoireId]);

  const reloadStudy = useCallback(() => {
    setUiState(readStudyState(repertoireId));
  }, [repertoireId]);

  const currentGame = useMemo(() => {
    if (!repertoire) {
      return null;
    }
    return repertoire.games[selectedGameIndex] ?? null;
  }, [repertoire, selectedGameIndex]);

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
      setUiState((prev) => {
        persistSession(repertoireId, nodeId, prev.selectedGameIndex);
        return { ...prev, currentNodeId: nodeId };
      });
    },
    [currentGame, repertoireId],
  );

  const goBack = useCallback(() => {
    if (!currentNode?.parentId) {
      return;
    }
    setUiState((prev) => {
      persistSession(repertoireId, currentNode.parentId, prev.selectedGameIndex);
      return { ...prev, currentNodeId: currentNode.parentId };
    });
  }, [currentNode, repertoireId]);

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

      setUiState((prev) => {
        persistSession(repertoireId, matched.id, prev.selectedGameIndex);
        return { ...prev, currentNodeId: matched.id };
      });
      return true;
    },
    [currentGame, currentNodeId, repertoireId],
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
      if (!repertoire || index < 0 || index >= repertoire.games.length) {
        return;
      }
      const game = repertoire.games[index];
      const rootId = game.rootId;
      persistSession(repertoireId, rootId, index);
      setUiState((prev) => ({
        ...prev,
        selectedGameIndex: index,
        currentNodeId: rootId,
      }));
    },
    [repertoire, repertoireId],
  );

  return {
    repertoire,
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
    hasStudy:
      isHydrated && repertoire !== null && repertoire.games.length > 0,
    isHydrated,
    selectedGameIndex,
    goToNode,
    goBack,
    selectChoice,
    tryBoardMove,
    needsPromotion,
    selectGame,
    reloadStudy,
  };
}
