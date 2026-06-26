import { Chess, DEFAULT_POSITION } from "chess.js";
import type { Notation, NotationList, PGN, Variation } from "@echecs/pgn";

import { notationToSan } from "./san";
import type { PgnParseIssue, StudyGame, StudyNode } from "./types";

let nodeCounter = 0;

function nextNodeId(): string {
  nodeCounter += 1;
  return `node-${nodeCounter}`;
}

function resetNodeCounter(): void {
  nodeCounter = 0;
}

function getStartFen(meta: PGN["meta"]): string {
  if (meta.SetUp === "1" && meta.FEN) {
    return meta.FEN;
  }
  return DEFAULT_POSITION;
}

function formatResult(result: PGN["result"]): string {
  switch (result) {
    case 1:
      return "1-0";
    case 0:
      return "0-1";
    case 0.5:
      return "1/2-1/2";
    default:
      return "*";
  }
}

function metaToRecord(meta: PGN["meta"]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined) {
      record[key] = value;
    }
  }
  return record;
}

interface BuildContext {
  nodes: Record<string, StudyNode>;
  errors: PgnParseIssue[];
}

function createRootNode(startFen: string): StudyNode {
  const id = nextNodeId();
  return {
    id,
    san: "",
    fen: startFen,
    color: null,
    ply: 0,
    parentId: null,
    childIds: [],
    pathLabel: "root",
    isVariation: false,
  };
}

function attachNode(
  ctx: BuildContext,
  parent: StudyNode,
  notation: Notation,
  chess: Chess,
  options: {
    moveNumber?: number;
    color: "w" | "b";
    pathLabel: string;
    isVariation: boolean;
    ply: number;
  },
): StudyNode | null {
  const san = notationToSan(notation);
  let move;

  try {
    move = chess.move(san);
  } catch {
    ctx.errors.push({
      message: `Illegal move ${san} at ply ${options.ply}`,
    });
    return null;
  }

  if (!move) {
    ctx.errors.push({
      message: `Could not apply move ${san} at ply ${options.ply}`,
    });
    return null;
  }

  const node: StudyNode = {
    id: nextNodeId(),
    san,
    fen: chess.fen(),
    color: options.color,
    moveNumber: options.moveNumber,
    ply: options.ply,
    from: move.from,
    to: move.to,
    comment: notation.comment,
    annotations: notation.annotations,
    arrows: notation.arrows,
    squares: notation.squares,
    clock: notation.clock,
    eval: notation.eval,
    parentId: parent.id,
    childIds: [],
    pathLabel: options.pathLabel,
    isVariation: options.isVariation,
  };

  ctx.nodes[node.id] = node;
  parent.childIds.push(node.id);
  return node;
}

function processNotationList(
  pairs: NotationList,
  chess: Chess,
  parent: StudyNode,
  ctx: BuildContext,
  pathLabel: string,
  isVariationBranch: boolean,
  startPly: number,
): number {
  let ply = startPly;
  let currentParent = parent;

  for (const [moveNumber, whiteMove, blackMove] of pairs) {
    if (whiteMove) {
      const fenBefore = chess.fen();
      const node = attachNode(ctx, currentParent, whiteMove, chess, {
        moveNumber,
        color: "w",
        pathLabel,
        isVariation: isVariationBranch,
        ply,
      });

      if (node) {
        ply += 1;
        processVariations(
          whiteMove.variants,
          fenBefore,
          currentParent,
          ctx,
          pathLabel,
          ply,
        );
        currentParent = node;
      }
    }

    if (blackMove) {
      const fenBefore = chess.fen();
      const node = attachNode(ctx, currentParent, blackMove, chess, {
        moveNumber,
        color: "b",
        pathLabel,
        isVariation: isVariationBranch,
        ply,
      });

      if (node) {
        ply += 1;
        processVariations(
          blackMove.variants,
          fenBefore,
          currentParent,
          ctx,
          pathLabel,
          ply,
        );
        currentParent = node;
      }
    }
  }

  return ply;
}

function processVariations(
  variations: Variation | undefined,
  fenBefore: string,
  parent: StudyNode,
  ctx: BuildContext,
  pathLabel: string,
  ply: number,
): void {
  if (!variations || variations.length === 0) {
    return;
  }

  variations.forEach((variationList, index) => {
    const branchChess = new Chess(fenBefore);
    const branchLabel = `${pathLabel}/alt-${index + 1}`;
    processNotationList(
      variationList,
      branchChess,
      parent,
      ctx,
      branchLabel,
      true,
      ply,
    );
  });
}

export function buildStudyGame(
  game: PGN,
  errors: PgnParseIssue[],
): StudyGame {
  resetNodeCounter();
  const ctx: BuildContext = { nodes: {}, errors };
  const startFen = getStartFen(game.meta);
  const root = createRootNode(startFen);
  ctx.nodes[root.id] = root;

  const chess = new Chess(startFen);
  processNotationList(game.moves, chess, root, ctx, "main", false, 1);

  return {
    meta: metaToRecord(game.meta),
    result: formatResult(game.result),
    startFen,
    rootId: root.id,
    nodes: ctx.nodes,
  };
}
