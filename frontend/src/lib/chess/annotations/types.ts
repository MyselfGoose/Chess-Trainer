import type { Square } from "chess.js";

import { arrowEndpoints } from "./path";

export type AnnotationBrush = "yellow" | "red" | "blue" | "green" | "orange";

export interface ArrowAnnotation {
  type: "arrow";
  path: Square[];
  brush: AnnotationBrush;
}

export interface SquareHighlightAnnotation {
  type: "square";
  square: Square;
  brush: AnnotationBrush;
}

export type BoardAnnotation = ArrowAnnotation | SquareHighlightAnnotation;

export interface AnnotationPreview {
  type: "arrow";
  path: Square[];
  brush: AnnotationBrush;
}

export function annotationKey(annotation: BoardAnnotation): string {
  if (annotation.type === "arrow") {
    const { orig, dest } = arrowEndpoints(annotation.path);
    return `arrow:${annotation.brush}:${orig}>${dest}`;
  }
  return `square:${annotation.brush}:${annotation.square}`;
}

export function sameAnnotation(a: BoardAnnotation, b: BoardAnnotation): boolean {
  return annotationKey(a) === annotationKey(b);
}

/** Add incoming annotations or toggle them off if they already exist (chess.com erase). */
export function mergeAnnotationChange(
  current: BoardAnnotation[],
  incoming: BoardAnnotation[],
): BoardAnnotation[] {
  if (incoming.length === 0) {
    return current;
  }

  let next = current;
  for (const annotation of incoming) {
    if (next.some((shape) => sameAnnotation(shape, annotation))) {
      next = next.filter((shape) => !sameAnnotation(shape, annotation));
    } else {
      next = [...next, annotation];
    }
  }
  return next;
}

export interface BoardAnnotationsConfig {
  shapes: BoardAnnotation[];
  autoShapes?: BoardAnnotation[];
  enabled?: boolean;
  onChange: (shapes: BoardAnnotation[]) => void;
}
