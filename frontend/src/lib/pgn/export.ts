import type { Arrow, SquareAnnotation } from "@echecs/pgn";

import type { Repertoire } from "@/lib/repertoires/types";

import { formatNagsForExport } from "./nags";
import type { StudyGame, StudyNode } from "./types";

function getNode(game: StudyGame, id: string): StudyNode | undefined {
  return game.nodes[id];
}

export function escapePgnComment(text: string): string {
  return text.replace(/}/g, "\\}");
}

function formatCal(arrows: Arrow[]): string {
  if (arrows.length === 0) {
    return "";
  }
  const items = arrows.map((arrow) => `${arrow.color}${arrow.from}${arrow.to}`);
  return `[%cal ${items.join(",")}]`;
}

function formatCsl(squares: SquareAnnotation[]): string {
  if (squares.length === 0) {
    return "";
  }
  const items = squares.map((square) => `${square.color}${square.square}`);
  return `[%csl ${items.join(",")}]`;
}

export function formatPgnAnnotations(node: StudyNode): string {
  const parts: string[] = [];
  const cal = formatCal(node.arrows ?? []);
  const csl = formatCsl(node.squares ?? []);
  if (cal) {
    parts.push(cal);
  }
  if (csl) {
    parts.push(csl);
  }
  return parts.join(" ");
}

function formatMoveSuffix(node: StudyNode): string {
  const nagText = formatNagsForExport(node.annotations);
  const annotationText = formatPgnAnnotations(node);
  const commentParts: string[] = [];

  if (node.comment) {
    commentParts.push(escapePgnComment(node.comment));
  }
  if (annotationText) {
    commentParts.push(annotationText);
  }

  const commentBlock =
    commentParts.length > 0 ? ` {${commentParts.join(" ")}}` : "";

  const nagSuffix = nagText ? ` ${nagText}` : "";
  return `${nagSuffix}${commentBlock}`;
}

function formatMove(
  node: StudyNode,
  options?: { inlineBlack?: boolean },
): string {
  const moveNumber =
    node.color === "w" && node.moveNumber !== undefined
      ? `${node.moveNumber}. `
      : node.color === "b" &&
          node.moveNumber !== undefined &&
          !options?.inlineBlack
        ? `${node.moveNumber}... `
        : "";
  return `${moveNumber}${node.san}${formatMoveSuffix(node)}`;
}

function emitSequence(game: StudyGame, startNode: StudyNode): string {
  const parts: string[] = [];
  let current: StudyNode | undefined = startNode;

  while (current) {
    parts.push(formatMove(current));

    const children = current.childIds;
    if (children.length === 0) {
      break;
    }

    const mainId = children[0];
    const mainNode = getNode(game, mainId);
    if (!mainNode) {
      break;
    }

    const inlineBlack =
      current.color === "w" &&
      mainNode.color === "b" &&
      mainNode.moveNumber === current.moveNumber;
    parts.push(formatMove(mainNode, { inlineBlack }));

    for (const altId of children.slice(1)) {
      const altNode = getNode(game, altId);
      if (altNode) {
        parts.push(`(${emitSequence(game, altNode)})`);
      }
    }

    const continuationId =
      mainNode.childIds.length > 0 ? mainNode.childIds[0] : undefined;
    current = continuationId ? getNode(game, continuationId) : undefined;
  }

  return parts.join(" ");
}

function formatHeaders(meta: Record<string, string>): string {
  const entries = Object.entries(meta);
  if (entries.length === 0) {
    return `[Event "?"]\n[Site "?"]\n[Date "????.??.??"]\n[Round "?"]\n[White "?"]\n[Black "?"]\n[Result "*"]`;
  }
  return entries.map(([key, value]) => `[${key} "${value}"]`).join("\n");
}

export function studyGameToPgn(game: StudyGame): string {
  const root = getNode(game, game.rootId);
  if (!root) {
    return "";
  }

  const headers = formatHeaders(game.meta);
  const moves =
    root.childIds.length > 0
      ? root.childIds
          .map((childId) => {
            const child = getNode(game, childId);
            return child ? emitSequence(game, child) : "";
          })
          .filter(Boolean)
          .join(" ")
      : "*";

  const result = game.result && game.result !== "*" ? game.result : "*";
  const movetext = moves.endsWith(result) ? moves : `${moves} ${result}`;

  return `${headers}\n\n${movetext}\n`;
}

export function repertoireToPgn(games: StudyGame[]): string {
  return games.map(studyGameToPgn).join("\n");
}

export type ExportScope = "currentGame" | "fullRepertoire" | "chapter";

export interface ExportRepertoireOptions {
  scope: ExportScope;
  gameIndex?: number;
  chapterId?: string;
}

function parseGameIndexFromLineId(lineId: string): number | null {
  const match = /^(\d+):/.exec(lineId);
  if (!match) {
    return null;
  }
  const index = Number(match[1]);
  return Number.isInteger(index) && index >= 0 ? index : null;
}

export function gameIndicesForChapter(
  repertoire: Repertoire,
  chapterId: string,
): number[] {
  const chapter = repertoire.meta.chapters.find(
    (entry) => entry.id === chapterId,
  );
  if (!chapter) {
    return [];
  }
  const indices = new Set<number>();
  for (const lineId of chapter.lineIds) {
    const gameIndex = parseGameIndexFromLineId(lineId);
    if (gameIndex !== null) {
      indices.add(gameIndex);
    }
  }
  return [...indices].sort((left, right) => left - right);
}

export function gamesForChapter(
  repertoire: Repertoire,
  chapterId: string,
): StudyGame[] {
  return gameIndicesForChapter(repertoire, chapterId)
    .map((index) => repertoire.games[index])
    .filter((game): game is StudyGame => game !== undefined);
}

export function exportRepertoirePgn(
  repertoire: Repertoire,
  options: ExportRepertoireOptions,
): string {
  switch (options.scope) {
    case "fullRepertoire":
      return repertoireToPgn(repertoire.games);
    case "currentGame": {
      const index = options.gameIndex ?? 0;
      const game = repertoire.games[index];
      return game ? studyGameToPgn(game) : "";
    }
    case "chapter": {
      if (!options.chapterId) {
        return "";
      }
      return repertoireToPgn(gamesForChapter(repertoire, options.chapterId));
    }
    default: {
      const exhaustive: never = options.scope;
      return exhaustive;
    }
  }
}

export function buildExportFileName(
  repertoireName: string,
  options: ExportRepertoireOptions,
  repertoire: Repertoire,
): string {
  const base = repertoireName.trim() || "repertoire";
  switch (options.scope) {
    case "fullRepertoire":
      return base;
    case "currentGame": {
      const index = options.gameIndex ?? 0;
      const event = repertoire.games[index]?.meta.Event?.trim();
      return event ? `${base} - ${event}` : `${base} - game ${index + 1}`;
    }
    case "chapter": {
      const chapter = repertoire.meta.chapters.find(
        (entry) => entry.id === options.chapterId,
      );
      return chapter ? `${base} - ${chapter.name}` : `${base} - chapter`;
    }
    default: {
      const exhaustive: never = options.scope;
      return exhaustive;
    }
  }
}

export function downloadPgnFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "application/x-chess-pgn" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".pgn") ? fileName : `${fileName}.pgn`;
  anchor.click();
  URL.revokeObjectURL(url);
}
