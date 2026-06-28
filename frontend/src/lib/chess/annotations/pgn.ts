import type { Arrow, SquareAnnotation } from "@echecs/pgn";
import type { Square } from "chess.js";

import { brushToPgnColor, pgnColorToBrush } from "./colors";
import { arrowEndpoints, buildArrowPath } from "./path";
import type { BoardAnnotation } from "./types";

export function arrowsFromPgn(arrows: Arrow[] | undefined): BoardAnnotation[] {
  if (!arrows || arrows.length === 0) {
    return [];
  }
  return arrows.map((arrow) => {
    const from = arrow.from as Square;
    const to = arrow.to as Square;
    return {
      type: "arrow",
      path: buildArrowPath(from, to, [from, to]),
      brush: pgnColorToBrush(arrow.color),
    };
  });
}

export function squaresFromPgn(
  squares: SquareAnnotation[] | undefined,
): BoardAnnotation[] {
  if (!squares || squares.length === 0) {
    return [];
  }
  return squares.map((square) => ({
    type: "square",
    square: square.square as Square,
    brush: pgnColorToBrush(square.color),
  }));
}

export function annotationsFromPgnNode(
  arrows: Arrow[] | undefined,
  squares: SquareAnnotation[] | undefined,
): BoardAnnotation[] {
  return [...arrowsFromPgn(arrows), ...squaresFromPgn(squares)];
}

export function annotationsToPgnNode(shapes: BoardAnnotation[]): {
  arrows: Arrow[];
  squares: SquareAnnotation[];
} {
  const arrows: Arrow[] = [];
  const squares: SquareAnnotation[] = [];

  for (const shape of shapes) {
    if (shape.type === "arrow") {
      const { orig, dest } = arrowEndpoints(shape.path);
      arrows.push({
        from: orig,
        to: dest,
        color: brushToPgnColor(shape.brush),
      });
    } else {
      squares.push({
        square: shape.square,
        color: brushToPgnColor(shape.brush),
      });
    }
  }

  return { arrows, squares };
}
