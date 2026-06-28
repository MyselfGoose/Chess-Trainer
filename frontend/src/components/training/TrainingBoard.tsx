"use client";

import { type ReactNode } from "react";
import type { Square } from "chess.js";

import { ChessBoard } from "@/components/chess/ChessBoard";
import { useBoardAnnotationState } from "@/hooks/useBoardAnnotationState";

interface TrainingBoardProps {
  fen: string;
  lastMove: [Square, Square] | null;
  orientation: "white" | "black";
  movableDests: Map<Square, Square[]>;
  isUserTurn: boolean;
  onMove: (from: Square, to: Square) => boolean;
}

function BoardFrame({ children }: { children: ReactNode }) {
  return (
    <div className="board-fit-container">
      <div className="board-fit-square rounded-sm p-1 shadow-lg ring-1 ring-border">
        {children}
      </div>
    </div>
  );
}

export function TrainingBoard({
  fen,
  lastMove,
  orientation,
  movableDests,
  isUserTurn,
  onMove,
}: TrainingBoardProps) {
  const boardAnnotations = useBoardAnnotationState();

  return (
    <BoardFrame>
      <ChessBoard
        mode="study"
        fen={fen}
        lastMove={lastMove}
        repertoireDests={isUserTurn ? movableDests : new Map()}
        onRepertoireMove={onMove}
        orientation={orientation}
        annotations={boardAnnotations.annotations}
      />
    </BoardFrame>
  );
}
