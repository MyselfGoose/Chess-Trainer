import type { StudyGame, StudyNode } from "@/lib/pgn";

import { DEFAULT_REPERTOIRE_META } from "./meta";
import type { Repertoire } from "./types";

export type ForkRegisterStrategy = "all" | "none";

export interface ForkRepertoireOptions {
  name: string;
  registerLines: ForkRegisterStrategy;
}

export interface CloneGameResult {
  game: StudyGame;
  idMap: Map<string, string>;
}

function newCloneNodeId(): string {
  return `node-${crypto.randomUUID()}`;
}

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

export function cloneStudyGame(game: StudyGame): CloneGameResult {
  const idMap = new Map<string, string>();

  for (const oldId of Object.keys(game.nodes)) {
    idMap.set(oldId, newCloneNodeId());
  }

  const nodes: Record<string, StudyNode> = {};
  for (const [oldId, node] of Object.entries(game.nodes)) {
    const newId = idMap.get(oldId)!;
    nodes[newId] = {
      ...node,
      id: newId,
      parentId: node.parentId ? (idMap.get(node.parentId) ?? null) : null,
      childIds: node.childIds
        .map((childId) => idMap.get(childId))
        .filter((childId): childId is string => childId !== undefined),
    };
  }

  const rootId = idMap.get(game.rootId) ?? game.rootId;

  return {
    game: {
      meta: { ...game.meta },
      result: game.result,
      startFen: game.startFen,
      rootId,
      nodes,
    },
    idMap,
  };
}

export function forkRepertoire(
  repertoire: Repertoire,
  options: ForkRepertoireOptions,
): Repertoire {
  const trimmedName = options.name.trim();
  const clonedGames: StudyGame[] = [];
  const allLeafIds: string[] = [];

  for (const game of repertoire.games) {
    const { game: cloned, idMap } = cloneStudyGame(game);
    clonedGames.push(cloned);
    if (options.registerLines === "all") {
      const sourceLeaves = collectLeafIds(game, game.rootId);
      for (const leafId of sourceLeaves) {
        const mapped = idMap.get(leafId);
        if (mapped) {
          allLeafIds.push(mapped);
        }
      }
    }
  }

  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: trimmedName,
    source: "created",
    createdAt: now,
    updatedAt: now,
    fileName: repertoire.fileName,
    games: clonedGames,
    registeredLeafIds: options.registerLines === "all" ? allLeafIds : [],
    meta: {
      ...DEFAULT_REPERTOIRE_META,
      forkedFromId: repertoire.id,
    },
  };
}
