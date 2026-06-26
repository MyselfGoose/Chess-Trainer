import type { LineStats, StudyGame, StudyNode } from "./types";

function getNode(game: StudyGame, id: string): StudyNode | undefined {
  return game.nodes[id];
}

function countLeaves(game: StudyGame, nodeId: string): number {
  const node = getNode(game, nodeId);
  if (!node || node.childIds.length === 0) {
    return 1;
  }
  return node.childIds.reduce(
    (sum, childId) => sum + countLeaves(game, childId),
    0,
  );
}

function maxDepthFrom(game: StudyGame, nodeId: string, depth: number): number {
  const node = getNode(game, nodeId);
  if (!node || node.childIds.length === 0) {
    return depth;
  }
  return Math.max(
    ...node.childIds.map((childId) =>
      maxDepthFrom(game, childId, depth + 1),
    ),
  );
}

export function computeLineStats(game: StudyGame): LineStats {
  const root = getNode(game, game.rootId);
  if (!root) {
    return {
      lineCount: 0,
      maxDepth: 0,
      totalMoves: 0,
      variationCount: 0,
    };
  }

  const moveNodes = Object.values(game.nodes).filter((node) => node.san !== "");
  const variationCount = moveNodes.filter((node) => node.isVariation).length;

  return {
    lineCount: countLeaves(game, game.rootId),
    maxDepth: maxDepthFrom(game, game.rootId, 0),
    totalMoves: moveNodes.length,
    variationCount,
  };
}
