"use client";

import type { MoveChoice, StudyGame } from "@/lib/pgn";
import type { BoardOrientation } from "@/lib/repertoires";

import { EnginePanel } from "@/components/engine/EnginePanel";
import { CompareMovesBranch } from "./CompareMovesSection";
import { PgnCommentCard } from "./PgnCommentCard";

interface PgnStudyMovesPanelProps {
  currentGame: StudyGame;
  currentNodeId: string | null;
  availableMoves: MoveChoice[];
  turnLabel: string;
  isAtLineEnd: boolean;
  boardFen: string;
  orientation: BoardOrientation;
  onSelectChoice: (nodeId: string) => void;
  onBack: () => void;
}

export function PgnStudyMovesPanel({
  currentGame,
  currentNodeId,
  availableMoves,
  turnLabel,
  isAtLineEnd,
  boardFen,
  orientation,
  onSelectChoice,
  onBack,
}: PgnStudyMovesPanelProps) {
  const currentNode = currentNodeId ? currentGame.nodes[currentNodeId] : null;
  const canGoBack = Boolean(currentNode?.parentId);
  const branchKey = `${boardFen}|${availableMoves
    .map((choice) => choice.node.id)
    .join(",")}`;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden p-3 lg:p-4">
      <div className="hidden shrink-0 lg:block">
        <EnginePanel fen={boardFen} orientation={orientation} />
      </div>

      <PgnCommentCard node={currentNode} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-background ring-1 ring-border">
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <CompareMovesBranch
            branchKey={branchKey}
            boardFen={boardFen}
            orientation={orientation}
            availableMoves={availableMoves}
            currentNodeId={currentNodeId}
            turnLabel={turnLabel}
            isAtLineEnd={isAtLineEnd}
            isAtRoot={currentNode?.id === currentGame.rootId}
            onSelectChoice={onSelectChoice}
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
