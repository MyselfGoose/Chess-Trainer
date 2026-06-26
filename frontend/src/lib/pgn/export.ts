import type { StudyGame, StudyNode } from "./types";

function getNode(game: StudyGame, id: string): StudyNode | undefined {
  return game.nodes[id];
}

function formatMoveNumber(node: StudyNode): string {
  if (node.color === "w" && node.moveNumber !== undefined) {
    return `${node.moveNumber}. `;
  }
  if (node.color === "b" && node.moveNumber !== undefined) {
    return `${node.moveNumber}... `;
  }
  return "";
}

function emitVariations(
  game: StudyGame,
  parent: StudyNode,
  mainChildId: string,
): string {
  const altChildren = parent.childIds.filter((id) => id !== mainChildId);
  if (altChildren.length === 0) {
    return "";
  }

  return altChildren
    .map((childId) => {
      const child = getNode(game, childId);
      if (!child) {
        return "";
      }
      return ` (${emitLine(game, child)})`;
    })
    .join("");
}

function emitLine(game: StudyGame, startNode: StudyNode): string {
  const parts: string[] = [];
  let current: StudyNode | undefined = startNode;

  while (current) {
    parts.push(`${formatMoveNumber(current)}${current.san}`);
    if (current.comment) {
      parts.push(` {${current.comment}}`);
    }

    const mainChildId: string | undefined = current.childIds[0];
    if (!mainChildId) {
      break;
    }

    const variations = emitVariations(game, current, mainChildId);
    parts.push(variations);

    current = getNode(game, mainChildId);
  }

  return parts.join("");
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
            return child ? emitLine(game, child) : "";
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

export function downloadPgnFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "application/x-chess-pgn" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".pgn") ? fileName : `${fileName}.pgn`;
  anchor.click();
  URL.revokeObjectURL(url);
}
