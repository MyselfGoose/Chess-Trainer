import type { StudyGame } from "@/lib/pgn";
import { buildPath } from "@/lib/repertoires/treeBuilder";

export interface SearchableLine {
  leafNodeId: string;
  label: string;
  moveCount: number;
}

function formatLineLabel(path: ReturnType<typeof buildPath>): string {
  const parts: string[] = [];
  for (const node of path) {
    if (!node.san) {
      continue;
    }
    if (node.color === "w" && node.moveNumber !== undefined) {
      parts.push(`${node.moveNumber}.${node.san}`);
    } else if (node.color === "b" && node.moveNumber !== undefined) {
      parts.push(`${node.moveNumber}...${node.san}`);
    } else {
      parts.push(node.san);
    }
  }
  return parts.join(" ");
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

export function indexLines(game: StudyGame): SearchableLine[] {
  const leafIds = collectLeafIds(game, game.rootId);
  return leafIds.map((leafNodeId) => {
    const path = buildPath(game, leafNodeId);
    const moves = path.filter((node) => node.san !== "");
    return {
      leafNodeId,
      label: formatLineLabel(moves),
      moveCount: moves.length,
    };
  });
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function lineMatchesQuery(label: string, query: string): boolean {
  const normalizedLabel = label.toLowerCase();
  const tokens = query.split(" ").filter(Boolean);
  return tokens.every((token) => normalizedLabel.includes(token));
}

function prefixScore(label: string, query: string): number {
  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel.startsWith(query)) {
    return 3;
  }
  if (normalizedLabel.includes(` ${query}`)) {
    return 2;
  }
  if (normalizedLabel.includes(query)) {
    return 1;
  }
  return 0;
}

export function searchLines(
  index: SearchableLine[],
  query: string,
): SearchableLine[] {
  const normalized = normalizeQuery(query);
  if (normalized.length === 0) {
    return [];
  }

  return index
    .filter((line) => lineMatchesQuery(line.label, normalized))
    .sort((a, b) => {
      const scoreDiff =
        prefixScore(b.label, normalized) - prefixScore(a.label, normalized);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return a.moveCount - b.moveCount;
    });
}
