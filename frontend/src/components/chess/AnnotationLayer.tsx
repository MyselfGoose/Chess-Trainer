"use client";

import { useId, useMemo, type CSSProperties, type ReactNode } from "react";

import {
  BRUSH_STYLES,
  pointsToSvgPath,
  squareToPoint,
  type AnnotationPreview,
  type BoardAnnotation,
  type BoardOrientation,
} from "@/lib/chess/annotations";

interface AnnotationLayerProps {
  annotations: BoardAnnotation[];
  preview?: AnnotationPreview | null;
  orientation: BoardOrientation;
  style?: CSSProperties;
}

const VIEW_SIZE = 8;
const STROKE_WIDTH = 0.12;
const ARROW_HEAD_LENGTH = 0.28;
const SQUARE_HALF = 0.5;

function toSvgCoord(value: number): number {
  return ((value + 4) / VIEW_SIZE) * 100;
}

function pointToSvg(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: toSvgCoord(point.x),
    y: toSvgCoord(point.y),
  };
}

function shortenPathEnd(
  points: { x: number; y: number }[],
  margin: number,
): { x: number; y: number }[] {
  if (points.length < 2) {
    return points;
  }
  const copy = points.map((p) => ({ ...p }));
  const last = copy[copy.length - 1]!;
  const prev = copy[copy.length - 2]!;
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  const len = Math.hypot(dx, dy);
  if (len <= margin) {
    return copy;
  }
  last.x -= (dx / len) * margin;
  last.y -= (dy / len) * margin;
  return copy;
}

function renderArrow(
  path: string,
  brush: keyof typeof BRUSH_STYLES,
  markerId: string,
  preview: boolean,
  key: string,
): ReactNode {
  const style = BRUSH_STYLES[brush];
  return (
    <path
      key={key}
      d={path}
      className={`annotation-arrow${preview ? " annotation-arrow--preview" : ""}`}
      stroke={style.stroke}
      strokeWidth={STROKE_WIDTH * 100}
      strokeOpacity={style.opacity}
      markerEnd={`url(#${markerId})`}
    />
  );
}

export function AnnotationLayer({
  annotations,
  preview,
  orientation,
  style,
}: AnnotationLayerProps) {
  const layerId = useId().replace(/:/g, "");

  const arrowMarkers = useMemo(() => {
    return (Object.keys(BRUSH_STYLES) as Array<keyof typeof BRUSH_STYLES>).map(
      (brush) => {
        const style = BRUSH_STYLES[brush];
        const id = `${layerId}-arrowhead-${brush}`;
        return (
          <marker
            key={id}
            id={id}
            markerWidth={4}
            markerHeight={4}
            refX={2.05}
            refY={2}
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 V4 L3,2 Z" fill={style.stroke} fillOpacity={style.opacity} />
          </marker>
        );
      },
    );
  }, [layerId]);

  const arrowElements = annotations
    .filter((annotation) => annotation.type === "arrow")
    .map((annotation, index) => {
      const points = annotation.path.map((square) =>
        pointToSvg(squareToPoint(square, orientation)),
      );
      const shortened = shortenPathEnd(points, ARROW_HEAD_LENGTH);
      const path = pointsToSvgPath(shortened);
      return renderArrow(
        path,
        annotation.brush,
        `${layerId}-arrowhead-${annotation.brush}`,
        false,
        `arrow-${index}-${annotation.path.join("-")}`,
      );
    });

  const squareElements = annotations
    .filter((annotation) => annotation.type === "square")
    .map((annotation) => {
      const center = pointToSvg(squareToPoint(annotation.square, orientation));
      const style = BRUSH_STYLES[annotation.brush];
      const size = (SQUARE_HALF * 2 * 100) / VIEW_SIZE;
      return (
        <rect
          key={`square-${annotation.square}-${annotation.brush}`}
          className="annotation-square"
          x={center.x - size / 2}
          y={center.y - size / 2}
          width={size}
          height={size}
          fill={style.fill}
          fillOpacity={style.squareOpacity}
        />
      );
    });

  const previewElement =
    preview && preview.path.length >= 2
      ? renderArrow(
          pointsToSvgPath(
            shortenPathEnd(
              preview.path.map((square) =>
                pointToSvg(squareToPoint(square, orientation)),
              ),
              ARROW_HEAD_LENGTH,
            ),
          ),
          preview.brush,
          `${layerId}-arrowhead-${preview.brush}`,
          true,
          "preview",
        )
      : null;

  if (
    arrowElements.length === 0 &&
    squareElements.length === 0 &&
    !previewElement
  ) {
    return null;
  }

  return (
    <div className="annotation-layer" style={style} aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>{arrowMarkers}</defs>
        {squareElements}
        {arrowElements}
        {previewElement}
      </svg>
    </div>
  );
}
