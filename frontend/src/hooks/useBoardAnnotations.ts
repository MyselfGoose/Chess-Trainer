"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Square } from "chess.js";

import {
  annotationKey,
  arrowBrushFromModifiers,
  buildArrowPath,
  createDragSession,
  getKeyAtClientPos,
  updateDragSession,
  type AnnotationPreview,
  type BoardAnnotation,
  type BoardOrientation,
  type DragSession,
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

export interface BoardAnnotationSupportOptions {
  boardEl: HTMLElement;
  orientationRef: React.RefObject<BoardOrientation>;
  shapesRef: React.RefObject<BoardAnnotation[]>;
  onChangeRef: React.RefObject<(shapes: BoardAnnotation[]) => void>;
  getSquareRef: React.RefObject<
    ((clientX: number, clientY: number) => Square | null) | undefined
  >;
  boardRef: React.RefObject<HTMLElement | null>;
  dragSessionRef: React.MutableRefObject<DragSession | null>;
  setPreview: (preview: AnnotationPreview | null) => void;
}

export function attachBoardAnnotationSupport({
  boardEl,
  orientationRef,
  shapesRef,
  onChangeRef,
  getSquareRef,
  boardRef,
  dragSessionRef,
  setPreview,
}: BoardAnnotationSupportOptions): () => void {
  const clearAll = () => {
    if (shapesRef.current.length === 0) {
      return;
    }
    onChangeRef.current([]);
    setPreview(null);
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

  const updatePreview = (
    session: DragSession,
    event: MouseEvent | TouchEvent,
  ) => {
    if (session.dest === session.orig) {
      setPreview(null);
      return;
    }

    setPreview({
      type: "arrow",
      path: buildArrowPath(session.orig, session.dest, session.visited),
      brush: arrowBrushFromModifiers(event),
    });
  };

  const handleMouseDown = (event: MouseEvent) => {
    if (isRightButton(event)) {
      const pos = getClientPosition(event);
      if (!pos) {
        return;
      }
      const square = resolveSquare(pos.x, pos.y);
      if (!square) {
        return;
      }
      dragSessionRef.current = createDragSession(square);
      setPreview(null);
      return;
    }
    if (event.button === 0) {
      clearAll();
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    const session = dragSessionRef.current;
    if (!session) {
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

    const next = updateDragSession(session, square);
    if (next !== session) {
      dragSessionRef.current = next;
      updatePreview(next, event);
    }
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (!isRightButton(event)) {
      return;
    }
    setPreview(null);
  };

  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 2) {
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
    dragSessionRef.current = createDragSession(square);
    setPreview(null);
  };

  const handleTouchMove = (event: TouchEvent) => {
    const session = dragSessionRef.current;
    if (!session) {
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
    const next = updateDragSession(session, square);
    if (next !== session) {
      dragSessionRef.current = next;
      updatePreview(next, event);
    }
  };

  const handleTouchEnd = () => {
    setPreview(null);
  };

  const captureOptions: AddEventListenerOptions = { capture: true };

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
    boardEl.removeEventListener("mousedown", handleMouseDown, captureOptions);
    document.removeEventListener("mousemove", handleMouseMove, captureOptions);
    document.removeEventListener("mouseup", handleMouseUp, captureOptions);
    boardEl.removeEventListener("touchstart", handleTouchStart, captureOptions);
    document.removeEventListener("touchmove", handleTouchMove, captureOptions);
    document.removeEventListener("touchend", handleTouchEnd, captureOptions);
    dragSessionRef.current = null;
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
  dragSessionRef: React.MutableRefObject<DragSession | null>;
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
  dragSessionRef,
}: UseBoardAnnotationsOptions): UseBoardAnnotationsResult {
  const shapesRef = useRef(shapes);
  const onChangeRef = useRef(onChange);
  const orientationRef = useRef(orientation);
  const getSquareRef = useRef(getSquareAtClientPos);

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
      return attachBoardAnnotationSupport({
        boardEl,
        orientationRef,
        shapesRef,
        onChangeRef,
        getSquareRef,
        boardRef,
        dragSessionRef,
        setPreview,
      });
    },
    [boardRef, dragSessionRef, enabled],
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
