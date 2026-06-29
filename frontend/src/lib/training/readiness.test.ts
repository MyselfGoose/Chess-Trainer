import { describe, expect, it } from "vitest";

import type { LineMastery } from "./mastery";
import {
  computeReadinessBreakdown,
  computeReadinessScore,
  lineReadinessWeight,
} from "./readiness";
import type { TrainingLine } from "./types";

function line(id: string): TrainingLine {
  return {
    id,
    gameIndex: 0,
    leafNodeId: id,
    startFen: "",
    moves: [],
    label: id,
  };
}

function mastery(
  lineId: string,
  level: LineMastery["level"],
  passCount: number,
  attemptCount: number,
): LineMastery {
  return {
    lineId,
    repertoireId: "rep-1",
    level,
    easeFactor: 2.5,
    intervalDays: 1,
    repetitions: 1,
    dueAt: "2026-01-01",
    lastResult: "pass",
    lastTrainedAt: "2026-01-01T00:00:00.000Z",
    passCount,
    failCount: attemptCount - passCount,
    attemptCount,
  };
}

describe("lineReadinessWeight", () => {
  it("returns zero for untrained lines", () => {
    expect(lineReadinessWeight(undefined)).toBe(0);
    expect(lineReadinessWeight(mastery("0:a", "new", 0, 0))).toBe(0);
  });

  it("returns full weight for mastered", () => {
    expect(lineReadinessWeight(mastery("0:a", "mastered", 5, 5))).toBe(1);
  });

  it("uses strong review weight above 70% pass rate", () => {
    expect(lineReadinessWeight(mastery("0:a", "review", 8, 10))).toBe(0.8);
  });

  it("uses learning weight for weak review", () => {
    expect(lineReadinessWeight(mastery("0:a", "review", 5, 10))).toBe(0.4);
  });
});

describe("computeReadinessScore", () => {
  it("returns 0 for empty lines", () => {
    expect(computeReadinessScore([], new Map())).toBe(0);
  });

  it("returns 100 when all lines mastered", () => {
    const lines = [line("0:a"), line("0:b")];
    const map = new Map([
      ["0:a", mastery("0:a", "mastered", 3, 3)],
      ["0:b", mastery("0:b", "mastered", 2, 2)],
    ]);
    expect(computeReadinessScore(lines, map)).toBe(100);
  });

  it("computes mixed mastery average", () => {
    const lines = [line("0:a"), line("0:b")];
    const map = new Map([
      ["0:a", mastery("0:a", "mastered", 3, 3)],
      ["0:b", mastery("0:b", "new", 0, 0)],
    ]);
    expect(computeReadinessScore(lines, map)).toBe(50);
  });

  it("breakdown tracks level counts", () => {
    const lines = [line("0:a"), line("0:b"), line("0:c")];
    const map = new Map([
      ["0:a", mastery("0:a", "mastered", 3, 3)],
      ["0:b", mastery("0:b", "learning", 1, 2)],
      ["0:c", mastery("0:c", "new", 0, 0)],
    ]);
    const breakdown = computeReadinessBreakdown(lines, map);
    expect(breakdown.byLevel.mastered).toBe(1);
    expect(breakdown.byLevel.learning).toBe(1);
    expect(breakdown.byLevel.new).toBe(1);
    expect(breakdown.score).toBe(Math.round(((1 + 0.4 + 0) / 3) * 100));
  });
});
