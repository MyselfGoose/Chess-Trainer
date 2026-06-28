"use client";

import type { MoveChoice, StudyGame } from "@/lib/pgn";

import { PgnCommentCard } from "./PgnCommentCard";
import { PgnMoveChoices } from "./PgnMoveChoices";

interface PgnStudyMovesPanelProps {
  currentGame: StudyGame;
  currentNodeId: string | null;
  availableMoves: MoveChoice[];
  turnLabel: string;
  isAtLineEnd: boolean;
  onSelectChoice: (nodeId: string) => void;
  onBack: () => void;
}

export function PgnStudyMovesPanel({
  currentGame,
  currentNodeId,
  availableMoves,
  turnLabel,
  isAtLineEnd,
  onSelectChoice,
  onBack,
}: PgnStudyMovesPanelProps) {
  const currentNode = currentNodeId ? currentGame.nodes[currentNodeId] : null;
  const canGoBack = Boolean(currentNode?.parentId);
  const isAtRoot = currentNode?.id === currentGame.rootId;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden p-3 lg:p-4">
      <PgnCommentCard node={currentNode} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-background ring-1 ring-border">
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <PgnMoveChoices
            choices={availableMoves}
            currentNodeId={currentNodeId}
            turnLabel={turnLabel}
            isAtLineEnd={isAtLineEnd}
            isAtRoot={isAtRoot}
            onSelect={onSelectChoice}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        className="min-h-11 w-full shrink-0 rounded-md bg-surface-muted px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        Back one move
      </button>
    </aside>
  );
}
