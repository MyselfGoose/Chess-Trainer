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
    <div className="flex h-full max-h-[calc(100vh-3rem)] flex-col gap-4 lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">Repertoire</h2>
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

      <details className="rounded-lg bg-white ring-1 ring-zinc-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-700">
          Game info & stats
        </summary>
        <div className="flex flex-col gap-3 border-t border-zinc-100 px-4 pb-4 pt-3">
          <PgnHeadersCard game={currentGame} />
          <PgnLineStats stats={lineStats} />
        </div>
      </details>

      <PgnPathBar
        path={currentPath}
        currentNodeId={currentNodeId}
        onSelect={onSelectNode}
      />

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg bg-white p-3 ring-1 ring-zinc-200">
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
        className="w-full rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Back one move
      </button>
    </div>
  );
}
