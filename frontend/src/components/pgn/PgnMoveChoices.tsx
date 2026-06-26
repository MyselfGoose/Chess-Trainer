"use client";

import { useState } from "react";

import { formatAnnotations } from "@/lib/pgn";
import type { MoveChoice } from "@/lib/pgn";

interface PgnMoveChoicesProps {
  choices: MoveChoice[];
  currentNodeId: string | null;
  turnLabel: string;
  isAtLineEnd: boolean;
  isAtRoot: boolean;
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
  onSelect,
}: {
  choice: MoveChoice;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const nagText = formatAnnotations(choice.node.annotations);
  const comment = choice.node.comment;
  const showExpand = comment && comment.length > 120;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border p-3 text-left transition ${
        isSelected
          ? "border-green-600 bg-green-50 ring-1 ring-green-600"
          : "border-zinc-200 bg-white hover:border-green-400 hover:bg-green-50/50"
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="min-w-0 break-words font-mono text-base font-semibold text-zinc-900">
          {formatMoveLabel(choice)}
          {nagText ? (
            <span className="ml-1 font-normal text-zinc-500">{nagText}</span>
          ) : null}
        </span>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            choice.isMainLine
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {choice.isMainLine ? "Main" : "Alt"}
        </span>
      </div>

      {choice.lineCount > 1 ? (
        <p className="mt-1 text-xs text-zinc-500">
          Continues {choice.lineCount} lines
        </p>
      ) : null}

      {comment ? (
        <p
          className={`mt-2 break-words text-sm leading-relaxed text-zinc-600 ${
            expanded ? "" : "line-clamp-3"
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
          className="mt-1 inline-block text-xs font-medium text-green-700 hover:text-green-800"
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
  onSelect,
}: PgnMoveChoicesProps) {
  if (isAtLineEnd) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
        <p className="font-medium text-zinc-800">End of this line</p>
        <p className="mt-1 text-sm text-zinc-500">
          Use Back or click a move in the path to explore another branch.
        </p>
      </div>
    );
  }

  if (choices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
        <p className="font-medium text-zinc-800">
          {isAtRoot ? "No moves in this repertoire" : "No continuations here"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="text-sm font-medium text-zinc-700">
        {turnLabel} to move — {choices.length}{" "}
        {choices.length === 1 ? "option" : "options"}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {choices.map((choice) => (
          <MoveChoiceCard
            key={choice.node.id}
            choice={choice}
            isSelected={currentNodeId === choice.node.id}
            onSelect={() => onSelect(choice.node.id)}
          />
        ))}
      </div>
    </div>
  );
}
