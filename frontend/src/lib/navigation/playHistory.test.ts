import { describe, expect, it } from "vitest";

import {
  appendHistoryEntry,
  canJumpToEnd,
  canStepBack,
  canStepForward,
  createInitialHistory,
} from "./playHistory";

describe("playHistory", () => {
  it("tracks linear move history with truncation on branch", () => {
    let history = createInitialHistory("start");
    let index = 0;

    ({ history, currentIndex: index } = appendHistoryEntry(history, index, {
      fen: "after-e4",
      lastMove: ["e2", "e4"],
    }));
    ({ history, currentIndex: index } = appendHistoryEntry(history, index, {
      fen: "after-e5",
      lastMove: ["e7", "e5"],
    }));

    expect(history).toHaveLength(3);
    expect(index).toBe(2);

    index = 1;
    ({ history, currentIndex: index } = appendHistoryEntry(history, index, {
      fen: "after-c5",
      lastMove: ["c7", "c5"],
    }));

    expect(history.map((entry) => entry.fen)).toEqual([
      "start",
      "after-e4",
      "after-c5",
    ]);
    expect(index).toBe(2);
  });

  it("reports navigation availability from the current index", () => {
    const history = createInitialHistory("start");
    expect(canStepBack(0)).toBe(false);
    expect(canStepForward(history, 0)).toBe(false);
    expect(canJumpToEnd(history, 0)).toBe(false);
  });
});
