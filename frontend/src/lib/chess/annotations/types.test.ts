import type { Square } from "chess.js";
import { describe, expect, it } from "vitest";

import { mergeAnnotationChange } from "./types";

describe("mergeAnnotationChange", () => {
  it("appends new annotations to existing ones", () => {
    const current = [
      { type: "arrow" as const, path: ["e2", "e4"] as Square[], brush: "yellow" as const },
    ];
    const incoming = [
      { type: "square" as const, square: "d5" as Square, brush: "red" as const },
    ];
    expect(mergeAnnotationChange(current, incoming)).toEqual([
      { type: "arrow", path: ["e2", "e4"], brush: "yellow" },
      { type: "square", square: "d5", brush: "red" },
    ]);
  });

  it("toggles off an existing annotation when redrawn", () => {
    const current = [
      { type: "arrow" as const, path: ["e2", "e4"] as Square[], brush: "yellow" as const },
      { type: "square" as const, square: "d5" as Square, brush: "red" as const },
    ];
    const incoming = [
      { type: "arrow" as const, path: ["e2", "e4"] as Square[], brush: "yellow" as const },
    ];
    expect(mergeAnnotationChange(current, incoming)).toEqual([
      { type: "square", square: "d5", brush: "red" },
    ]);
  });

  it("keeps current list when incoming is empty", () => {
    const current = [
      { type: "square" as const, square: "e4" as Square, brush: "red" as const },
    ];
    expect(mergeAnnotationChange(current, [])).toEqual(current);
  });
});
