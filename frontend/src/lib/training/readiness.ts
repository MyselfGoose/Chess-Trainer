import type { LineMastery, MasteryLevel } from "./mastery";
import type { TrainingLine } from "./types";

/**
 * Readiness weights per line (0–1). Score = round(100 * sum(weights) / lineCount).
 * - mastered: fully prepared
 * - review + pass rate > 70%: strong review
 * - review otherwise / learning: partial
 * - new / untrained: not prepared
 */
export const READINESS_WEIGHTS = {
  mastered: 1.0,
  reviewStrong: 0.8,
  learning: 0.4,
  new: 0.0,
} as const;

const REVIEW_STRONG_PASS_RATE = 0.7;

export interface ReadinessBreakdown {
  score: number;
  totalLines: number;
  weightedSum: number;
  byLevel: Record<MasteryLevel, number>;
}

function emptyByLevel(): Record<MasteryLevel, number> {
  return {
    new: 0,
    learning: 0,
    review: 0,
    mastered: 0,
  };
}

export function lineReadinessWeight(mastery: LineMastery | undefined): number {
  if (!mastery || mastery.level === "new") {
    return READINESS_WEIGHTS.new;
  }
  if (mastery.level === "mastered") {
    return READINESS_WEIGHTS.mastered;
  }
  if (mastery.level === "learning") {
    return READINESS_WEIGHTS.learning;
  }
  if (mastery.attemptCount > 0 && mastery.passCount / mastery.attemptCount > REVIEW_STRONG_PASS_RATE) {
    return READINESS_WEIGHTS.reviewStrong;
  }
  return READINESS_WEIGHTS.learning;
}

export function computeReadinessBreakdown(
  lines: TrainingLine[],
  masteryByLine: Map<string, LineMastery>,
): ReadinessBreakdown {
  const byLevel = emptyByLevel();
  if (lines.length === 0) {
    return {
      score: 0,
      totalLines: 0,
      weightedSum: 0,
      byLevel,
    };
  }

  let weightedSum = 0;
  for (const line of lines) {
    const mastery = masteryByLine.get(line.id);
    const level = mastery?.level ?? "new";
    byLevel[level] += 1;
    weightedSum += lineReadinessWeight(mastery);
  }

  return {
    score: Math.round((weightedSum / lines.length) * 100),
    totalLines: lines.length,
    weightedSum,
    byLevel,
  };
}

export function computeReadinessScore(
  lines: TrainingLine[],
  masteryByLine: Map<string, LineMastery>,
): number {
  return computeReadinessBreakdown(lines, masteryByLine).score;
}
