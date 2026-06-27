import type { Square } from "chess.js";
import { describe, expect, it } from "vitest";

import {
  buildArrowPath,
  collapseCollinear,
  simplifyDragPath,
} from "./path";

describe("buildArrowPath", () => {
  it("builds an L-shaped path for knight moves", () => {
    const path = buildArrowPath("c3" as Square, "d5" as Square, ["c3", "c5", "d5"]);
    expect(path).toEqual(["c3", "c5", "d5"]);
  });

  it("picks alternate knight corner when drag path uses it", () => {
    const path = buildArrowPath("c3" as Square, "d5" as Square, ["c3", "d3", "d5"]);
    expect(path).toEqual(["c3", "d3", "d5"]);
  });

  it("defaults knight path when only endpoints are provided", () => {
    const path = buildArrowPath("c3" as Square, "d5" as Square, ["c3", "d5"]);
    expect(path.length).toBe(3);
    expect(path[0]).toBe("c3");
    expect(path[2]).toBe("d5");
  });

  it("uses a straight path for aligned moves", () => {
    const path = buildArrowPath("e2" as Square, "e4" as Square, ["e2", "e4"]);
    expect(path).toEqual(["e2", "e4"]);
  });

  it("uses a straight path for diagonal queen moves", () => {
    const path = buildArrowPath("c1" as Square, "g5" as Square, ["c1", "g5"]);
    expect(path).toEqual(["c1", "g5"]);
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

describe("collapseCollinear", () => {
  it("removes collinear intermediate squares", () => {
    expect(collapseCollinear(["c3", "c4", "c5"])).toEqual(["c3", "c5"]);
  });
});
