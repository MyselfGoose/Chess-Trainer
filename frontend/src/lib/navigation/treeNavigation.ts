import type { StudyGame, StudyNode } from "@/lib/pgn/types";

function getNode(game: StudyGame, id: string): StudyNode | undefined {
  return game.nodes[id];
}

export function buildNodePath(game: StudyGame, nodeId: string): StudyNode[] {
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

export function isNodeOnPathTo(
  game: StudyGame,
  nodeId: string,
  targetId: string,
): boolean {
  return buildNodePath(game, targetId).some((node) => node.id === nodeId);
}

export function getForwardNodeId(
  game: StudyGame,
  currentId: string,
  tipId: string,
): string | null {
  const pathToTip = buildNodePath(game, tipId);
  const currentIndex = pathToTip.findIndex((node) => node.id === currentId);
  if (currentIndex === -1 || currentIndex >= pathToTip.length - 1) {
    return null;
  }
  return pathToTip[currentIndex + 1]?.id ?? null;
}

export function resolveTipAfterNavigate(
  game: StudyGame,
  prevTipId: string,
  newCurrentId: string,
): string {
  if (newCurrentId === prevTipId) {
    return prevTipId;
  }
  if (isNodeOnPathTo(game, newCurrentId, prevTipId)) {
    return prevTipId;
  }
  return newCurrentId;
}

export function canNavigateBack(
  game: StudyGame,
  currentId: string,
): boolean {
  const node = getNode(game, currentId);
  return Boolean(node?.parentId);
}

export function canNavigateForward(
  game: StudyGame,
  currentId: string,
  tipId: string,
): boolean {
  return getForwardNodeId(game, currentId, tipId) !== null;
}

export function canNavigateToStart(
  game: StudyGame,
  currentId: string,
): boolean {
  return currentId !== game.rootId;
}

export function canNavigateToEnd(
  game: StudyGame,
  currentId: string,
  tipId: string,
): boolean {
  return currentId !== tipId;
}

export function clampTipToGame(
  game: StudyGame,
  tipId: string,
  fallbackId: string,
): string {
  return getNode(game, tipId) ? tipId : fallbackId;
}
