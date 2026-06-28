import { describe, expect, it } from "vitest";

import { createDefaultMastery } from "./mastery";
import { qualityFromPass, scheduleAfterReview } from "./scheduler";

describe("SM-2 scheduler", () => {
  it("advances interval on pass", () => {
    const base = createDefaultMastery("0:leaf", "rep-1");
    const after = scheduleAfterReview(base, qualityFromPass(true));
    expect(after.repetitions).toBe(1);
    expect(after.intervalDays).toBeGreaterThanOrEqual(1);
    expect(after.dueAt).not.toBe(base.dueAt);
  });

  it("resets on fail", () => {
    let current = createDefaultMastery("0:leaf", "rep-1");
    current = scheduleAfterReview(current, qualityFromPass(true));
    current = scheduleAfterReview(current, qualityFromPass(true));
    const failed = scheduleAfterReview(current, qualityFromPass(false));
    expect(failed.repetitions).toBe(0);
    expect(failed.level).toBe("learning");
    expect(failed.intervalDays).toBe(1);
  });

  it("marks mastered after long interval and passes", () => {
    const current = {
      ...createDefaultMastery("0:leaf", "rep-1"),
      passCount: 2,
      intervalDays: 22,
      repetitions: 3,
    };
    const mastered = scheduleAfterReview(current, 4);
    expect(mastered.level).toBe("mastered");
  });
});
