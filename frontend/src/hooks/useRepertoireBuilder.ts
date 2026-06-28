"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";

import type { BoardAnnotation } from "@/lib/chess/annotations";
import {
  annotationsToPgnNode,
} from "@/lib/chess/annotations";
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
  collapseEmptyBranches,
  findEmptyBranches,
} from "@/lib/repertoires/treeMutations";
import {
  computePruneImpact,
  pruneSubtree,
  type PruneImpact,
} from "@/lib/repertoires/pruneImpact";
import {
  updateNodeAnnotations,
  updateNodeComment,
} from "@/lib/repertoires/nodeEditor";
import {
  canRedo as stackCanRedo,
  canUndo as stackCanUndo,
  createEmptyUndoStack,
  createSnapshot,
  popRedo,
  popUndo,
  pushSnapshot,
  type BuilderSnapshot,
  type UndoStackState,
} from "@/lib/repertoires/undoStack";
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
  currentNode: StudyNode | undefined;
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
  canDeleteFromHere: boolean;
  canUndoEdit: boolean;
  canRedoEdit: boolean;
  emptyBranchCount: number;
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
  getPruneImpact: () => PruneImpact | null;
  confirmDeleteFromHere: () => boolean;
  collapseEmptyBranchesAction: () => number;
  undoEdit: () => void;
  redoEdit: () => void;
  saveComment: (text: string) => void;
  saveAnnotationsToNode: (sessionShapes: BoardAnnotation[]) => void;
  hasUnsavedAnnotations: (sessionShapes: BoardAnnotation[]) => boolean;
  save: () => Repertoire | null;
}

interface BuilderState {
  game: StudyGame;
  currentNodeId: string;
  tipNodeId: string;
  registeredLeafIds: string[];
  name: string;
  repertoireId?: string;
  baseMetaVersion: number;
}

function getNode(game: StudyGame, id: string): StudyNode | undefined {
  return game.nodes[id];
}

function toSnapshot(state: BuilderState): BuilderSnapshot {
  return createSnapshot({
    game: state.game,
    registeredLeafIds: state.registeredLeafIds,
    currentNodeId: state.currentNodeId,
    tipNodeId: state.tipNodeId,
  });
}

function resolveNodeAfterDelete(
  game: StudyGame,
  currentNodeId: string,
  tipNodeId: string,
  deletedNodeIds: string[],
): { currentNodeId: string; tipNodeId: string } {
  const deleted = new Set(deletedNodeIds);
  let nextCurrent = currentNodeId;
  let nextTip = tipNodeId;

  if (deleted.has(nextCurrent)) {
    const parent = game.nodes[nextCurrent]?.parentId;
    nextCurrent =
      parent && getNode(game, parent) ? parent : game.rootId;
  }
  if (deleted.has(nextTip) || !getNode(game, nextTip)) {
    nextTip = getNode(game, nextCurrent) ? nextCurrent : game.rootId;
  }

  return { currentNodeId: nextCurrent, tipNodeId: nextTip };
}

function shapesMatchNode(
  sessionShapes: BoardAnnotation[],
  node: StudyNode | undefined,
): boolean {
  const { arrows, squares } = annotationsToPgnNode(sessionShapes);
  const nodeArrows = node?.arrows ?? [];
  const nodeSquares = node?.squares ?? [];

  const arrowKey = (a: { from: string; to: string; color: string }) =>
    `${a.color}${a.from}${a.to}`;
  const squareKey = (s: { square: string; color: string }) =>
    `${s.color}${s.square}`;

  if (
    arrows.length !== nodeArrows.length ||
    squares.length !== nodeSquares.length
  ) {
    return false;
  }

  const sessionArrowKeys = new Set(arrows.map(arrowKey));
  for (const arrow of nodeArrows) {
    if (!sessionArrowKeys.has(arrowKey(arrow))) {
      return false;
    }
  }

  const sessionSquareKeys = new Set(squares.map(squareKey));
  for (const square of nodeSquares) {
    if (!sessionSquareKeys.has(squareKey(square))) {
      return false;
    }
  }

  return true;
}

function loadBuilderState(
  repertoireId?: string,
  initialName?: string,
): BuilderState {
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
        baseMetaVersion: existing.meta.version,
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
    baseMetaVersion: 1,
  };
}

export function useRepertoireBuilder(
  options: UseRepertoireBuilderOptions = {},
): UseRepertoireBuilderResult {
  const [state, setState] = useState<BuilderState>(() =>
    loadBuilderState(options.repertoireId, options.initialName),
  );
  const [undoStack, setUndoStack] = useState<UndoStackState>(createEmptyUndoStack);
  const [versionOffset, setVersionOffset] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  });

  const {
    game,
    currentNodeId,
    tipNodeId,
    registeredLeafIds,
    name,
    repertoireId,
    baseMetaVersion,
  } = state;

  const pushUndoSnapshot = useCallback(() => {
    setUndoStack((stack) => pushSnapshot(stack, toSnapshot(stateRef.current)));
  }, []);

  const bumpVersion = useCallback(() => {
    setVersionOffset((offset) => offset + 1);
  }, []);

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
  const emptyBranchCount = useMemo(
    () => findEmptyBranches(game).length,
    [game],
  );

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
  const canDeleteFromHere = currentNodeId !== game.rootId;

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
      if (result.created) {
        pushUndoSnapshot();
        bumpVersion();
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
    [bumpVersion, currentNodeId, game, pushUndoSnapshot],
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
    pushUndoSnapshot();
    bumpVersion();
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
  }, [bumpVersion, currentNodeId, game, pushUndoSnapshot]);

  const getPruneImpact = useCallback((): PruneImpact | null => {
    return computePruneImpact(game, currentNodeId, registeredLeafIds);
  }, [currentNodeId, game, registeredLeafIds]);

  const confirmDeleteFromHere = useCallback((): boolean => {
    const beforeNode = getNode(game, currentNodeId);
    const parentId = beforeNode?.parentId ?? game.rootId;
    const result = pruneSubtree(game, currentNodeId, registeredLeafIds);
    if (!result) {
      return false;
    }

    pushUndoSnapshot();
    bumpVersion();

    const resolved = resolveNodeAfterDelete(
      result.game,
      currentNodeId,
      tipNodeId,
      result.deletedNodeIds,
    );
    const fallbackCurrent =
      result.deletedNodeIds.includes(currentNodeId) &&
      parentId &&
      getNode(result.game, parentId)
        ? parentId
        : resolved.currentNodeId;

    setState((prev) => ({
      ...prev,
      game: result.game,
      registeredLeafIds: result.registeredLeafIds,
      currentNodeId: fallbackCurrent,
      tipNodeId: resolved.tipNodeId,
    }));
    setIsDirty(true);
    setRegisterMessage(null);
    return true;
  }, [
    bumpVersion,
    currentNodeId,
    game,
    pushUndoSnapshot,
    registeredLeafIds,
    tipNodeId,
  ]);

  const collapseEmptyBranchesAction = useCallback((): number => {
    const beforeCount = Object.keys(game.nodes).length;
    const collapsed = collapseEmptyBranches(game);
    const afterCount = Object.keys(collapsed.nodes).length;
    const removed = beforeCount - afterCount;
    if (removed === 0) {
      return 0;
    }

    pushUndoSnapshot();
    bumpVersion();

    const emptyIds = findEmptyBranches(game);
    const deletedSet = new Set(
      Object.keys(game.nodes).filter((id) => !collapsed.nodes[id]),
    );
    void emptyIds;

    const nextRegistered = registeredLeafIds.filter((id) => !deletedSet.has(id));
    const resolved = resolveNodeAfterDelete(
      collapsed,
      currentNodeId,
      tipNodeId,
      [...deletedSet],
    );

    setState((prev) => ({
      ...prev,
      game: collapsed,
      registeredLeafIds: nextRegistered,
      currentNodeId: resolved.currentNodeId,
      tipNodeId: resolved.tipNodeId,
    }));
    setIsDirty(true);
    return removed;
  }, [
    bumpVersion,
    currentNodeId,
    game,
    pushUndoSnapshot,
    registeredLeafIds,
    tipNodeId,
  ]);

  const undoEdit = useCallback(() => {
    const current = toSnapshot(stateRef.current);
    setUndoStack((stack) => {
      const result = popUndo(stack, current);
      if (!result) {
        return stack;
      }
      setState((prev) => ({
        ...prev,
        game: result.restored.game,
        registeredLeafIds: result.restored.registeredLeafIds,
        currentNodeId: result.restored.currentNodeId,
        tipNodeId: result.restored.tipNodeId,
      }));
      setIsDirty(true);
      return result.stack;
    });
  }, []);

  const redoEdit = useCallback(() => {
    const current = toSnapshot(stateRef.current);
    setUndoStack((stack) => {
      const result = popRedo(stack, current);
      if (!result) {
        return stack;
      }
      setState((prev) => ({
        ...prev,
        game: result.restored.game,
        registeredLeafIds: result.restored.registeredLeafIds,
        currentNodeId: result.restored.currentNodeId,
        tipNodeId: result.restored.tipNodeId,
      }));
      setIsDirty(true);
      return result.stack;
    });
  }, []);

  const saveComment = useCallback(
    (text: string) => {
      const node = getNode(game, currentNodeId);
      const trimmed = text.trim();
      const nextComment = trimmed || undefined;
      if (node?.comment === nextComment) {
        return;
      }
      pushUndoSnapshot();
      bumpVersion();
      setState((prev) => ({
        ...prev,
        game: updateNodeComment(prev.game, prev.currentNodeId, text),
      }));
      setIsDirty(true);
    },
    [bumpVersion, currentNodeId, game, pushUndoSnapshot],
  );

  const saveAnnotationsToNode = useCallback(
    (sessionShapes: BoardAnnotation[]) => {
      const node = getNode(game, currentNodeId);
      if (shapesMatchNode(sessionShapes, node)) {
        return;
      }
      const { arrows, squares } = annotationsToPgnNode(sessionShapes);
      pushUndoSnapshot();
      bumpVersion();
      setState((prev) => ({
        ...prev,
        game: updateNodeAnnotations(
          prev.game,
          prev.currentNodeId,
          arrows,
          squares,
        ),
      }));
      setIsDirty(true);
    },
    [bumpVersion, currentNodeId, game, pushUndoSnapshot],
  );

  const hasUnsavedAnnotations = useCallback(
    (sessionShapes: BoardAnnotation[]) => {
      return !shapesMatchNode(sessionShapes, getNode(game, currentNodeId));
    },
    [currentNodeId, game],
  );

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
    const nextVersion = baseMetaVersion + versionOffset;

    try {
      if (repertoireId) {
        const updated = updateRepertoire(repertoireId, {
          name: trimmedName,
          games: [updatedGame],
          registeredLeafIds,
          meta: { version: nextVersion },
        });
        setIsSaving(false);
        setIsDirty(false);
        setVersionOffset(0);
        if (updated) {
          setState((prev) => ({ ...prev, baseMetaVersion: updated.meta.version }));
        }
        return updated;
      }

      const created = createRepertoire({
        name: trimmedName,
        source: "created",
        games: [updatedGame],
        registeredLeafIds,
        meta: { version: nextVersion },
      });
      setIsSaving(false);
      setIsDirty(false);
      setVersionOffset(0);
      setState((prev) => ({
        ...prev,
        repertoireId: created.id,
        baseMetaVersion: created.meta.version,
      }));
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
  }, [
    baseMetaVersion,
    canSave,
    game,
    name,
    registeredLeafIds,
    repertoireId,
    versionOffset,
  ]);

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
    currentNode,
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
    canDeleteFromHere,
    canUndoEdit: stackCanUndo(undoStack),
    canRedoEdit: stackCanRedo(undoStack),
    emptyBranchCount,
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
    getPruneImpact,
    confirmDeleteFromHere,
    collapseEmptyBranchesAction,
    undoEdit,
    redoEdit,
    saveComment,
    saveAnnotationsToNode,
    hasUnsavedAnnotations,
    save,
  };
}
