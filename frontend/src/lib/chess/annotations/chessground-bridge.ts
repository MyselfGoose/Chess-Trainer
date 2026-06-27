import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Square } from "chess.js";

import { buildArrowPath } from "./path";
import type { AnnotationBrush, BoardAnnotation } from "./types";

/** chessground default brush → chess.com arrow color */
const CG_ARROW_BRUSH: Record<string, AnnotationBrush> = {
  green: "yellow",
  red: "red",
  blue: "blue",
  yellow: "green",
};

/** chessground default brush → chess.com square highlight color */
const CG_SQUARE_BRUSH: Record<string, AnnotationBrush> = {
  green: "red",
  red: "yellow",
  blue: "blue",
  yellow: "green",
};

/** Tracks orig, current dest, and visited squares (for knight L-hint only). */
export interface DragSession {
  orig: Square;
  dest: Square;
  visited: Square[];
}

export function createDragSession(orig: Square): DragSession {
  return { orig, dest: orig, visited: [orig] };
}

export function updateDragSession(
  session: DragSession,
  square: Square,
): DragSession {
  if (square === session.dest) {
    return session;
  }
  const visited = session.visited.includes(square)
    ? session.visited
    : [...session.visited, square];
  return { ...session, dest: square, visited };
}

export function cgArrowBrush(brush?: string): AnnotationBrush {
  return CG_ARROW_BRUSH[brush ?? "green"] ?? "yellow";
}

export function cgSquareBrush(brush?: string): AnnotationBrush {
  return CG_SQUARE_BRUSH[brush ?? "green"] ?? "red";
}

export function drawShapesToAnnotations(
  shapes: DrawShape[],
  dragSession: DragSession | null,
): BoardAnnotation[] {
  return shapes.map((shape) => {
    const orig = shape.orig as Square;
    const brushKey = shape.brush ?? "green";

    if (!shape.dest) {
      return {
        type: "square",
        square: orig,
        brush: cgSquareBrush(brushKey),
      };
    }

    const dest = shape.dest as Square;
    const visited =
      dragSession?.orig === orig && dragSession.dest === dest
        ? dragSession.visited
        : [orig, dest];

    return {
      type: "arrow",
      path: buildArrowPath(orig, dest, visited),
      brush: cgArrowBrush(brushKey),
    };
  });
}

/** Brushes passed to chessground drawable (colors are cosmetic; we remap on export). */
export const CHESSGROUND_DRAW_BRUSHES = {
  green: { key: "g", color: "#f7c631", opacity: 0.92, lineWidth: 10 },
  red: { key: "r", color: "#cc3333", opacity: 0.92, lineWidth: 10 },
  blue: { key: "b", color: "#1e5599", opacity: 0.92, lineWidth: 10 },
  yellow: { key: "y", color: "#15781b", opacity: 0.92, lineWidth: 10 },
} as const;
