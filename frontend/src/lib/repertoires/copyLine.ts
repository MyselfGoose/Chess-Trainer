import { fenKey } from "@/lib/chess/fen";
import type { StudyGame } from "@/lib/pgn";

import { buildPath } from "./treeBuilder";
import { graftSubtree, type TreeMutationResult } from "./treeMutations";

export interface CopyLineRequest {
  sourceGame: StudyGame;
  sourceLeafNodeId: string;
  targetGame: StudyGame;
  attachAtNodeId: string;
}

export type GraftFenCheck =
  | {
      ok: true;
      sourceRootChildId: string;
      requiredFen: string;
    }
  | {
      ok: false;
      reason: string;
      requiredFen: string;
      attachFen: string;
    };

export class CopyLineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CopyLineError";
  }
}

export function resolveSourceRootChildId(
  game: StudyGame,
  leafNodeId: string,
): string | null {
  const path = buildPath(game, leafNodeId);
  const firstMove = path.find((node) => node.san !== "");
  return firstMove?.id ?? null;
}

function formatLineLabel(game: StudyGame, leafNodeId: string): string {
  const path = buildPath(game, leafNodeId);
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

export function checkGraftFenMatch(request: CopyLineRequest): GraftFenCheck {
  const attachNode = request.targetGame.nodes[request.attachAtNodeId];
  if (!attachNode) {
    return {
      ok: false,
      reason: "Attach position not found.",
      requiredFen: "",
      attachFen: "",
    };
  }

  const sourceRootChildId = resolveSourceRootChildId(
    request.sourceGame,
    request.sourceLeafNodeId,
  );
  if (!sourceRootChildId) {
    return {
      ok: false,
      reason: "Source line has no moves.",
      requiredFen: "",
      attachFen: attachNode.fen,
    };
  }

  const sourceChild = request.sourceGame.nodes[sourceRootChildId];
  const parentId = sourceChild?.parentId;
  if (!parentId) {
    return {
      ok: false,
      reason: "Invalid source line.",
      requiredFen: "",
      attachFen: attachNode.fen,
    };
  }

  const parent = request.sourceGame.nodes[parentId];
  const requiredFen = parent?.fen ?? "";
  const attachFen = attachNode.fen;

  if (fenKey(requiredFen) !== fenKey(attachFen)) {
    return {
      ok: false,
      reason:
        "FEN mismatch: the attach position does not match the start of the source line.",
      requiredFen,
      attachFen,
    };
  }

  return { ok: true, sourceRootChildId, requiredFen };
}

export function previewCopyLineSan(request: CopyLineRequest): string {
  const check = checkGraftFenMatch(request);
  if (!check.ok) {
    return "";
  }
  return formatLineLabel(request.sourceGame, request.sourceLeafNodeId);
}

export function copyLineToGame(request: CopyLineRequest): TreeMutationResult {
  const check = checkGraftFenMatch(request);
  if (!check.ok) {
    throw new CopyLineError(check.reason);
  }

  return graftSubtree(
    request.targetGame,
    request.attachAtNodeId,
    request.sourceGame,
    check.sourceRootChildId,
  );
}
