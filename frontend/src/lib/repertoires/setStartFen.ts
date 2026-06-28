import { Chess, DEFAULT_POSITION } from "chess.js";

import { isValidFen, normalizeFen } from "@/lib/chess/fen";
import type { StudyGame, StudyNode } from "@/lib/pgn";

import { syncNodeCounterFromGame } from "./treeBuilder";

function hasMoves(game: StudyGame): boolean {
  return Object.values(game.nodes).some((node) => node.san !== "");
}

export function setGameStartFen(
  game: StudyGame,
  fen: string,
  options?: { force?: boolean },
): { ok: true; game: StudyGame } | { ok: false; reason: string } {
  const trimmed = fen.trim();
  if (!trimmed) {
    return { ok: false, reason: "FEN cannot be empty." };
  }
  if (!isValidFen(trimmed)) {
    return { ok: false, reason: "Invalid FEN." };
  }

  if (hasMoves(game) && !options?.force) {
    return {
      ok: false,
      reason: "This repertoire already has moves. Confirm to clear the tree.",
    };
  }

  const root = game.nodes[game.rootId];
  if (!root) {
    return { ok: false, reason: "Invalid game tree." };
  }

  const chess = new Chess(trimmed);
  const normalizedStart = chess.fen();
  const isStandard =
    normalizeFen(normalizedStart) === normalizeFen(DEFAULT_POSITION);

  const updatedRoot: StudyNode = {
    ...root,
    san: "",
    fen: normalizedStart,
    color: null,
    ply: 0,
    moveNumber: undefined,
    from: undefined,
    to: undefined,
    comment: undefined,
    annotations: undefined,
    arrows: undefined,
    squares: undefined,
    clock: undefined,
    eval: undefined,
    childIds: [],
    parentId: null,
    pathLabel: "root",
    isVariation: false,
  };

  const meta = { ...game.meta };
  if (isStandard) {
    delete meta.SetUp;
    delete meta.FEN;
  } else {
    meta.SetUp = "1";
    meta.FEN = normalizedStart;
  }

  const nextGame: StudyGame = {
    ...game,
    meta,
    startFen: normalizedStart,
    nodes: { [root.id]: updatedRoot },
  };

  syncNodeCounterFromGame(nextGame);
  return { ok: true, game: nextGame };
}

export function gameHasMoves(game: StudyGame): boolean {
  return hasMoves(game);
}
