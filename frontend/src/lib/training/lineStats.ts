import type { TrainingSessionSummary } from "./types";
import type { LineMastery } from "./mastery";

export interface LineStatsSummary {
  lineId: string;
  attemptCount: number;
  passCount: number;
  passRate: number;
  lastTrainedAt: string | null;
  lastResult: "pass" | "fail" | null;
}

export function aggregateLineStats(
  repertoireId: string,
  history: TrainingSessionSummary[],
  mastery: LineMastery[],
): LineStatsSummary[] {
  const masteryByLine = new Map(
    mastery
      .filter((entry) => entry.repertoireId === repertoireId)
      .map((entry) => [entry.lineId, entry]),
  );

  const historyStats = new Map<string, LineStatsSummary>();

  for (const session of history.filter(
    (entry) => entry.repertoireId === repertoireId,
  )) {
    for (const result of session.results) {
      const existing = historyStats.get(result.lineId) ?? {
        lineId: result.lineId,
        attemptCount: 0,
        passCount: 0,
        passRate: 0,
        lastTrainedAt: null,
        lastResult: null,
      };
      existing.attemptCount += 1;
      if (result.passed) {
        existing.passCount += 1;
      }
      existing.lastTrainedAt = session.finishedAt;
      existing.lastResult = result.passed ? "pass" : "fail";
      existing.passRate =
        existing.attemptCount > 0
          ? existing.passCount / existing.attemptCount
          : 0;
      historyStats.set(result.lineId, existing);
    }
  }

  const lineIds = new Set([
    ...masteryByLine.keys(),
    ...historyStats.keys(),
  ]);

  return [...lineIds].map((lineId) => {
    const masteryEntry = masteryByLine.get(lineId);
    if (masteryEntry) {
      return {
        lineId,
        attemptCount: masteryEntry.attemptCount,
        passCount: masteryEntry.passCount,
        passRate:
          masteryEntry.attemptCount > 0
            ? masteryEntry.passCount / masteryEntry.attemptCount
            : 0,
        lastTrainedAt: masteryEntry.lastTrainedAt,
        lastResult: masteryEntry.lastResult,
      };
    }
    return (
      historyStats.get(lineId) ?? {
        lineId,
        attemptCount: 0,
        passCount: 0,
        passRate: 0,
        lastTrainedAt: null,
        lastResult: null,
      }
    );
  });
}

export function findWeakLines(stats: LineStatsSummary[]): LineStatsSummary[] {
  return stats.filter(
    (entry) => entry.passRate < 0.5 && entry.attemptCount >= 2,
  );
}

export function computePassRateTrend(
  repertoireId: string,
  userColor: TrainingSessionSummary["userColor"],
  history: TrainingSessionSummary[],
  sessionCount = 5,
): { from: number; to: number } | null {
  const sessions = history
    .filter(
      (session) =>
        session.repertoireId === repertoireId &&
        session.userColor === userColor,
    )
    .slice(0, sessionCount)
    .reverse();

  if (sessions.length < 2) {
    return null;
  }

  const rates = sessions.map((session) => {
    const total = session.results.length;
    if (total === 0) {
      return 0;
    }
    return session.results.filter((result) => result.passed).length / total;
  });

  return {
    from: rates[0] ?? 0,
    to: rates[rates.length - 1] ?? 0,
  };
}
