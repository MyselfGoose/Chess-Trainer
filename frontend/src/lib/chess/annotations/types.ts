import type { Square } from "chess.js";

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
    const path = annotation.path.join(">");
    return `arrow:${annotation.brush}:${path}`;
  }
  return `square:${annotation.brush}:${annotation.square}`;
}

export function sameAnnotation(a: BoardAnnotation, b: BoardAnnotation): boolean {
  return annotationKey(a) === annotationKey(b);
}

export interface BoardAnnotationsConfig {
  shapes: BoardAnnotation[];
  autoShapes?: BoardAnnotation[];
  enabled?: boolean;
  onChange: (shapes: BoardAnnotation[]) => void;
}
