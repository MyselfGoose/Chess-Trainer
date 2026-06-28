import { describe, expect, it } from "vitest";

import {
  annotationsFromPgnNode,
  annotationsToPgnNode,
  arrowsFromPgn,
  squaresFromPgn,
} from "./pgn";

describe("pgn annotations", () => {
  it("parses multi-arrow PGN colors", () => {
    const arrows = arrowsFromPgn([
      { from: "e2", to: "e4", color: "G" },
      { from: "g1", to: "f3", color: "R" },
      { from: "d2", to: "d4", color: "B" },
    ]);
    expect(arrows).toHaveLength(3);
    expect(arrows[0]?.brush).toBe("green");
    expect(arrows[1]?.brush).toBe("red");
    expect(arrows[2]?.brush).toBe("blue");
  });

  it("parses square annotations", () => {
    const squares = squaresFromPgn([
      { square: "e4", color: "Y" },
      { square: "d5", color: "O" },
    ]);
    expect(squares).toHaveLength(2);
    expect(squares[0]?.brush).toBe("yellow");
    expect(squares[1]?.brush).toBe("orange");
  });

  it("combines arrows and squares from node", () => {
    const combined = annotationsFromPgnNode(
      [{ from: "c2", to: "c4", color: "Y" }],
      [{ square: "d5", color: "R" }],
    );
    expect(combined).toHaveLength(2);
    expect(combined[0]?.type).toBe("arrow");
    expect(combined[1]?.type).toBe("square");
  });

  it("returns empty for undefined inputs", () => {
    expect(annotationsFromPgnNode(undefined, undefined)).toEqual([]);
  });

  it("round-trips board annotations to PGN node format", () => {
    const original = annotationsFromPgnNode(
      [
        { from: "e2", to: "e4", color: "G" },
        { from: "g1", to: "f3", color: "R" },
      ],
      [{ square: "d5", color: "Y" }],
    );
    const { arrows, squares } = annotationsToPgnNode(original);
    expect(arrows).toEqual([
      { from: "e2", to: "e4", color: "G" },
      { from: "g1", to: "f3", color: "R" },
    ]);
    expect(squares).toEqual([{ square: "d5", color: "Y" }]);
    const roundTrip = annotationsFromPgnNode(arrows, squares);
    expect(roundTrip).toHaveLength(3);
    expect(roundTrip.filter((shape) => shape.type === "arrow")).toHaveLength(2);
    expect(roundTrip.filter((shape) => shape.type === "square")).toHaveLength(1);
  });
});
