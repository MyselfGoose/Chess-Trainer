import { listOpponentProfiles } from "./opponents";

export interface UpcomingMatch {
  opponentId: string;
  opponentName: string;
  matchDate: string;
  daysUntil: number;
}

export function utcTodayString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  const to = new Date(`${toDate}T00:00:00.000Z`);
  const diffMs = to.getTime() - from.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function findNearestUpcomingMatch(
  today: string = utcTodayString(),
): UpcomingMatch | null {
  const profiles = listOpponentProfiles()
    .filter((profile) => profile.matchDate && profile.matchDate >= today)
    .sort((a, b) => (a.matchDate ?? "").localeCompare(b.matchDate ?? ""));

  const nearest = profiles[0];
  if (!nearest?.matchDate) {
    return null;
  }

  return {
    opponentId: nearest.id,
    opponentName: nearest.name,
    matchDate: nearest.matchDate,
    daysUntil: daysBetween(today, nearest.matchDate),
  };
}
