import type { StudyGame, StudyNode } from "@/lib/pgn";

export interface TreeMutationResult {
  game: StudyGame;
  affectedNodeIds: string[];
  deletedNodeIds: string[];
}

function getNode(game: StudyGame, id: string): StudyNode | undefined {
  return game.nodes[id];
}

function collectDescendantIds(game: StudyGame, nodeId: string): string[] {
  const node = getNode(game, nodeId);
  if (!node) {
    return [];
  }
  const ids: string[] = [nodeId];
  for (const childId of node.childIds) {
    ids.push(...collectDescendantIds(game, childId));
  }
  return ids;
}

function newGraftNodeId(): string {
  return `node-${crypto.randomUUID()}`;
}

function removeNodesFromGame(
  game: StudyGame,
  nodeIdsToRemove: Set<string>,
): StudyGame {
  const nodes = { ...game.nodes };
  for (const id of nodeIdsToRemove) {
    delete nodes[id];
  }

  for (const node of Object.values(nodes)) {
    if (node.childIds.some((id) => nodeIdsToRemove.has(id))) {
      nodes[node.id] = {
        ...node,
        childIds: node.childIds.filter((id) => !nodeIdsToRemove.has(id)),
      };
    }
  }

  return { ...game, nodes };
}

function recomputePathLabels(game: StudyGame, startNodeId: string): StudyGame {
  const nodes = { ...game.nodes };

  function updateChildren(parentId: string): void {
    const parent = nodes[parentId];
    if (!parent) {
      return;
    }

    parent.childIds.forEach((childId, index) => {
      const child = nodes[childId];
      if (!child) {
        return;
      }

      const isVariation = index > 0;
      let pathLabel: string;
      if (parent.id === game.rootId) {
        pathLabel =
          index === 0 ? "main" : `${parent.pathLabel}/alt-${index + 1}`;
      } else if (isVariation) {
        pathLabel = `${parent.pathLabel}/alt-${index + 1}`;
      } else {
        pathLabel = parent.pathLabel;
      }

      nodes[childId] = {
        ...child,
        pathLabel,
        isVariation,
      };
      updateChildren(childId);
    });
  }

  updateChildren(startNodeId);
  return { ...game, nodes };
}

function isNodeEmpty(node: StudyNode): boolean {
  if (node.san === "" || node.childIds.length > 0) {
    return false;
  }
  if (node.comment) {
    return false;
  }
  if (node.annotations && node.annotations.length > 0) {
    return false;
  }
  if (node.arrows && node.arrows.length > 0) {
    return false;
  }
  if (node.squares && node.squares.length > 0) {
    return false;
  }
  return true;
}

export function deleteSubtree(
  game: StudyGame,
  nodeId: string,
): TreeMutationResult {
  if (nodeId === game.rootId) {
    return {
      game,
      affectedNodeIds: [],
      deletedNodeIds: [],
    };
  }

  const node = getNode(game, nodeId);
  if (!node) {
    return {
      game,
      affectedNodeIds: [],
      deletedNodeIds: [],
    };
  }

  const deletedNodeIds = collectDescendantIds(game, nodeId);
  const deletedSet = new Set(deletedNodeIds);
  const parent = node.parentId ? getNode(game, node.parentId) : undefined;
  const affectedNodeIds = parent ? [parent.id] : [];

  const nextGame = removeNodesFromGame(game, deletedSet);

  return {
    game: nextGame,
    affectedNodeIds,
    deletedNodeIds,
  };
}

export function cloneSubtree(
  game: StudyGame,
  rootNodeId: string,
): StudyGame {
  const root = getNode(game, rootNodeId);
  if (!root) {
    return {
      meta: { ...game.meta },
      result: game.result,
      startFen: game.startFen,
      rootId: game.rootId,
      nodes: {},
    };
  }

  const idMap = new Map<string, string>();
  const collectIds = (id: string): void => {
    const node = getNode(game, id);
    if (!node) {
      return;
    }
    idMap.set(id, newGraftNodeId());
    for (const childId of node.childIds) {
      collectIds(childId);
    }
  };
  collectIds(rootNodeId);

  const nodes: Record<string, StudyNode> = {};
  for (const [oldId, newId] of idMap) {
    const original = getNode(game, oldId)!;
    const newParentId =
      original.id === rootNodeId
        ? null
        : original.parentId
          ? (idMap.get(original.parentId) ?? null)
          : null;

    nodes[newId] = {
      ...original,
      id: newId,
      parentId: newParentId,
      childIds: original.childIds
        .map((childId) => idMap.get(childId))
        .filter((id): id is string => id !== undefined),
    };
  }

  const clonedRootId = idMap.get(rootNodeId)!;
  return {
    meta: { ...game.meta },
    result: game.result,
    startFen: game.startFen,
    rootId: clonedRootId,
    nodes,
  };
}

export function graftSubtree(
  targetGame: StudyGame,
  attachAtNodeId: string,
  sourceSubtree: StudyGame,
  sourceRootChildId: string,
): TreeMutationResult {
  const attachNode = getNode(targetGame, attachAtNodeId);
  const sourceChild = getNode(sourceSubtree, sourceRootChildId);
  if (!attachNode || !sourceChild) {
    return {
      game: targetGame,
      affectedNodeIds: [],
      deletedNodeIds: [],
    };
  }

  const cloned = cloneSubtree(sourceSubtree, sourceRootChildId);
  const clonedRootId = cloned.rootId;
  const clonedRoot = cloned.nodes[clonedRootId];
  if (!clonedRoot) {
    return {
      game: targetGame,
      affectedNodeIds: [],
      deletedNodeIds: [],
    };
  }

  const graftedNodes: Record<string, StudyNode> = {};
  const graftedIds: string[] = [];

  for (const node of Object.values(cloned.nodes)) {
    graftedNodes[node.id] = { ...node };
    graftedIds.push(node.id);
  }

  const updatedAttach: StudyNode = {
    ...attachNode,
    childIds: [...attachNode.childIds, clonedRootId],
  };

  graftedNodes[clonedRootId] = {
    ...clonedRoot,
    parentId: attachNode.id,
    isVariation: attachNode.childIds.length > 0,
  };

  let nextGame: StudyGame = {
    ...targetGame,
    nodes: {
      ...targetGame.nodes,
      ...graftedNodes,
      [attachNode.id]: updatedAttach,
    },
  };

  nextGame = recomputePathLabels(nextGame, attachNode.id);

  return {
    game: nextGame,
    affectedNodeIds: [attachNode.id, ...graftedIds],
    deletedNodeIds: [],
  };
}

export function findEmptyBranches(game: StudyGame): string[] {
  return Object.values(game.nodes)
    .filter(isNodeEmpty)
    .map((node) => node.id);
}

export function collapseEmptyBranches(game: StudyGame): StudyGame {
  let current = game;
  let emptyIds = findEmptyBranches(current);
  const allDeleted: string[] = [];

  while (emptyIds.length > 0) {
    const toRemove = emptyIds.filter((id) => id !== current.rootId);
    if (toRemove.length === 0) {
      break;
    }
    for (const id of toRemove) {
      const result = deleteSubtree(current, id);
      current = result.game;
      allDeleted.push(...result.deletedNodeIds);
    }
    emptyIds = findEmptyBranches(current).filter(
      (id) => !allDeleted.includes(id),
    );
  }

  return current;
}
