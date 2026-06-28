import type { Repertoire } from "./types";
import { extractTrainingLines } from "@/lib/training/lines";
import { buildPath } from "./treeBuilder";

export interface RepertoireGap {
  leafNodeId: string;
  label: string;
  missingComment: boolean;
  missingAnnotation: boolean;
}

function formatLabel(moves: ReturnType<typeof buildPath>): string {
  const parts: string[] = [];
  for (const node of moves) {
    if (!node.san) {
      continue;
    }
    if (node.color === "w" && node.moveNumber !== undefined) {
      parts.push(`${node.moveNumber}.${node.san}`);
    } else {
      parts.push(node.san);
    }
  }
  return parts.join(" ");
}

export function findGaps(repertoire: Repertoire): RepertoireGap[] {
  const lines = extractTrainingLines(repertoire);
  const gaps: RepertoireGap[] = [];

  for (const line of lines) {
    const game = repertoire.games[line.gameIndex];
    if (!game) {
      continue;
    }
    const path = buildPath(game, line.leafNodeId);
    const leaf = game.nodes[line.leafNodeId];
    const lastMove = path[path.length - 1];
    const missingComment = !leaf?.comment?.trim() && !lastMove?.comment?.trim();
    const missingAnnotation =
      !(leaf?.arrows?.length || leaf?.squares?.length) &&
      !(lastMove?.arrows?.length || lastMove?.squares?.length);

    if (missingComment || missingAnnotation) {
      gaps.push({
        leafNodeId: line.leafNodeId,
        label: line.label || formatLabel(path),
        missingComment,
        missingAnnotation,
      });
    }
  }

  return gaps;
}
