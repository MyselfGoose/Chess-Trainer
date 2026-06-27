import type { AnnotationBrush } from "./types";

export interface BrushStyle {
  stroke: string;
  fill: string;
  opacity: number;
  squareOpacity: number;
}

export const BRUSH_STYLES: Record<AnnotationBrush, BrushStyle> = {
  yellow: {
    stroke: "#f7c631",
    fill: "#f7c631",
    opacity: 0.92,
    squareOpacity: 0.45,
  },
  red: {
    stroke: "#cc3333",
    fill: "#cc3333",
    opacity: 0.92,
    squareOpacity: 0.45,
  },
  blue: {
    stroke: "#1e5599",
    fill: "#1e5599",
    opacity: 0.92,
    squareOpacity: 0.45,
  },
  green: {
    stroke: "#15781b",
    fill: "#15781b",
    opacity: 0.92,
    squareOpacity: 0.45,
  },
  orange: {
    stroke: "#e68f00",
    fill: "#e68f00",
    opacity: 0.92,
    squareOpacity: 0.45,
  },
};

export interface ModifierState {
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

/** chess.com arrow colors: default yellow, Ctrl red, Alt blue, Shift green */
export function arrowBrushFromModifiers(modifiers: ModifierState): AnnotationBrush {
  if (modifiers.shiftKey) {
    return "green";
  }
  if (modifiers.ctrlKey || modifiers.metaKey) {
    return "red";
  }
  if (modifiers.altKey) {
    return "blue";
  }
  return "yellow";
}

/** chess.com square colors: default red, Ctrl yellow, Alt blue, Shift green */
export function squareBrushFromModifiers(modifiers: ModifierState): AnnotationBrush {
  if (modifiers.shiftKey) {
    return "green";
  }
  if (modifiers.ctrlKey || modifiers.metaKey) {
    return "yellow";
  }
  if (modifiers.altKey) {
    return "blue";
  }
  return "red";
}

export type PgnAnnotationColor = "B" | "C" | "G" | "O" | "R" | "Y";

export function pgnColorToBrush(color: PgnAnnotationColor): AnnotationBrush {
  switch (color) {
    case "B":
      return "blue";
    case "C":
      return "blue";
    case "G":
      return "green";
    case "O":
      return "orange";
    case "R":
      return "red";
    case "Y":
      return "yellow";
    default:
      return "yellow";
  }
}
