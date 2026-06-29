import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addDaysToUtcDate,
  getDueLines,
  getMastery,
  recordLineResult,
  utcDateString,
} from "./mastery";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

beforeEach(() => {
  localStorageMock.clear();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", localStorageMock);
});

describe("mastery storage", () => {
  it("records pass and increments counts", () => {
    const result = recordLineResult("rep-1", "0:leaf-a", true, "2025-06-01T12:00:00.000Z");
    expect(result.attemptCount).toBe(1);
    expect(result.passCount).toBe(1);
    expect(result.failCount).toBe(0);
    expect(result.lastResult).toBe("pass");
    expect(result.level).toBe("review");
    expect(getMastery("0:leaf-a")).toEqual(result);
  });

  it("records fail and resets repetitions", () => {
    recordLineResult("rep-1", "0:leaf-b", true);
    const fail = recordLineResult("rep-1", "0:leaf-b", false);
    expect(fail.attemptCount).toBe(2);
    expect(fail.failCount).toBe(1);
    expect(fail.repetitions).toBe(0);
    expect(fail.lastResult).toBe("fail");
  });

  it("records fail metadata and clears on pass", () => {
    const fail = recordLineResult("rep-1", "0:meta", false, undefined, {
      failedAtPly: 5,
      failedAtSan: "Nf3",
    });
    expect(fail.failedAtPly).toBe(5);
    expect(fail.failedAtSan).toBe("Nf3");

    const pass = recordLineResult("rep-1", "0:meta", true);
    expect(pass.failedAtPly).toBeUndefined();
    expect(pass.failedAtSan).toBeUndefined();
  });

  it("filters due lines by UTC date", () => {
    const trained = recordLineResult("rep-1", "0:due", true, "2025-06-01T12:00:00.000Z");
    expect(trained.dueAt).toBe("2025-06-02");

    const due = getDueLines("rep-1", "2025-06-02");
    expect(due.map((entry) => entry.lineId)).toContain("0:due");
  });

  it("utcDateString returns YYYY-MM-DD", () => {
    expect(utcDateString(new Date("2025-06-15T23:59:59.000Z"))).toBe("2025-06-15");
  });

  it("addDaysToUtcDate advances correctly", () => {
    expect(addDaysToUtcDate("2025-06-01", 3)).toBe("2025-06-04");
  });
});
