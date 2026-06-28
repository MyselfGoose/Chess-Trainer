"use client";

import { getMastery } from "@/lib/training/mastery";
import type { TrainingLine } from "@/lib/training/types";

interface CoverageMapProps {
  lines: TrainingLine[];
  repertoireId: string;
}

const LEVEL_COLORS: Record<string, string> = {
  mastered: "bg-accent",
  review: "bg-warning",
  learning: "bg-warning/70",
  new: "bg-border-strong",
  untrained: "bg-border",
};

function levelForLine(lineId: string, repertoireId: string): string {
  const mastery = getMastery(lineId);
  if (!mastery || mastery.repertoireId !== repertoireId) {
    return "untrained";
  }
  if (mastery.attemptCount === 0) {
    return "new";
  }
  return mastery.level;
}

export function CoverageMap({ lines, repertoireId }: CoverageMapProps) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-foreground/90">Coverage map</h3>
      <div className="mt-2 grid grid-cols-4 gap-1 sm:grid-cols-6">
        {lines.map((line) => {
          const level = levelForLine(line.id, repertoireId);
          return (
            <div
              key={line.id}
              title={`${line.label} — ${level}`}
              className={`h-6 rounded ${LEVEL_COLORS[level] ?? LEVEL_COLORS.untrained}`}
            />
          );
        })}
      </div>
      <ul className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <li className="flex items-center gap-1">
          <span className={`inline-block h-3 w-3 rounded ${LEVEL_COLORS.mastered}`} />
          Mastered
        </li>
        <li className="flex items-center gap-1">
          <span className={`inline-block h-3 w-3 rounded ${LEVEL_COLORS.learning}`} />
          Learning
        </li>
        <li className="flex items-center gap-1">
          <span className={`inline-block h-3 w-3 rounded ${LEVEL_COLORS.untrained}`} />
          Untrained
        </li>
      </ul>
    </div>
  );
}
