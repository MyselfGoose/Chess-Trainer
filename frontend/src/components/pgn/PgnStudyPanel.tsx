"use client";

import type { LineStats, MoveChoice, StudyGame, StudyNode } from "@/lib/pgn";

import { PgnGameSelector } from "./PgnGameSelector";
import { PgnHeadersCard } from "./PgnHeadersCard";
import { PgnLineStats } from "./PgnLineStats";
import { PgnMoveChoices } from "./PgnMoveChoices";
import { PgnPathBar } from "./PgnPathBar";

interface PgnStudyPanelProps {
  games: StudyGame[];
  selectedGameIndex: number;
  currentGame: StudyGame;
  currentNodeId: string | null;
  currentPath: StudyNode[];
  availableMoves: MoveChoice[];
  turnLabel: string;
  isAtLineEnd: boolean;
  lineStats: LineStats;
  onSelectGame: (index: number) => void;
  onSelectNode: (nodeId: string) => void;
  onSelectChoice: (nodeId: string) => void;
  onBack: () => void;
  onClear: () => void;
}

export function PgnStudyPanel({
  games,
  selectedGameIndex,
  currentGame,
  currentNodeId,
  currentPath,
  availableMoves,
  turnLabel,
  isAtLineEnd,
  lineStats,
  onSelectGame,
  onSelectNode,
  onSelectChoice,
  onBack,
  onClear,
}: PgnStudyPanelProps) {
  const currentNode = currentNodeId ? currentGame.nodes[currentNodeId] : null;
  const canGoBack = Boolean(currentNode?.parentId);
  const isAtRoot = currentNode?.id === currentGame.rootId;

  return (
    <aside className="flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden p-4">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h2 className="truncate text-lg font-semibold text-zinc-900">
          Repertoire
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        >
          Clear study
        </button>
      </div>

      <div className="min-w-0">
        <PgnGameSelector
          games={games}
          selectedIndex={selectedGameIndex}
          onSelect={onSelectGame}
        />
      </div>

      <details className="min-w-0 overflow-hidden rounded-lg ring-1 ring-zinc-200">
        <summary className="cursor-pointer px-3 py-2.5 text-sm font-medium text-zinc-700">
          Game info & stats
        </summary>
        <div className="flex min-w-0 flex-col gap-3 border-t border-zinc-100 px-3 pb-3 pt-2">
          <PgnHeadersCard game={currentGame} compact />
          <PgnLineStats stats={lineStats} />
        </div>
      </details>

      <PgnPathBar
        path={currentPath}
        currentNodeId={currentNodeId}
        onSelect={onSelectNode}
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
        <PgnMoveChoices
          choices={availableMoves}
          currentNodeId={currentNodeId}
          turnLabel={turnLabel}
          isAtLineEnd={isAtLineEnd}
          isAtRoot={isAtRoot}
          onSelect={onSelectChoice}
        />
      </div>

      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        className="w-full shrink-0 rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Back one move
      </button>
    </aside>
  );
}
