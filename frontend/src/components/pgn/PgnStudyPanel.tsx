"use client";

import type { LineStats, StudyGame, StudyNode } from "@/lib/pgn";

import { PgnBreadcrumb } from "./PgnBreadcrumb";
import { PgnGameSelector } from "./PgnGameSelector";
import { PgnHeadersCard } from "./PgnHeadersCard";
import { PgnLineStats } from "./PgnLineStats";
import { PgnMoveTreeRoot } from "./PgnMoveTree";

interface PgnStudyPanelProps {
  games: StudyGame[];
  selectedGameIndex: number;
  currentGame: StudyGame;
  currentNodeId: string | null;
  currentPath: StudyNode[];
  lineStats: LineStats;
  onSelectGame: (index: number) => void;
  onSelectNode: (nodeId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onClear: () => void;
}

export function PgnStudyPanel({
  games,
  selectedGameIndex,
  currentGame,
  currentNodeId,
  currentPath,
  lineStats,
  onSelectGame,
  onSelectNode,
  onPrev,
  onNext,
  onClear,
}: PgnStudyPanelProps) {
  const currentNode = currentNodeId ? currentGame.nodes[currentNodeId] : null;
  const canGoPrev = Boolean(currentNode?.parentId);
  const canGoNext = Boolean(currentNode && currentNode.childIds.length > 0);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">Study</h2>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        >
          Clear study
        </button>
      </div>

      <PgnGameSelector
        games={games}
        selectedIndex={selectedGameIndex}
        onSelect={onSelectGame}
      />

      <PgnHeadersCard game={currentGame} />
      <PgnLineStats stats={lineStats} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canGoPrev}
          className="flex-1 rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className="flex-1 rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <PgnBreadcrumb path={currentPath} />

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg bg-white p-3 ring-1 ring-zinc-200">
        <PgnMoveTreeRoot
          game={currentGame}
          currentNodeId={currentNodeId}
          onSelect={onSelectNode}
        />
      </div>
    </div>
  );
}
