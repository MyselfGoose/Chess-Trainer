import type { LineStats } from "@/lib/pgn";

interface PgnLineStatsProps {
  stats: LineStats;
}

export function PgnLineStats({ stats }: PgnLineStatsProps) {
  return (
    <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 rounded-lg bg-background px-3 py-2.5 text-sm text-foreground/90 ring-1 ring-border">
      <span>
        <span className="font-medium">{stats.lineCount}</span>{" "}
        {stats.lineCount === 1 ? "line" : "lines"}
      </span>
      <span>
        <span className="font-medium">{stats.maxDepth}</span> plies max
      </span>
      <span>
        <span className="font-medium">{stats.totalMoves}</span> moves
      </span>
      {stats.variationCount > 0 ? (
        <span>
          <span className="font-medium">{stats.variationCount}</span>{" "}
          {stats.variationCount === 1 ? "variation" : "variations"}
        </span>
      ) : null}
    </div>
  );
}
