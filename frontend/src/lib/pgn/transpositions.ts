import type { StudyGame } from "@/lib/pgn";
import { buildPath } from "@/lib/repertoires/treeBuilder";

export interface TranspositionGroup {
  fen: string;
  nodeIds: string[];
  labels: string[];
}

export function normalizeFen(fen: string): string {
  const parts = fen.split(" ");
  return parts.slice(0, 4).join(" ");
}

function labelForNode(game: StudyGame, nodeId: string): string {
  const path = buildPath(game, nodeId);
  return path
    .filter((node) => node.san)
    .map((node) => node.san)
    .join(" ");
}

export function buildFenIndex(game: StudyGame): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const allNodes = Object.values(game.nodes);
  for (const node of allNodes) {
    if (!node.fen) {
      continue;
    }
    const key = normalizeFen(node.fen);
    const existing = index.get(key) ?? [];
    if (!existing.includes(node.id)) {
      existing.push(node.id);
    }
    index.set(key, existing);
  }
  return index;
}

export function findTranspositions(game: StudyGame): TranspositionGroup[] {
  const index = buildFenIndex(game);
  const groups: TranspositionGroup[] = [];

  for (const [fen, nodeIds] of index) {
    if (nodeIds.length < 2) {
      continue;
    }
    const uniquePaths = new Set<string>();
    const labels: string[] = [];
    for (const nodeId of nodeIds) {
      const label = labelForNode(game, nodeId);
      if (!uniquePaths.has(label)) {
        uniquePaths.add(label);
        labels.push(label);
      }
    }
    if (labels.length >= 2) {
      groups.push({ fen, nodeIds, labels });
    }
  }

  return groups;
}

export function findAlternativePaths(
  game: StudyGame,
  currentNodeId: string,
): string[] {
  const node = game.nodes[currentNodeId];
  if (!node?.fen) {
    return [];
  }
  const index = buildFenIndex(game);
  const nodeIds = index.get(normalizeFen(node.fen)) ?? [];
  return nodeIds
    .filter((id) => id !== currentNodeId)
    .map((id) => labelForNode(game, id))
    .filter(Boolean);
}
