"use client";

import type { LineStats, StudyGame, StudyNode } from "@/lib/pgn";
import type { RepertoireGap } from "@/lib/repertoires/gaps";

import { PgnGameSelector } from "./PgnGameSelector";
import { PgnHeadersCard } from "./PgnHeadersCard";
import { PgnLineSearch } from "./PgnLineSearch";
import { PgnLineStats } from "./PgnLineStats";
import { PgnPathBar } from "./PgnPathBar";

interface PgnStudyToolsPanelProps {
  games: StudyGame[];
  selectedGameIndex: number;
  currentGame: StudyGame;
  currentNodeId: string | null;
  currentPath: StudyNode[];
  lineStats: LineStats;
  repertoireName?: string;
  preparationGaps?: RepertoireGap[];
  onSelectGame: (index: number) => void;
  onSelectNode: (nodeId: string) => void;
  onNavigateToGap?: (leafNodeId: string) => void;
  onSelectSearchLine?: (leafNodeId: string) => void;
}

export function PgnStudyToolsPanel({
  games,
  selectedGameIndex,
  currentGame,
  currentNodeId,
  currentPath,
  lineStats,
  repertoireName,
  preparationGaps = [],
  onSelectGame,
  onSelectNode,
  onNavigateToGap,
  onSelectSearchLine,
}: PgnStudyToolsPanelProps) {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-3 overflow-y-auto overflow-x-hidden p-3 lg:p-4">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h2 className="truncate text-base font-semibold text-zinc-900 lg:text-lg">
          {repertoireName ?? "Repertoire"}
        </h2>
        <a
          href="/repertoires"
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-green-700 transition hover:bg-green-50"
        >
          Library
        </a>
      </div>

      {onSelectSearchLine ? (
        <PgnLineSearch game={currentGame} onSelect={onSelectSearchLine} />
      ) : null}

      <PgnGameSelector
        games={games}
        selectedIndex={selectedGameIndex}
        onSelect={onSelectGame}
      />

      <PgnPathBar
        path={currentPath}
        currentNodeId={currentNodeId}
        onSelect={onSelectNode}
      />

      {preparationGaps.length > 0 && onNavigateToGap ? (
        <details className="shrink-0 rounded-lg ring-1 ring-zinc-200">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-700">
            Preparation gaps ({preparationGaps.length})
          </summary>
          <ul className="max-h-36 space-y-1 overflow-y-auto border-t border-zinc-100 px-2 py-2">
            {preparationGaps.map((gap) => (
              <li key={gap.leafNodeId}>
                <button
                  type="button"
                  onClick={() => onNavigateToGap(gap.leafNodeId)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                >
                  <span className="font-mono">{gap.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <details className="shrink-0 rounded-lg ring-1 ring-zinc-200">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-700">
          Game info & stats
        </summary>
        <div className="flex flex-col gap-3 border-t border-zinc-100 px-3 pb-3 pt-2">
          <PgnHeadersCard game={currentGame} compact />
          <PgnLineStats stats={lineStats} />
        </div>
      </details>
    </aside>
  );
}
