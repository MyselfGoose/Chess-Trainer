import type { StudyGame } from "@/lib/pgn";

import { registerLine } from "./treeBuilder";

function collectLeafIds(game: StudyGame, nodeId: string): string[] {
  const node = game.nodes[nodeId];
  if (!node) {
    return [];
  }
  if (node.childIds.length === 0) {
    return node.id === game.rootId ? [] : [node.id];
  }
  return node.childIds.flatMap((childId) => collectLeafIds(game, childId));
}

export function findLeavesAtMaxDepth(
  game: StudyGame,
  maxPly: number,
): string[] {
  if (maxPly < 0) {
    return [];
  }
  return collectLeafIds(game, game.rootId).filter((leafId) => {
    const node = game.nodes[leafId];
    return node !== undefined && node.ply <= maxPly;
  });
}

export function mergeRegisteredLeaves(
  registeredLeafIds: string[],
  leafIds: string[],
): string[] {
  const merged = new Set(registeredLeafIds);
  for (const leafId of leafIds) {
    merged.add(leafId);
  }
  return [...merged];
}

export interface BulkRegisterPreview {
  toRegister: string[];
  alreadyRegistered: string[];
  skippedNonLeaf: string[];
}

export function previewBulkRegister(
  game: StudyGame,
  registeredLeafIds: string[],
  maxPly: number,
): BulkRegisterPreview {
  const candidates = findLeavesAtMaxDepth(game, maxPly);
  const toRegister: string[] = [];
  const alreadyRegistered: string[] = [];
  const skippedNonLeaf: string[] = [];

  for (const leafId of candidates) {
    if (registeredLeafIds.includes(leafId)) {
      alreadyRegistered.push(leafId);
      continue;
    }
    const result = registerLine(game, leafId, registeredLeafIds);
    if (result.ok) {
      toRegister.push(leafId);
    } else if (result.reason.includes("end of a line")) {
      skippedNonLeaf.push(leafId);
    }
  }

  return { toRegister, alreadyRegistered, skippedNonLeaf };
}

export function applyBulkRegister(
  game: StudyGame,
  registeredLeafIds: string[],
  maxPly: number,
): { registeredLeafIds: string[]; addedCount: number } {
  const preview = previewBulkRegister(game, registeredLeafIds, maxPly);
  return {
    registeredLeafIds: mergeRegisteredLeaves(
      registeredLeafIds,
      preview.toRegister,
    ),
    addedCount: preview.toRegister.length,
  };
}
