"use client";

import { useCallback, useMemo, useState } from "react";
import type { Square } from "chess.js";

import {
  clearStudy,
  computeLineStats,
  loadStudy,
  saveStudy,
} from "@/lib/pgn";
import type { LineStats, StoredPgnStudy, StudyGame, StudyNode } from "@/lib/pgn";

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
  lineStats: LineStats | null;
  boardFen: string;
  boardLastMove: [Square, Square] | null;
  hasStudy: boolean;
  goToNode: (nodeId: string) => void;
  goPrev: () => void;
  goNext: () => void;
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

  const goToNode = useCallback(
    (nodeId: string) => {
      if (!currentGame || !getNode(currentGame, nodeId)) {
        return;
      }
      setUiState((prev) => ({ ...prev, currentNodeId: nodeId }));
    },
    [currentGame],
  );

  const goPrev = useCallback(() => {
    if (!currentNode?.parentId) {
      return;
    }
    setUiState((prev) => ({ ...prev, currentNodeId: currentNode.parentId }));
  }, [currentNode]);

  const goNext = useCallback(() => {
    if (!currentGame || !currentNode) {
      return;
    }
    const mainChildId = currentNode.childIds.find((childId) => {
      const child = getNode(currentGame, childId);
      return child && !child.isVariation;
    });
    const nextId = mainChildId ?? currentNode.childIds[0];
    if (nextId) {
      setUiState((prev) => ({ ...prev, currentNodeId: nextId }));
    }
  }, [currentGame, currentNode]);

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
    lineStats,
    boardFen,
    boardLastMove,
    hasStudy: study !== null && study.games.length > 0,
    goToNode,
    goPrev,
    goNext,
    selectGame,
    clearStudyData,
    reloadStudy,
  };
}
