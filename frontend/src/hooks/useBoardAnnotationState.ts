"use client";

import { useCallback, useState } from "react";

import type {
  BoardAnnotation,
  BoardAnnotationsConfig,
} from "@/lib/chess/annotations";

export interface UseBoardAnnotationStateResult {
  shapes: BoardAnnotation[];
  setShapes: (shapes: BoardAnnotation[]) => void;
  clearAnnotations: () => void;
  annotations: BoardAnnotationsConfig;
}

export function useBoardAnnotationState(): UseBoardAnnotationStateResult {
  const [shapes, setShapes] = useState<BoardAnnotation[]>([]);

  const onChange = useCallback((next: BoardAnnotation[]) => {
    setShapes(next);
  }, []);

  const clearAnnotations = useCallback(() => {
    setShapes([]);
  }, []);

  return {
    shapes,
    setShapes,
    clearAnnotations,
    annotations: {
      shapes,
      onChange,
      enabled: true,
    },
  };
}
