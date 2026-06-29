import { beforeEach, describe, expect, it, vi } from "vitest";

import { createOpponentProfile, saveOpponentProfile } from "./opponents";
import { findNearestUpcomingMatch } from "./upcomingMatches";

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

describe("upcomingMatches", () => {
  it("returns nearest future match", () => {
    saveOpponentProfile(
      createOpponentProfile({
        name: "Far",
        likelyOpenings: [],
        matchDate: "2026-12-01",
      }),
    );
    saveOpponentProfile(
      createOpponentProfile({
        name: "Soon",
        likelyOpenings: [],
        matchDate: "2026-07-01",
      }),
    );
    const match = findNearestUpcomingMatch("2026-06-29");
    expect(match?.opponentName).toBe("Soon");
    expect(match?.daysUntil).toBe(2);
  });

  it("ignores past matches", () => {
    saveOpponentProfile(
      createOpponentProfile({
        name: "Past",
        likelyOpenings: [],
        matchDate: "2026-01-01",
      }),
    );
    expect(findNearestUpcomingMatch("2026-06-29")).toBeNull();
  });
});
