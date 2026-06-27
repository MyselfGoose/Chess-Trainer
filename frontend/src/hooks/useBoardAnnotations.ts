"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Square } from "chess.js";

import {
  annotationKey,
  arrowBrushFromModifiers,
  buildArrowPath,
  getKeyAtClientPos,
  sameAnnotation,
  simplifyDragPath,
  squareBrushFromModifiers,
  type AnnotationPreview,
  type BoardAnnotation,
  type BoardOrientation,
} from "@/lib/chess/annotations";

function isRightButton(event: MouseEvent): boolean {
  return event.button === 2;
}

function getClientPosition(
  event: MouseEvent | TouchEvent,
): { x: number; y: number } | null {
  if ("touches" in event) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    if (!touch) {
      return null;
    }
    return { x: touch.clientX, y: touch.clientY };
  }
  return { x: event.clientX, y: event.clientY };
}

export interface BoardAnnotationBindingOptions {
  boardEl: HTMLElement;
  orientationRef: React.RefObject<BoardOrientation>;
  shapesRef: React.RefObject<BoardAnnotation[]>;
  onChangeRef: React.RefObject<(shapes: BoardAnnotation[]) => void>;
  getSquareRef: React.RefObject<
    ((clientX: number, clientY: number) => Square | null) | undefined
  >;
  boardRef: React.RefObject<HTMLElement | null>;
  setPreview: (preview: AnnotationPreview | null) => void;
  drawingRef: React.MutableRefObject<{
    orig: Square;
    path: Square[];
    brush: ReturnType<typeof arrowBrushFromModifiers>;
    moved: boolean;
  } | null>;
}

export function attachBoardAnnotationListeners({
  boardEl,
  orientationRef,
  shapesRef,
  onChangeRef,
  getSquareRef,
  boardRef,
  setPreview,
  drawingRef,
}: BoardAnnotationBindingOptions): () => void {
  const clearAll = () => {
    if (shapesRef.current.length === 0) {
      return;
    }
    onChangeRef.current([]);
    setPreview(null);
  };

  const commitSquareHighlight = (
    square: Square,
    event: MouseEvent | TouchEvent,
  ) => {
    const brush = squareBrushFromModifiers(event);
    const annotation: BoardAnnotation = { type: "square", square, brush };
    const existing = shapesRef.current.find((shape) =>
      sameAnnotation(shape, annotation),
    );
    const next = existing
      ? shapesRef.current.filter((shape) => !sameAnnotation(shape, annotation))
      : [...shapesRef.current, annotation];
    onChangeRef.current(next);
  };

  const commitArrow = (
    orig: Square,
    dest: Square,
    dragPath: Square[],
    brush: ReturnType<typeof arrowBrushFromModifiers>,
  ) => {
    const path = buildArrowPath(orig, dest, dragPath);
    const annotation: BoardAnnotation = { type: "arrow", path, brush };
    const existing = shapesRef.current.find((shape) =>
      sameAnnotation(shape, annotation),
    );
    const next = existing
      ? shapesRef.current.filter((shape) => !sameAnnotation(shape, annotation))
      : [...shapesRef.current, annotation];
    onChangeRef.current(next);
  };

  const resolveSquare = (clientX: number, clientY: number): Square | null => {
    const lookup = getSquareRef.current;
    if (lookup) {
      const fromApi = lookup(clientX, clientY);
      if (fromApi) {
        return fromApi;
      }
    }

    const root = boardRef.current;
    if (!root) {
      return null;
    }
    const surface =
      root.querySelector("cg-board") instanceof HTMLElement
        ? (root.querySelector("cg-board") as HTMLElement)
        : root;
    const bounds = surface.getBoundingClientRect();
    return getKeyAtClientPos(
      clientX,
      clientY,
      bounds,
      orientationRef.current,
    );
  };

  const handleContextMenu = (event: Event) => {
    event.preventDefault();
  };

  const startDraw = (event: MouseEvent | TouchEvent) => {
    const pos = getClientPosition(event);
    if (!pos) {
      return;
    }

    const square = resolveSquare(pos.x, pos.y);
    if (!square) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    drawingRef.current = {
      orig: square,
      path: [square],
      brush: arrowBrushFromModifiers(event),
      moved: false,
    };
    setPreview(null);
  };

  const moveDraw = (event: MouseEvent | TouchEvent) => {
    const drawing = drawingRef.current;
    if (!drawing) {
      return;
    }

    const pos = getClientPosition(event);
    if (!pos) {
      return;
    }

    const square = resolveSquare(pos.x, pos.y);
    if (!square) {
      return;
    }

    if ("cancelable" in event && event.cancelable) {
      event.preventDefault();
    }

    const last = drawing.path[drawing.path.length - 1];
    if (square !== last) {
      drawing.moved = true;
      drawing.path.push(square);
    }

    const simplified = simplifyDragPath(drawing.path);
    const dest = simplified[simplified.length - 1]!;
    const path =
      simplified.length >= 2
        ? buildArrowPath(drawing.orig, dest, simplified)
        : simplified;

    setPreview({
      type: "arrow",
      path,
      brush: drawing.brush,
    });
  };

  const endDraw = (event: MouseEvent | TouchEvent) => {
    const drawing = drawingRef.current;
    if (!drawing) {
      return;
    }

    drawingRef.current = null;
    setPreview(null);

    const pos = getClientPosition(event);
    const square =
      pos !== null
        ? resolveSquare(pos.x, pos.y)
        : drawing.path[drawing.path.length - 1]!;

    if (!drawing.moved) {
      commitSquareHighlight(drawing.orig, event);
      return;
    }

    if (!square || square === drawing.orig) {
      return;
    }

    commitArrow(drawing.orig, square, drawing.path, drawing.brush);
  };

  const handleMouseDown = (event: MouseEvent) => {
    if (isRightButton(event)) {
      startDraw(event);
      return;
    }
    if (event.button === 0) {
      clearAll();
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (drawingRef.current) {
      moveDraw(event);
    }
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (!drawingRef.current) {
      return;
    }
    if (!isRightButton(event)) {
      return;
    }
    endDraw(event);
  };

  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 2) {
      startDraw(event);
    }
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (drawingRef.current) {
      moveDraw(event);
    }
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (drawingRef.current) {
      endDraw(event);
    }
  };

  const captureOptions: AddEventListenerOptions = { capture: true };

  boardEl.addEventListener("contextmenu", handleContextMenu, captureOptions);
  boardEl.addEventListener("mousedown", handleMouseDown, captureOptions);
  document.addEventListener("mousemove", handleMouseMove, captureOptions);
  document.addEventListener("mouseup", handleMouseUp, captureOptions);
  boardEl.addEventListener("touchstart", handleTouchStart, {
    ...captureOptions,
    passive: false,
  });
  document.addEventListener("touchmove", handleTouchMove, {
    ...captureOptions,
    passive: false,
  });
  document.addEventListener("touchend", handleTouchEnd, captureOptions);

  return () => {
    boardEl.removeEventListener("contextmenu", handleContextMenu, captureOptions);
    boardEl.removeEventListener("mousedown", handleMouseDown, captureOptions);
    document.removeEventListener("mousemove", handleMouseMove, captureOptions);
    document.removeEventListener("mouseup", handleMouseUp, captureOptions);
    boardEl.removeEventListener("touchstart", handleTouchStart, captureOptions);
    document.removeEventListener("touchmove", handleTouchMove, captureOptions);
    document.removeEventListener("touchend", handleTouchEnd, captureOptions);
    drawingRef.current = null;
    setPreview(null);
  };
}

export interface UseBoardAnnotationsOptions {
  boardRef: React.RefObject<HTMLElement | null>;
  orientation: BoardOrientation;
  enabled?: boolean;
  shapes: BoardAnnotation[];
  onChange: (shapes: BoardAnnotation[]) => void;
  getSquareAtClientPos?: (clientX: number, clientY: number) => Square | null;
}

export interface UseBoardAnnotationsResult {
  preview: AnnotationPreview | null;
  clearAll: () => void;
  bindListeners: (boardEl: HTMLElement) => () => void;
}

export function useBoardAnnotations({
  boardRef,
  orientation,
  enabled = true,
  shapes,
  onChange,
  getSquareAtClientPos,
}: UseBoardAnnotationsOptions): UseBoardAnnotationsResult {
  const shapesRef = useRef(shapes);
  const onChangeRef = useRef(onChange);
  const orientationRef = useRef(orientation);
  const getSquareRef = useRef(getSquareAtClientPos);
  const drawingRef = useRef<{
    orig: Square;
    path: Square[];
    brush: ReturnType<typeof arrowBrushFromModifiers>;
    moved: boolean;
  } | null>(null);

  const [preview, setPreview] = useState<AnnotationPreview | null>(null);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    orientationRef.current = orientation;
  }, [orientation]);

  useEffect(() => {
    getSquareRef.current = getSquareAtClientPos;
  }, [getSquareAtClientPos]);

  const clearAll = useCallback(() => {
    if (shapesRef.current.length === 0) {
      return;
    }
    onChangeRef.current([]);
    setPreview(null);
  }, []);

  const bindListeners = useCallback(
    (boardEl: HTMLElement) => {
      if (!enabled) {
        return () => undefined;
      }
      return attachBoardAnnotationListeners({
        boardEl,
        orientationRef,
        shapesRef,
        onChangeRef,
        getSquareRef,
        boardRef,
        setPreview,
        drawingRef,
      });
    },
    [boardRef, enabled],
  );

  return { preview, clearAll, bindListeners };
}

export function toggleAnnotation(
  shapes: BoardAnnotation[],
  annotation: BoardAnnotation,
): BoardAnnotation[] {
  const existing = shapes.find(
    (shape) => annotationKey(shape) === annotationKey(annotation),
  );
  if (existing) {
    return shapes.filter(
      (shape) => annotationKey(shape) !== annotationKey(annotation),
    );
  }
  return [...shapes, annotation];
}
