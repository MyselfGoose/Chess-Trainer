import type { Square } from "chess.js";
import { describe, expect, it } from "vitest";

import { buildArrowPath, isAligned, simplifyDragPath } from "./path";

describe("buildArrowPath (chess.com rules)", () => {
  it("draws a straight arrow for rank/file moves", () => {
    expect(buildArrowPath("e2" as Square, "e4" as Square, ["e2", "e3"])).toEqual([
      "e2",
      "e4",
    ]);
  });

  it("draws a straight diagonal even when drag wiggles orthogonally", () => {
    expect(
      buildArrowPath("f6" as Square, "e5" as Square, ["f6", "f5", "e5"]),
    ).toEqual(["f6", "e5"]);
  });

  it("draws a straight diagonal across the board regardless of drag path", () => {
    expect(
      buildArrowPath("a1" as Square, "h8" as Square, [
        "a1",
        "b2",
        "c3",
        "d4",
        "e5",
        "f6",
        "g7",
        "h8",
      ]),
    ).toEqual(["a1", "h8"]);
  });

  it("ignores a long orthogonal drag trail between non-aligned endpoints", () => {
    expect(
      buildArrowPath("a2" as Square, "b6" as Square, [
        "a2",
        "b2",
        "c2",
        "d2",
        "e2",
        "f2",
        "g2",
        "g3",
        "g4",
        "g5",
        "g6",
        "f6",
        "e6",
        "d6",
        "c6",
        "b6",
      ]),
    ).toEqual(["a2", "b6"]);
  });

  it("builds an L-shaped path for knight moves through a hinted corner", () => {
    expect(
      buildArrowPath("c3" as Square, "d5" as Square, ["c3", "c5", "d5"]),
    ).toEqual(["c3", "c5", "d5"]);
  });

  it("picks alternate knight corner when drag passes through it", () => {
    expect(
      buildArrowPath("c3" as Square, "d5" as Square, ["c3", "d3", "d5"]),
    ).toEqual(["c3", "d3", "d5"]);
  });

  it("defaults knight L-shape when only endpoints are provided", () => {
    const path = buildArrowPath("c3" as Square, "d5" as Square, ["c3", "d5"]);
    expect(path.length).toBe(3);
    expect(path[0]).toBe("c3");
    expect(path[2]).toBe("d5");
  });
});

describe("isAligned", () => {
  it("returns true for diagonals", () => {
    expect(isAligned("f6" as Square, "e5" as Square)).toBe(true);
    expect(isAligned("a1" as Square, "h8" as Square)).toBe(true);
  });
});

describe("simplifyDragPath", () => {
  it("removes consecutive duplicates", () => {
    expect(simplifyDragPath(["c3", "c3", "c5"])).toEqual(["c3", "c5"]);
  });

  it("removes backtracking", () => {
    expect(simplifyDragPath(["c3", "c4", "c3", "c5"])).toEqual(["c3", "c5"]);
  });
});
