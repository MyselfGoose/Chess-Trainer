import { Chess, DEFAULT_POSITION } from "chess.js";
import type { Square } from "chess.js";

import type { PromotionPiece } from "@/lib/chess/types";
import type { StudyGame, StudyNode } from "@/lib/pgn";

let nodeCounter = 0;

function nextNodeId(): string {
  nodeCounter += 1;
  return `node-${nodeCounter}`;
}

export function resetNodeCounter(): void {
  nodeCounter = 0;
}

export function syncNodeCounterFromGame(game: StudyGame): void {
  let max = 0;
  for (const id of Object.keys(game.nodes)) {
    const match = /^node-(\d+)$/.exec(id);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  nodeCounter = max;
}

function getNode(game: StudyGame, id: string): StudyNode | undefined {
  return game.nodes[id];
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

export function createEmptyStudyGame(name: string): StudyGame {
  resetNodeCounter();
  const startFen = DEFAULT_POSITION;
  const root = createRootNode(startFen);
  return {
    meta: {
      Event: name,
      Site: "RepertoireLab",
      Date: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
      White: "?",
      Black: "?",
      Result: "*",
    },
    result: "*",
    startFen,
    rootId: root.id,
    nodes: { [root.id]: root },
  };
}

export interface ApplyMoveResult {
  game: StudyGame;
  nodeId: string;
  created: boolean;
}

export function applyMove(
  game: StudyGame,
  parentNodeId: string,
  from: Square,
  to: Square,
  promotion?: PromotionPiece,
): ApplyMoveResult | null {
  const parent = getNode(game, parentNodeId);
  if (!parent) {
    return null;
  }

  const chess = new Chess(parent.fen);
  let move;
  try {
    move = chess.move({ from, to, promotion });
  } catch {
    return null;
  }
  if (!move) {
    return null;
  }

  const san = move.san;
  const existingChild = parent.childIds
    .map((id) => getNode(game, id))
    .find((node) => node?.san === san);

  if (existingChild) {
    return { game, nodeId: existingChild.id, created: false };
  }

  const ply = parent.ply + 1;
  const color = move.color;
  const moveNumber =
    color === "w" ? Math.floor((ply + 1) / 2) : parent.moveNumber;
  const isVariation = parent.childIds.length > 0;
  const pathLabel = isVariation
    ? `${parent.pathLabel}/alt-${parent.childIds.length + 1}`
    : parent.id === game.rootId
      ? "main"
      : parent.pathLabel;

  const node: StudyNode = {
    id: nextNodeId(),
    san,
    fen: chess.fen(),
    color,
    moveNumber,
    ply,
    from: move.from,
    to: move.to,
    parentId: parent.id,
    childIds: [],
    pathLabel,
    isVariation,
  };

  const updatedParent: StudyNode = {
    ...parent,
    childIds: [...parent.childIds, node.id],
  };

  return {
    game: {
      ...game,
      nodes: {
        ...game.nodes,
        [parent.id]: updatedParent,
        [node.id]: node,
      },
    },
    nodeId: node.id,
    created: true,
  };
}

export interface RegisteredLine {
  leafId: string;
  label: string;
  moves: string[];
}

export function buildPath(game: StudyGame, nodeId: string): StudyNode[] {
  const path: StudyNode[] = [];
  let current: StudyNode | undefined = getNode(game, nodeId);
  while (current) {
    path.unshift(current);
    if (!current.parentId) {
      break;
    }
    current = getNode(game, current.parentId);
  }
  return path;
}

export function getRegisteredLines(
  game: StudyGame,
  registeredLeafIds: string[],
): RegisteredLine[] {
  return registeredLeafIds.map((leafId) => {
    const path = buildPath(game, leafId);
    const moves = path.filter((node) => node.san !== "").map((node) => node.san);
    return {
      leafId,
      label: moves.join(" "),
      moves,
    };
  });
}

export function registerLine(
  game: StudyGame,
  nodeId: string,
  registeredLeafIds: string[],
): { ok: true; registeredLeafIds: string[] } | { ok: false; reason: string } {
  const node = getNode(game, nodeId);
  if (!node) {
    return { ok: false, reason: "Position not found." };
  }
  if (node.id === game.rootId) {
    return { ok: false, reason: "Play at least one move before registering." };
  }
  if (node.childIds.length > 0) {
    return {
      ok: false,
      reason: "Register at the end of a line with no further moves.",
    };
  }
  if (registeredLeafIds.includes(nodeId)) {
    return { ok: false, reason: "This line is already registered." };
  }
  return { ok: true, registeredLeafIds: [...registeredLeafIds, nodeId] };
}

export function unregisterLine(
  registeredLeafIds: string[],
  leafId: string,
): string[] {
  return registeredLeafIds.filter((id) => id !== leafId);
}

export function isLeaf(game: StudyGame, nodeId: string): boolean {
  const node = getNode(game, nodeId);
  return Boolean(node && node.childIds.length === 0);
}

export function canUndoMove(
  game: StudyGame,
  nodeId: string,
  registeredLeafIds: string[],
): boolean {
  const node = getNode(game, nodeId);
  if (!node || node.id === game.rootId) {
    return false;
  }
  if (registeredLeafIds.includes(node.id)) {
    return false;
  }
  const hasRegisteredDescendant = registeredLeafIds.some((leafId) => {
    const path = buildPath(game, leafId);
    return path.some((pathNode) => pathNode.id === node.id);
  });
  if (hasRegisteredDescendant) {
    return false;
  }
  return node.childIds.length === 0;
}

export function undoLastMove(
  game: StudyGame,
  nodeId: string,
): { game: StudyGame; nodeId: string } | null {
  const node = getNode(game, nodeId);
  if (!node || !node.parentId || node.childIds.length > 0) {
    return null;
  }

  const parent = getNode(game, node.parentId);
  if (!parent) {
    return null;
  }

  const updatedParent: StudyNode = {
    ...parent,
    childIds: parent.childIds.filter((id) => id !== node.id),
  };

  const nextNodes = { ...game.nodes, [parent.id]: updatedParent };
  delete nextNodes[node.id];

  return {
    game: { ...game, nodes: nextNodes },
    nodeId: parent.id,
  };
}
