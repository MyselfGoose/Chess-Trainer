"use client";

import { useState } from "react";

import {
  COMPARE_MOVES_MAX_ALTERNATIVES,
  ENGINE_SUGGESTION_LABEL,
  sideToMoveFromFen,
} from "@/lib/engine";
import type { MoveChoice } from "@/lib/pgn";
import type { BoardOrientation } from "@/lib/repertoires";
import { useCompareMoves } from "@/hooks/useCompareMoves";

import { PgnMoveChoices } from "./PgnMoveChoices";

interface CompareMovesSectionProps {
  boardFen: string;
  orientation: BoardOrientation;
  availableMoves: MoveChoice[];
  currentNodeId: string | null;
  turnLabel: string;
  isAtLineEnd: boolean;
  isAtRoot: boolean;
  onSelectChoice: (nodeId: string) => void;
}

function CompareMovesSection({
  boardFen,
  orientation,
  availableMoves,
  currentNodeId,
  turnLabel,
  isAtLineEnd,
  isAtRoot,
  onSelectChoice,
}: CompareMovesSectionProps) {
  const [compareActive, setCompareActive] = useState(false);
  const canCompare = !isAtLineEnd && availableMoves.length >= 2;
  const moverColor = sideToMoveFromFen(boardFen) ?? "w";
  const alternatives = availableMoves
    .slice(0, COMPARE_MOVES_MAX_ALTERNATIVES)
    .map((choice) => ({
      nodeId: choice.node.id,
      san: choice.node.san,
      fenAfter: choice.node.fen,
    }));

  const compare = useCompareMoves({
    parentFen: boardFen,
    moverColor,
    alternatives,
    enabled: compareActive,
  });

  const handleCompare = () => {
    setCompareActive(true);
  };

  const handleCancelCompare = () => {
    setCompareActive(false);
    compare.cancelCompare();
  };

  return (
    <>
      {canCompare ? (
        <div className="mb-3 space-y-2 border-b border-border/70 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCompare}
              disabled={compare.status === "loading"}
              className="min-h-9 rounded-md bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Compare moves
            </button>
            {compare.status === "loading" ? (
              <button
                type="button"
                onClick={handleCancelCompare}
                className="min-h-9 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                Cancel
              </button>
            ) : null}
            {compare.status === "loading" ? (
              <span className="text-xs text-muted-foreground" aria-live="polite">
                Analyzing {compare.progress.done}/{compare.progress.total}…
              </span>
            ) : null}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {ENGINE_SUGGESTION_LABEL} — may differ from repertoire prep.
          </p>
          {compare.error ? (
            <p className="text-xs text-danger">{compare.error}</p>
          ) : null}
        </div>
      ) : null}

      <PgnMoveChoices
        choices={availableMoves}
        currentNodeId={currentNodeId}
        turnLabel={turnLabel}
        isAtLineEnd={isAtLineEnd}
        isAtRoot={isAtRoot}
        orientation={orientation}
        compareResults={compare.results}
        onSelect={onSelectChoice}
      />
    </>
  );
}

interface CompareMovesBranchProps extends CompareMovesSectionProps {
  branchKey: string;
}

export function CompareMovesBranch({
  branchKey,
  ...props
}: CompareMovesBranchProps) {
  return <CompareMovesSection key={branchKey} {...props} />;
}
