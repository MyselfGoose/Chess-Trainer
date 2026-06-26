import type { LineStats } from "@/lib/pgn";

interface PgnLineStatsProps {
  stats: LineStats;
}

export function PgnLineStats({ stats }: PgnLineStatsProps) {
  return (
    <div className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-700 ring-1 ring-zinc-200">
      <span className="font-medium">{stats.lineCount}</span>{" "}
      {stats.lineCount === 1 ? "line" : "lines"}
      <span className="mx-2 text-zinc-300">·</span>
      <span className="font-medium">{stats.maxDepth}</span> plies max depth
      <span className="mx-2 text-zinc-300">·</span>
      <span className="font-medium">{stats.totalMoves}</span> moves
      {stats.variationCount > 0 ? (
        <>
          <span className="mx-2 text-zinc-300">·</span>
          <span className="font-medium">{stats.variationCount}</span> variation
          {stats.variationCount === 1 ? "" : "s"}
        </>
      ) : null}
    </div>
  );
}
