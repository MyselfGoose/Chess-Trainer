"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";

import { buildMovableDests, isPromotionMove } from "@/lib/chess/destinations";
import type { PromotionPiece } from "@/lib/chess/types";
import { computeLineStats } from "@/lib/pgn";
import type { LineStats, StudyGame, StudyNode } from "@/lib/pgn";
import {
  canNavigateBack,
  canNavigateForward,
  canNavigateToEnd,
  canNavigateToStart,
  getForwardNodeId,
  resolveTipAfterNavigate,
} from "@/lib/navigation/treeNavigation";
import type { MoveNavigationHandlers } from "@/hooks/useMoveNavigation";
import {
  playChessMoveSound,
  playNotificationSound,
} from "@/lib/sounds/feedbackSounds";
import {
  createRepertoire,
  getRepertoire,
  RepertoireStorageError,
  updateRepertoire,
  type Repertoire,
} from "@/lib/repertoires";
import {
  applyMove,
  buildPath,
  canUndoMove,
  createEmptyStudyGame,
  getRegisteredLines,
  isLeaf,
  registerLine,
  syncNodeCounterFromGame,
  undoLastMove,
  unregisterLine,
  type RegisteredLine,
} from "@/lib/repertoires/treeBuilder";

export interface UseRepertoireBuilderOptions {
  repertoireId?: string;
  initialName?: string;
}

export interface UseRepertoireBuilderResult {
  name: string;
  setName: (name: string) => void;
  game: StudyGame;
  currentNodeId: string;
  currentPath: StudyNode[];
  registeredLines: RegisteredLine[];
  registeredLeafIds: string[];
  lineStats: LineStats;
  boardFen: string;
  boardLastMove: [Square, Square] | null;
  turnLabel: string;
  movableDests: Map<Square, Square[]>;
  isDirty: boolean;
  isLeaf: boolean;
  canRegister: boolean;
  canSave: boolean;
  canUndo: boolean;
  registerMessage: string | null;
  saveError: string | null;
  isSaving: boolean;
  goToNode: (nodeId: string) => void;
  goBack: () => void;
  goForward: () => void;
  goToStart: () => void;
  goToEnd: () => void;
  navigation: MoveNavigationHandlers;
  attemptMove: (from: Square, to: Square) => boolean;
  needsPromotion: (from: Square, to: Square) => boolean;
  completePromotion: (from: Square, to: Square, piece: PromotionPiece) => boolean;
  registerCurrentLine: () => void;
  removeRegisteredLine: (leafId: string) => void;
  undoMove: () => void;
  save: () => Repertoire | null;
}

function getNode(game: StudyGame, id: string): StudyNode | undefined {
  return game.nodes[id];
}

function loadBuilderState(
  repertoireId?: string,
  initialName?: string,
): {
  game: StudyGame;
  currentNodeId: string;
  tipNodeId: string;
  registeredLeafIds: string[];
  name: string;
  repertoireId?: string;
} {
  if (repertoireId) {
    const existing = getRepertoire(repertoireId);
    if (existing && existing.source === "created" && existing.games[0]) {
      syncNodeCounterFromGame(existing.games[0]);
      return {
        game: existing.games[0],
        currentNodeId: existing.games[0].rootId,
        tipNodeId: existing.games[0].rootId,
        registeredLeafIds: existing.registeredLeafIds,
        name: existing.name,
        repertoireId: existing.id,
      };
    }
  }

  const name = initialName?.trim() || "New repertoire";
  const game = createEmptyStudyGame(name);
  return {
    game,
    currentNodeId: game.rootId,
    tipNodeId: game.rootId,
    registeredLeafIds: [],
    name,
    repertoireId,
  };
}

export function useRepertoireBuilder(
  options: UseRepertoireBuilderOptions = {},
): UseRepertoireBuilderResult {
  const [state, setState] = useState(() =>
    loadBuilderState(options.repertoireId, options.initialName),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { game, currentNodeId, tipNodeId, registeredLeafIds, name, repertoireId } =
    state;

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const currentNode = getNode(game, currentNodeId);
  const currentPath = useMemo(
    () => buildPath(game, currentNodeId),
    [game, currentNodeId],
  );

  const registeredLines = useMemo(
    () => getRegisteredLines(game, registeredLeafIds),
    [game, registeredLeafIds],
  );

  const lineStats = useMemo(() => computeLineStats(game), [game]);

  const boardFen = currentNode?.fen ?? game.startFen;

  const boardLastMove = useMemo((): [Square, Square] | null => {
    if (!currentNode?.from || !currentNode.to) {
      return null;
    }
    return [currentNode.from as Square, currentNode.to as Square];
  }, [currentNode]);

  const turnLabel = useMemo(() => {
    const chess = new Chess(boardFen);
    return chess.turn() === "w" ? "White" : "Black";
  }, [boardFen]);

  const movableDests = useMemo(() => {
    const chess = new Chess(boardFen);
    const dests = buildMovableDests(chess);
    const squareDests = new Map<Square, Square[]>();
    for (const [from, squares] of dests) {
      squareDests.set(from as Square, squares as Square[]);
    }
    return squareDests;
  }, [boardFen]);

  const nodeIsLeaf = isLeaf(game, currentNodeId);
  const canRegister =
    nodeIsLeaf &&
    currentNodeId !== game.rootId &&
    !registeredLeafIds.includes(currentNodeId);
  const canSave = registeredLeafIds.length > 0 && name.trim().length > 0;
  const canUndo = canUndoMove(game, currentNodeId, registeredLeafIds);

  const navigateToNode = useCallback((nodeId: string) => {
    setState((prev) => {
      if (!getNode(prev.game, nodeId)) {
        return prev;
      }
      const resolvedTip = resolveTipAfterNavigate(
        prev.game,
        prev.tipNodeId,
        nodeId,
      );
      return {
        ...prev,
        currentNodeId: nodeId,
        tipNodeId: resolvedTip,
      };
    });
    setRegisterMessage(null);
  }, []);

  const goToNode = navigateToNode;

  const goBack = useCallback(() => {
    const node = getNode(game, currentNodeId);
    if (!node?.parentId) {
      return;
    }
    navigateToNode(node.parentId);
  }, [currentNodeId, game, navigateToNode]);

  const goForward = useCallback(() => {
    const nextId = getForwardNodeId(game, currentNodeId, tipNodeId);
    if (!nextId) {
      return;
    }
    navigateToNode(nextId);
  }, [currentNodeId, game, navigateToNode, tipNodeId]);

  const goToStart = useCallback(() => {
    navigateToNode(game.rootId);
  }, [game.rootId, navigateToNode]);

  const goToEnd = useCallback(() => {
    navigateToNode(tipNodeId);
  }, [navigateToNode, tipNodeId]);

  const applyBoardMove = useCallback(
    (from: Square, to: Square, promotion?: PromotionPiece): boolean => {
      const result = applyMove(game, currentNodeId, from, to, promotion);
      if (!result) {
        return false;
      }
      const node = result.game.nodes[result.nodeId];
      if (node?.san) {
        playChessMoveSound({ san: node.san });
      }
      setState((prev) => ({
        ...prev,
        game: result.game,
        currentNodeId: result.nodeId,
        tipNodeId: resolveTipAfterNavigate(
          result.game,
          prev.tipNodeId,
          result.nodeId,
        ),
      }));
      setIsDirty(true);
      setRegisterMessage(null);
      return true;
    },
    [currentNodeId, game],
  );

  const attemptMove = useCallback(
    (from: Square, to: Square): boolean => {
      const chess = new Chess(boardFen);
      if (isPromotionMove(chess, from, to)) {
        return false;
      }
      return applyBoardMove(from, to);
    },
    [applyBoardMove, boardFen],
  );

  const needsPromotion = useCallback(
    (from: Square, to: Square): boolean => {
      const chess = new Chess(boardFen);
      return isPromotionMove(chess, from, to);
    },
    [boardFen],
  );

  const completePromotion = useCallback(
    (from: Square, to: Square, piece: PromotionPiece): boolean => {
      return applyBoardMove(from, to, piece);
    },
    [applyBoardMove],
  );

  const registerCurrentLine = useCallback(() => {
    const result = registerLine(game, currentNodeId, registeredLeafIds);
    if (!result.ok) {
      setRegisterMessage(result.reason);
      return;
    }
    setState((prev) => ({
      ...prev,
      registeredLeafIds: result.registeredLeafIds,
    }));
    setIsDirty(true);
    setRegisterMessage("Line registered.");
    playNotificationSound();
  }, [currentNodeId, game, registeredLeafIds]);

  const removeRegisteredLine = useCallback((leafId: string) => {
    setState((prev) => ({
      ...prev,
      registeredLeafIds: unregisterLine(prev.registeredLeafIds, leafId),
    }));
    setIsDirty(true);
    setRegisterMessage(null);
  }, []);

  const undoMove = useCallback(() => {
    const result = undoLastMove(game, currentNodeId);
    if (!result) {
      return;
    }
    setState((prev) => {
      const nextTip = getNode(result.game, prev.tipNodeId)
        ? prev.tipNodeId
        : result.nodeId;
      return {
        ...prev,
        game: result.game,
        currentNodeId: result.nodeId,
        tipNodeId: nextTip,
      };
    });
    setIsDirty(true);
    setRegisterMessage(null);
  }, [currentNodeId, game]);

  const setName = useCallback((nextName: string) => {
    setState((prev) => ({ ...prev, name: nextName }));
    setIsDirty(true);
  }, []);

  const save = useCallback((): Repertoire | null => {
    if (!canSave) {
      return null;
    }
    setIsSaving(true);
    setSaveError(null);

    const trimmedName = name.trim();
    const updatedGame: StudyGame = {
      ...game,
      meta: { ...game.meta, Event: trimmedName },
    };

    try {
      if (repertoireId) {
        const updated = updateRepertoire(repertoireId, {
          name: trimmedName,
          games: [updatedGame],
          registeredLeafIds,
        });
        setIsSaving(false);
        setIsDirty(false);
        return updated;
      }

      const created = createRepertoire({
        name: trimmedName,
        source: "created",
        games: [updatedGame],
        registeredLeafIds,
      });
      setIsSaving(false);
      setIsDirty(false);
      return created;
    } catch (error) {
      setSaveError(
        error instanceof RepertoireStorageError
          ? error.message
          : "Failed to save repertoire.",
      );
      setIsSaving(false);
      return null;
    }
  }, [canSave, game, name, registeredLeafIds, repertoireId]);

  const navigation = useMemo((): MoveNavigationHandlers => {
    return {
      goBack,
      goForward,
      goToStart,
      goToEnd,
      canGoBack: canNavigateBack(game, currentNodeId),
      canGoForward: canNavigateForward(game, currentNodeId, tipNodeId),
      canGoToStart: canNavigateToStart(game, currentNodeId),
      canGoToEnd: canNavigateToEnd(game, currentNodeId, tipNodeId),
    };
  }, [
    currentNodeId,
    game,
    goBack,
    goForward,
    goToEnd,
    goToStart,
    tipNodeId,
  ]);

  return {
    name,
    setName,
    game,
    currentNodeId,
    currentPath,
    registeredLines,
    registeredLeafIds,
    lineStats,
    boardFen,
    boardLastMove,
    turnLabel,
    movableDests,
    isDirty,
    isLeaf: nodeIsLeaf,
    canRegister,
    canSave,
    canUndo,
    registerMessage,
    saveError,
    isSaving,
    goToNode,
    goBack,
    goForward,
    goToStart,
    goToEnd,
    navigation,
    attemptMove,
    needsPromotion,
    completePromotion,
    registerCurrentLine,
    removeRegisteredLine,
    undoMove,
    save,
  };
}
