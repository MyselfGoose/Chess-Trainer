import { isValidFen } from "@/lib/chess/fen";
import { indexLines, searchLines } from "@/lib/pgn/lineSearch";
import { findNodesByFen } from "@/lib/pgn/positionIndex";
import type { StudyGame, StudyNode } from "@/lib/pgn";
import { buildPath } from "@/lib/repertoires/treeBuilder";
import type { Repertoire } from "@/lib/repertoires/types";

export type SearchResultType = "line" | "comment" | "position";

export interface GlobalSearchResult {
  repertoireId: string;
  repertoireName: string;
  gameIndex: number;
  nodeId: string;
  label: string;
  matchType: SearchResultType;
  snippet?: string;
}

export interface GlobalSearchOptions {
  fenOnly?: boolean;
  limit?: number;
}

const DEFAULT_LIMIT = 50;
const SNIPPET_MAX_LENGTH = 80;

const MATCH_TYPE_PRIORITY: Record<SearchResultType, number> = {
  line: 3,
  comment: 2,
  position: 1,
};

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatPathLabel(path: StudyNode[]): string {
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

function truncateSnippet(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= SNIPPET_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, SNIPPET_MAX_LENGTH - 1)}…`;
}

function resultKey(result: GlobalSearchResult): string {
  return `${result.repertoireId}:${result.gameIndex}:${result.nodeId}:${result.matchType}`;
}

function searchLinesInGame(
  repertoire: Repertoire,
  gameIndex: number,
  game: StudyGame,
  normalizedQuery: string,
): GlobalSearchResult[] {
  const lineIndex = indexLines(game);
  const matches = searchLines(lineIndex, normalizedQuery);
  return matches.map((line) => ({
    repertoireId: repertoire.id,
    repertoireName: repertoire.name,
    gameIndex,
    nodeId: line.leafNodeId,
    label: line.label,
    matchType: "line" as const,
  }));
}

function searchCommentsInGame(
  repertoire: Repertoire,
  gameIndex: number,
  game: StudyGame,
  normalizedQuery: string,
): GlobalSearchResult[] {
  const results: GlobalSearchResult[] = [];

  for (const node of Object.values(game.nodes)) {
    if (!node.comment) {
      continue;
    }
    if (!node.comment.toLowerCase().includes(normalizedQuery)) {
      continue;
    }
    const path = buildPath(game, node.id);
    const label = formatPathLabel(path.filter((entry) => entry.san !== ""));
    results.push({
      repertoireId: repertoire.id,
      repertoireName: repertoire.name,
      gameIndex,
      nodeId: node.id,
      label: label.length > 0 ? label : "Starting position",
      matchType: "comment",
      snippet: truncateSnippet(node.comment),
    });
  }

  return results;
}

function searchPositionsInRepertoire(
  repertoire: Repertoire,
  fenQuery: string,
): GlobalSearchResult[] {
  const entries = findNodesByFen(repertoire, fenQuery);
  const results: GlobalSearchResult[] = [];

  for (const entry of entries) {
    for (const ref of entry.nodeIds) {
      const game = repertoire.games[ref.gameIndex];
      if (!game) {
        continue;
      }
      const node = game.nodes[ref.nodeId];
      if (!node) {
        continue;
      }
      const path = buildPath(game, ref.nodeId);
      const label = formatPathLabel(path.filter((pathNode) => pathNode.san !== ""));
      results.push({
        repertoireId: repertoire.id,
        repertoireName: repertoire.name,
        gameIndex: ref.gameIndex,
        nodeId: ref.nodeId,
        label: label.length > 0 ? label : "Starting position",
        matchType: "position",
        snippet: node.fen,
      });
    }
  }

  return results;
}

function sortResults(
  results: GlobalSearchResult[],
  normalizedQuery: string,
): GlobalSearchResult[] {
  return [...results].sort((a, b) => {
    const typeDiff =
      MATCH_TYPE_PRIORITY[b.matchType] - MATCH_TYPE_PRIORITY[a.matchType];
    if (typeDiff !== 0) {
      return typeDiff;
    }

    if (a.matchType === "line" && b.matchType === "line") {
      const scoreDiff =
        prefixScore(b.label, normalizedQuery) -
        prefixScore(a.label, normalizedQuery);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
    }

    const nameDiff = a.repertoireName.localeCompare(b.repertoireName);
    if (nameDiff !== 0) {
      return nameDiff;
    }

    return a.label.localeCompare(b.label);
  });
}

export function searchAllRepertoires(
  catalog: Repertoire[],
  query: string,
  options?: GlobalSearchOptions,
): GlobalSearchResult[] {
  const normalizedQuery = normalizeQuery(query);
  if (normalizedQuery.length === 0) {
    return [];
  }

  const limit = options?.limit ?? DEFAULT_LIMIT;
  const fenOnly = options?.fenOnly ?? false;
  const fenQuery = query.trim();
  const isFenQuery = isValidFen(fenQuery);

  if (fenOnly && !isFenQuery) {
    return [];
  }

  const seen = new Set<string>();
  const collected: GlobalSearchResult[] = [];

  const addResults = (batch: GlobalSearchResult[]): void => {
    for (const result of batch) {
      const key = resultKey(result);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      collected.push(result);
    }
  };

  for (const repertoire of catalog) {
    if (!fenOnly) {
      repertoire.games.forEach((game, gameIndex) => {
        addResults(searchLinesInGame(repertoire, gameIndex, game, normalizedQuery));
        addResults(
          searchCommentsInGame(repertoire, gameIndex, game, normalizedQuery),
        );
      });
    }

    if (fenOnly || isFenQuery) {
      addResults(searchPositionsInRepertoire(repertoire, fenQuery));
    }
  }

  return sortResults(collected, normalizedQuery).slice(0, limit);
}
