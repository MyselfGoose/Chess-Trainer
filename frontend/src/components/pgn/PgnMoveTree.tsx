"use client";

import type { StudyGame } from "@/lib/pgn";

import { PgnMoveTree } from "./PgnMoveNode";

interface PgnMoveTreeRootProps {
  game: StudyGame;
  currentNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

export function PgnMoveTreeRoot({
  game,
  currentNodeId,
  onSelect,
}: PgnMoveTreeRootProps) {
  return (
    <PgnMoveTree
      game={game}
      parentId={game.rootId}
      currentNodeId={currentNodeId}
      onSelect={onSelect}
      depth={0}
    />
  );
}
