import type { StudyGame, StudyNode } from "@/lib/pgn";
import { buildPath } from "@/lib/repertoires/treeBuilder";
import type { Repertoire } from "@/lib/repertoires";

import type { TrainingColor, TrainingLine } from "./types";
import { trainingColorToNodeColor } from "./types";

function getNode(game: StudyGame, id: string): StudyNode | undefined {
  return game.nodes[id];
}

function collectLeafIds(game: StudyGame, nodeId: string): string[] {
  const node = getNode(game, nodeId);
  if (!node) {
    return [];
  }
  if (node.childIds.length === 0) {
    return node.id === game.rootId ? [] : [node.id];
  }
  return node.childIds.flatMap((childId) => collectLeafIds(game, childId));
}

function formatLineLabel(moves: StudyNode[]): string {
  const parts: string[] = [];
  for (const move of moves) {
    if (move.color === "w" && move.moveNumber !== undefined) {
      parts.push(`${move.moveNumber}.${move.san}`);
    } else if (move.color === "b" && move.moveNumber !== undefined) {
      parts.push(`${move.moveNumber}...${move.san}`);
    } else {
      parts.push(move.san);
    }
  }
  return parts.join(" ");
}

function lineFromLeaf(
  game: StudyGame,
  gameIndex: number,
  leafNodeId: string,
): TrainingLine | null {
  const path = buildPath(game, leafNodeId);
  const moves = path.filter((node) => node.san !== "");
  if (moves.length === 0) {
    return null;
  }
  return {
    id: `${gameIndex}:${leafNodeId}`,
    repertoireId: "",
    gameIndex,
    leafNodeId,
    startFen: game.startFen,
    moves,
    label: formatLineLabel(moves),
  };
}

function leafIdsForGame(
  repertoire: Repertoire,
  game: StudyGame,
): string[] {
  if (repertoire.source === "created") {
    return repertoire.registeredLeafIds.filter((leafId) => {
      const node = game.nodes[leafId];
      return node !== undefined;
    });
  }
  return collectLeafIds(game, game.rootId);
}

export function extractTrainingLines(repertoire: Repertoire): TrainingLine[] {
  const lines: TrainingLine[] = [];
  repertoire.games.forEach((game, gameIndex) => {
    const leafIds = leafIdsForGame(repertoire, game);
    for (const leafId of leafIds) {
      const line = lineFromLeaf(game, gameIndex, leafId);
      if (line) {
        lines.push({ ...line, repertoireId: repertoire.id });
      }
    }
  });
  return lines;
}

export function filterLinesForColor(
  lines: TrainingLine[],
  userColor: TrainingColor,
): TrainingLine[] {
  const nodeColor = trainingColorToNodeColor(userColor);
  return lines.filter((line) =>
    line.moves.some((move) => move.color === nodeColor),
  );
}

export function countUserMovesInLine(
  line: TrainingLine,
  userColor: TrainingColor,
): number {
  const nodeColor = trainingColorToNodeColor(userColor);
  return line.moves.filter((move) => move.color === nodeColor).length;
}

export function shuffleLines<T>(lines: T[]): T[] {
  const result = [...lines];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function countTrainableLines(
  repertoire: Repertoire,
  userColor: TrainingColor,
): number {
  return filterLinesForColor(extractTrainingLines(repertoire), userColor).length;
}

function pathContainsNode(
  game: StudyGame,
  leafNodeId: string,
  anchorNodeId: string,
): boolean {
  const path = buildPath(game, leafNodeId);
  return path.some((node) => node.id === anchorNodeId);
}

export function filterLinesFromAnchor(
  lines: TrainingLine[],
  game: StudyGame,
  anchorNodeId: string,
): TrainingLine[] {
  return lines.filter((line) =>
    pathContainsNode(game, line.leafNodeId, anchorNodeId),
  );
}

export function filterLinesFromAnchorForGame(
  lines: TrainingLine[],
  games: StudyGame[],
  anchorNodeId: string,
): TrainingLine[] {
  return lines.filter((line) => {
    const game = games[line.gameIndex];
    if (!game) {
      return false;
    }
    return pathContainsNode(game, line.leafNodeId, anchorNodeId);
  });
}

export function applySessionLineLimit(
  lines: TrainingLine[],
  maxLines: number,
  shuffle: boolean,
): TrainingLine[] {
  const ordered = shuffle ? shuffleLines(lines) : [...lines];
  if (maxLines <= 0 || maxLines >= ordered.length) {
    return ordered;
  }
  return ordered.slice(0, maxLines);
}
