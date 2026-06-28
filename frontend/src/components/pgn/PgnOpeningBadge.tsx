"use client";

import type { OpeningInfo } from "@/lib/openings";

interface PgnOpeningBadgeProps {
  opening: OpeningInfo | null;
  isLoading: boolean;
}

export function PgnOpeningBadge({ opening, isLoading }: PgnOpeningBadgeProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-md bg-surface-muted px-2.5 py-1.5 text-xs text-muted-foreground"
        aria-live="polite"
      >
        Looking up opening…
      </div>
    );
  }

  if (!opening) {
    return null;
  }

  return (
    <div
      className="truncate rounded-md bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-foreground/90"
      title={`${opening.eco} — ${opening.name}`}
    >
      <span className="text-muted-foreground">{opening.eco}</span>
      <span className="mx-1.5 text-border">—</span>
      <span>{opening.name}</span>
    </div>
  );
}
