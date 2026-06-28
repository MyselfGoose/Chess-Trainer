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
  canNavigateBack,
  canNavigateForward,
  canNavigateToEnd,
  canNavigateToStart,
  getForwardNodeId,
  resolveTipAfterNavigate,
} from "@/lib/navigation/treeNavigation";
import type { MoveNavigationHandlers } from "@/hooks/useMoveNavigation";
import { playChessMoveSound } from "@/lib/sounds/feedbackSounds";
import {
  getRepertoire,
  loadStudySession,
  saveStudySession,
  type BoardOrientation,
  type Repertoire,
  type StudySessionState,
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
  orientation: BoardOrientation;
  tipNodeId: string | null;
  goToNode: (nodeId: string) => void;
  goBack: () => void;
  goForward: () => void;
  goToStart: () => void;
  goToEnd: () => void;
  navigation: MoveNavigationHandlers;
  selectChoice: (nodeId: string) => void;
  tryBoardMove: (
    from: Square,
    to: Square,
    promotion?: PromotionPiece,
  ) => boolean;
  needsPromotion: (from: Square, to: Square) => boolean;
  selectGame: (index: number) => void;
  reloadStudy: () => void;
  setOrientation: (orientation: BoardOrientation) => void;
}

interface StudyUiState {
  repertoire: Repertoire | null;
  currentNodeId: string | null;
  tipNodeId: string | null;
  selectedGameIndex: number;
  orientation: BoardOrientation;
}

const EMPTY_STUDY_STATE: StudyUiState = {
  repertoire: null,
  currentNodeId: null,
  tipNodeId: null,
  selectedGameIndex: 0,
  orientation: "white",
};

export interface StudyDeepLink {
  gameIndex: number;
  nodeId: string;
}

function readStudyState(
  repertoireId: string,
  deepLink?: StudyDeepLink,
): StudyUiState {
  const repertoire = getRepertoire(repertoireId);
  if (!repertoire || repertoire.games.length === 0) {
    return { ...EMPTY_STUDY_STATE };
  }

  const session = loadStudySession(repertoireId);

  if (deepLink) {
    const game = repertoire.games[deepLink.gameIndex];
    if (game?.nodes[deepLink.nodeId]) {
      return {
        repertoire,
        currentNodeId: deepLink.nodeId,
        tipNodeId: deepLink.nodeId,
        selectedGameIndex: deepLink.gameIndex,
        orientation: session?.orientation ?? "white",
      };
    }
  }

  const gameIndex = session?.selectedGameIndex ?? 0;
  const game = repertoire.games[gameIndex] ?? repertoire.games[0];
  const defaultNodeId = game.rootId;
  const sessionNodeId = session?.currentNodeId;
  const currentNodeId =
    sessionNodeId && game.nodes[sessionNodeId]
      ? sessionNodeId
      : defaultNodeId;

  const sessionTipId = session?.tipNodeId;
  const tipNodeId =
    sessionTipId && game.nodes[sessionTipId] ? sessionTipId : currentNodeId;

  return {
    repertoire,
    currentNodeId,
    tipNodeId,
    selectedGameIndex: gameIndex,
    orientation: session?.orientation ?? "white",
  };
}

function persistSession(
  repertoireId: string,
  state: StudySessionState,
): void {
  saveStudySession(repertoireId, state);
}

function buildSessionState(
  currentNodeId: string,
  selectedGameIndex: number,
  tipNodeId: string,
  orientation: BoardOrientation,
): StudySessionState {
  return {
    version: 2,
    currentNodeId,
    selectedGameIndex,
    tipNodeId,
    orientation,
  };
}

export function usePgnStudy(
  repertoireId: string,
  deepLink?: StudyDeepLink,
): UsePgnStudyResult {
  const [uiState, setUiState] = useState<StudyUiState>(EMPTY_STUDY_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const { repertoire, currentNodeId, tipNodeId, selectedGameIndex, orientation } =
    uiState;

  useEffect(() => {
    const state = readStudyState(repertoireId, deepLink);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only
    setUiState(state);
    if (
      deepLink &&
      state.currentNodeId === deepLink.nodeId &&
      state.selectedGameIndex === deepLink.gameIndex
    ) {
      persistSession(
        repertoireId,
        buildSessionState(
          deepLink.nodeId,
          deepLink.gameIndex,
          deepLink.nodeId,
          state.orientation,
        ),
      );
    }
    setIsHydrated(true);
  // deepLink identity is keyed by gameIndex/nodeId only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repertoireId, deepLink?.gameIndex, deepLink?.nodeId]);

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

  const navigateToNode = useCallback(
    (nodeId: string) => {
      if (!currentGame || !getNode(currentGame, nodeId)) {
        return;
      }
      setUiState((prev) => {
        const resolvedTip = prev.tipNodeId
          ? resolveTipAfterNavigate(currentGame, prev.tipNodeId, nodeId)
          : nodeId;
        persistSession(
          repertoireId,
          buildSessionState(
            nodeId,
            prev.selectedGameIndex,
            resolvedTip,
            prev.orientation,
          ),
        );
        return {
          ...prev,
          currentNodeId: nodeId,
          tipNodeId: resolvedTip,
        };
      });
    },
    [currentGame, repertoireId],
  );

  const goToNode = navigateToNode;

  const goBack = useCallback(() => {
    if (!currentGame || !currentNode?.parentId) {
      return;
    }
    navigateToNode(currentNode.parentId);
  }, [currentGame, currentNode, navigateToNode]);

  const goForward = useCallback(() => {
    if (!currentGame || !currentNodeId || !tipNodeId) {
      return;
    }
    const nextId = getForwardNodeId(currentGame, currentNodeId, tipNodeId);
    if (!nextId) {
      return;
    }
    navigateToNode(nextId);
  }, [currentGame, currentNodeId, navigateToNode, tipNodeId]);

  const goToStart = useCallback(() => {
    if (!currentGame) {
      return;
    }
    navigateToNode(currentGame.rootId);
  }, [currentGame, navigateToNode]);

  const goToEnd = useCallback(() => {
    if (!currentGame || !tipNodeId) {
      return;
    }
    navigateToNode(tipNodeId);
  }, [currentGame, navigateToNode, tipNodeId]);

  const selectChoice = useCallback(
    (nodeId: string) => {
      if (currentGame && currentNodeId) {
        const node = currentGame.nodes[nodeId];
        if (node?.parentId === currentNodeId && node.san) {
          playChessMoveSound({ san: node.san });
        }
      }
      goToNode(nodeId);
    },
    [currentGame, currentNodeId, goToNode],
  );

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

      playChessMoveSound({ san: matched.san });

      setUiState((prev) => {
        const resolvedTip = prev.tipNodeId
          ? resolveTipAfterNavigate(currentGame, prev.tipNodeId, matched.id)
          : matched.id;
        persistSession(
          repertoireId,
          buildSessionState(
            matched.id,
            prev.selectedGameIndex,
            resolvedTip,
            prev.orientation,
          ),
        );
        return {
          ...prev,
          currentNodeId: matched.id,
          tipNodeId: resolvedTip,
        };
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
      setUiState((prev) => {
        persistSession(
          repertoireId,
          buildSessionState(rootId, index, rootId, prev.orientation),
        );
        return {
          ...prev,
          selectedGameIndex: index,
          currentNodeId: rootId,
          tipNodeId: rootId,
        };
      });
    },
    [repertoire, repertoireId],
  );

  const setOrientation = useCallback(
    (nextOrientation: BoardOrientation) => {
      setUiState((prev) => {
        if (!prev.currentNodeId) {
          return { ...prev, orientation: nextOrientation };
        }
        persistSession(
          repertoireId,
          buildSessionState(
            prev.currentNodeId,
            prev.selectedGameIndex,
            prev.tipNodeId ?? prev.currentNodeId,
            nextOrientation,
          ),
        );
        return { ...prev, orientation: nextOrientation };
      });
    },
    [repertoireId],
  );

  const navigation = useMemo((): MoveNavigationHandlers => {
    if (!currentGame || !currentNodeId || !tipNodeId) {
      return {
        goBack,
        goForward,
        goToStart,
        goToEnd,
        canGoBack: false,
        canGoForward: false,
        canGoToStart: false,
        canGoToEnd: false,
      };
    }

    return {
      goBack,
      goForward,
      goToStart,
      goToEnd,
      canGoBack: canNavigateBack(currentGame, currentNodeId),
      canGoForward: canNavigateForward(currentGame, currentNodeId, tipNodeId),
      canGoToStart: canNavigateToStart(currentGame, currentNodeId),
      canGoToEnd: canNavigateToEnd(currentGame, currentNodeId, tipNodeId),
    };
  }, [
    currentGame,
    currentNodeId,
    goBack,
    goForward,
    goToEnd,
    goToStart,
    tipNodeId,
  ]);

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
    orientation,
    tipNodeId,
    goToNode,
    goBack,
    goForward,
    goToStart,
    goToEnd,
    navigation,
    selectChoice,
    tryBoardMove,
    needsPromotion,
    selectGame,
    reloadStudy,
    setOrientation,
  };
}
