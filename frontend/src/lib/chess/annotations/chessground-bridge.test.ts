import type { Square } from "chess.js";
import { describe, expect, it } from "vitest";

import {
  createDragSession,
  drawShapesToAnnotations,
  updateDragSession,
} from "./chessground-bridge";

describe("drawShapesToAnnotations", () => {
  it("maps square highlights to chess.com colors", () => {
    const result = drawShapesToAnnotations(
      [{ orig: "e4" as Square, brush: "green" }],
      null,
    );
    expect(result).toEqual([
      { type: "square", square: "e4", brush: "red" },
    ]);
  });

  it("maps arrows using drag session for knight L-paths", () => {
    const session = updateDragSession(
      updateDragSession(createDragSession("c3" as Square), "c5" as Square),
      "d5" as Square,
    );
    const result = drawShapesToAnnotations(
      [
        {
          orig: "c3" as Square,
          dest: "d5" as Square,
          brush: "green",
        },
      ],
      session,
    );
    expect(result[0]).toMatchObject({
      type: "arrow",
      brush: "yellow",
      path: ["c3", "c5", "d5"],
    });
  });

  it("uses straight paths without a drag session", () => {
    const result = drawShapesToAnnotations(
      [
        {
          orig: "e2" as Square,
          dest: "e4" as Square,
          brush: "red",
        },
      ],
      null,
    );
    expect(result[0]).toMatchObject({
      type: "arrow",
      brush: "red",
      path: ["e2", "e4"],
    });
  });

  it("forces diagonals straight even when session visited many squares", () => {
    let session = createDragSession("f6" as Square);
    for (const sq of ["f5", "e5"] as Square[]) {
      session = updateDragSession(session, sq);
    }
    const result = drawShapesToAnnotations(
      [{ orig: "f6" as Square, dest: "e5" as Square, brush: "green" }],
      session,
    );
    expect(result[0]).toMatchObject({
      type: "arrow",
      path: ["f6", "e5"],
    });
  });
});

describe("updateDragSession", () => {
  it("tracks visited squares without building a trail path", () => {
    let session = createDragSession("a2" as Square);
    session = updateDragSession(session, "b2" as Square);
    session = updateDragSession(session, "c2" as Square);
    expect(session.dest).toBe("c2");
    expect(session.visited).toEqual(["a2", "b2", "c2"]);
  });
});
