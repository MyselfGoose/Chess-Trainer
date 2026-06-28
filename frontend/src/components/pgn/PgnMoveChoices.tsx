"use client";

import { useState } from "react";

import {
  ENGINE_SUGGESTION_LABEL,
  formatCompareDelta,
  formatEvalScore,
  type CompareMoveResult,
} from "@/lib/engine";
import { formatAnnotations } from "@/lib/pgn";
import type { MoveChoice } from "@/lib/pgn";

interface PgnMoveChoicesProps {
  choices: MoveChoice[];
  currentNodeId: string | null;
  turnLabel: string;
  isAtLineEnd: boolean;
  isAtRoot: boolean;
  orientation: "white" | "black";
  compareResults?: Map<string, CompareMoveResult>;
  onSelect: (nodeId: string) => void;
}

function formatMoveLabel(choice: MoveChoice): string {
  const { node } = choice;
  if (node.color === "w" && node.moveNumber) {
    return `${node.moveNumber}. ${node.san}`;
  }
  if (node.color === "b" && node.moveNumber) {
    return `${node.moveNumber}...${node.san}`;
  }
  return node.san;
}

function MoveChoiceCard({
  choice,
  isSelected,
  compareResult,
  orientation,
  onSelect,
}: {
  choice: MoveChoice;
  isSelected: boolean;
  compareResult?: CompareMoveResult;
  orientation: "white" | "black";
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const nagText = formatAnnotations(choice.node.annotations);
  const comment = choice.node.comment;
  const showExpand = Boolean(comment && comment.length > 80);

  const evalLabel = compareResult
    ? formatEvalScore(compareResult, orientation)
    : null;
  const deltaLabel = compareResult
    ? formatCompareDelta(compareResult.deltaFromBestCp)
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-11 w-full rounded-lg border p-2.5 text-left transition ${
        isSelected
          ? "border-accent bg-accent-muted ring-1 ring-accent"
          : "border-border bg-surface hover:border-accent/70 hover:bg-accent-muted/50"
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="min-w-0 break-words font-mono text-base font-semibold text-foreground">
          {formatMoveLabel(choice)}
          {nagText ? (
            <span className="ml-1 font-normal text-muted-foreground">{nagText}</span>
          ) : null}
        </span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {compareResult ? (
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                compareResult.rank === 1
                  ? "bg-surface-muted text-foreground"
                  : "bg-background text-muted-foreground ring-1 ring-border"
              }`}
              title={`${ENGINE_SUGGESTION_LABEL} — may differ from repertoire prep.`}
              aria-label={`${ENGINE_SUGGESTION_LABEL}: ${evalLabel}, ${deltaLabel} from best`}
            >
              {evalLabel}
              {compareResult.rank === 1 ? (
                <span className="ml-1 text-[9px] uppercase tracking-wide">best</span>
              ) : (
                <span className="ml-1">{deltaLabel}</span>
              )}
            </span>
          ) : null}
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              choice.isMainLine
                ? "bg-accent-subtle text-accent-foreground"
                : "bg-warning-muted text-warning-foreground"
            }`}
          >
            {choice.isMainLine ? "Main" : "Alt"}
          </span>
        </div>
      </div>

      {choice.lineCount > 1 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Continues {choice.lineCount} lines
        </p>
      ) : null}

      {comment ? (
        <p
          className={`mt-1.5 break-words text-sm leading-snug text-muted-foreground ${
            expanded ? "" : "line-clamp-2"
          }`}
        >
          {comment}
        </p>
      ) : null}

      {showExpand ? (
        <span
          role="presentation"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          className="mt-1 inline-block text-xs font-medium text-accent hover:text-accent-foreground"
        >
          {expanded ? "Show less" : "Show more"}
        </span>
      ) : null}
    </button>
  );
}

export function PgnMoveChoices({
  choices,
  currentNodeId,
  turnLabel,
  isAtLineEnd,
  isAtRoot,
  orientation,
  compareResults,
  onSelect,
}: PgnMoveChoicesProps) {
  if (isAtLineEnd) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-background p-6 text-center">
        <p className="font-medium text-foreground">End of this line</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Use Back or click a move in the path to explore another branch.
        </p>
      </div>
    );
  }

  if (choices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-background p-6 text-center">
        <p className="font-medium text-foreground">
          {isAtRoot ? "No moves in this repertoire" : "No continuations here"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground/90">
        {turnLabel} to move — {choices.length}{" "}
        {choices.length === 1 ? "option" : "options"}
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {choices.map((choice) => (
          <MoveChoiceCard
            key={choice.node.id}
            choice={choice}
            isSelected={currentNodeId === choice.node.id}
            compareResult={compareResults?.get(choice.node.id)}
            orientation={orientation}
            onSelect={() => onSelect(choice.node.id)}
          />
        ))}
      </div>
    </div>
  );
}
