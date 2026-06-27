"use client";

import { useId, useMemo, type CSSProperties, type ReactNode } from "react";

import {
  BRUSH_STYLES,
  pointsToSvgPath,
  squareToPoint,
  type AnnotationPreview,
  type BoardAnnotation,
  type BoardOrientation,
  type Point,
} from "@/lib/chess/annotations";

interface AnnotationLayerProps {
  annotations: BoardAnnotation[];
  preview?: AnnotationPreview | null;
  orientation: BoardOrientation;
  style?: CSSProperties;
}

/** Matches @lichess-org/chessground drawable stroke width. */
const STROKE_WIDTH = 10 / 64;
/** Margin before arrowhead in chessground user coordinates. */
const ARROW_HEAD_MARGIN = 20 / 64;
const SQUARE_SIZE = 1;

function shortenPathEnd(points: Point[], margin: number): Point[] {
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
      strokeWidth={STROKE_WIDTH}
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
        const brushStyle = BRUSH_STYLES[brush];
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
            overflow="visible"
          >
            <path
              d="M0,0 V4 L3,2 Z"
              fill={brushStyle.stroke}
              fillOpacity={brushStyle.opacity}
            />
          </marker>
        );
      },
    );
  }, [layerId]);

  const arrowElements = annotations
    .filter((annotation) => annotation.type === "arrow")
    .map((annotation, index) => {
      const points = annotation.path.map((square) =>
        squareToPoint(square, orientation),
      );
      const shortened = shortenPathEnd(points, ARROW_HEAD_MARGIN);
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
      const center = squareToPoint(annotation.square, orientation);
      const brushStyle = BRUSH_STYLES[annotation.brush];
      return (
        <rect
          key={`square-${annotation.square}-${annotation.brush}`}
          className="annotation-square"
          x={center.x - SQUARE_SIZE / 2}
          y={center.y - SQUARE_SIZE / 2}
          width={SQUARE_SIZE}
          height={SQUARE_SIZE}
          fill={brushStyle.fill}
          fillOpacity={brushStyle.squareOpacity}
        />
      );
    });

  const previewElement =
    preview && preview.path.length >= 2
      ? renderArrow(
          pointsToSvgPath(
            shortenPathEnd(
              preview.path.map((square) =>
                squareToPoint(square, orientation),
              ),
              ARROW_HEAD_MARGIN,
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
      <svg viewBox="-4 -4 8 8" preserveAspectRatio="xMidYMid slice">
        <defs>{arrowMarkers}</defs>
        {squareElements}
        {arrowElements}
        {previewElement}
      </svg>
    </div>
  );
}
