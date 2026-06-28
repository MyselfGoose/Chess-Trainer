import type { StudyGame } from "@/lib/pgn";

import { deleteSubtree } from "./treeMutations";

export interface PruneImpact {
  positionCount: number;
  registeredLineCount: number;
  registeredLeafIds: string[];
}

function collectDescendantIds(game: StudyGame, nodeId: string): string[] {
  const node = game.nodes[nodeId];
  if (!node) {
    return [];
  }
  const ids: string[] = [nodeId];
  for (const childId of node.childIds) {
    ids.push(...collectDescendantIds(game, childId));
  }
  return ids;
}

export function computePruneImpact(
  game: StudyGame,
  nodeId: string,
  registeredLeafIds: string[],
): PruneImpact | null {
  if (nodeId === game.rootId) {
    return null;
  }

  const node = game.nodes[nodeId];
  if (!node) {
    return null;
  }

  const deletedIds = collectDescendantIds(game, nodeId);
  const deletedSet = new Set(deletedIds);
  const affectedRegistered = registeredLeafIds.filter((id) =>
    deletedSet.has(id),
  );

  return {
    positionCount: deletedIds.length,
    registeredLineCount: affectedRegistered.length,
    registeredLeafIds: affectedRegistered,
  };
}

export function pruneSubtree(
  game: StudyGame,
  nodeId: string,
  registeredLeafIds: string[],
): {
  game: StudyGame;
  registeredLeafIds: string[];
  deletedNodeIds: string[];
} | null {
  const impact = computePruneImpact(game, nodeId, registeredLeafIds);
  if (!impact) {
    return null;
  }

  const result = deleteSubtree(game, nodeId);
  if (result.deletedNodeIds.length === 0) {
    return null;
  }

  const deletedSet = new Set(result.deletedNodeIds);
  const nextRegistered = registeredLeafIds.filter((id) => !deletedSet.has(id));

  return {
    game: result.game,
    registeredLeafIds: nextRegistered,
    deletedNodeIds: result.deletedNodeIds,
  };
}
