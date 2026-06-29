"use client";

import Link from "next/link";
import { useState } from "react";

import { findNearestUpcomingMatch, type UpcomingMatch } from "@/lib/prep/upcomingMatches";

function formatCountdown(match: UpcomingMatch): string {
  if (match.daysUntil === 0) {
    return "today";
  }
  if (match.daysUntil === 1) {
    return "tomorrow";
  }
  return `in ${match.daysUntil} days`;
}

export function TournamentCountdownBanner() {
  const [match] = useState<UpcomingMatch | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return findNearestUpcomingMatch();
  });

  if (!match) {
    return null;
  }

  return (
    <div className="mt-6 rounded-xl border border-accent/30 bg-accent-muted px-4 py-3">
      <p className="text-sm text-accent-foreground">
        Tournament vs{" "}
        <span className="font-semibold">{match.opponentName}</span>{" "}
        {formatCountdown(match)}.
      </p>
      <Link
        href={`/prep?opponent=${encodeURIComponent(match.opponentId)}`}
        className="mt-1 inline-block text-sm font-semibold text-accent hover:underline"
      >
        Open prep plan
      </Link>
    </div>
  );
}
