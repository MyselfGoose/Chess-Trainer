"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Color, Key } from "@lichess-org/chessground/types";
import { Chess } from "chess.js";
import type { Square } from "chess.js";

import { AnnotationLayer } from "@/components/chess/AnnotationLayer";
import { buildMovableDests } from "@/lib/chess/destinations";
import {
  CHESSGROUND_DRAW_BRUSHES,
  drawShapesToAnnotations,
  mergeAnnotationChange,
  type BoardAnnotation,
  type BoardAnnotationsConfig,
  type DragSession,
} from "@/lib/chess/annotations";
import type { ChessGame } from "@/lib/chess/game";
import type { ChessGameSnapshot } from "@/lib/chess/types";
import { useBoardAnnotations } from "@/hooks/useBoardAnnotations";
import { useBoardOverlayStyle } from "@/hooks/useBoardOverlayStyle";

export type { BoardAnnotationsConfig } from "@/lib/chess/annotations";

type CommonBoardProps = {
  orientation?: "white" | "black";
  className?: string;
  annotations?: BoardAnnotationsConfig;
};

type PlayModeProps = CommonBoardProps & {
  mode: "play";
  chess: ChessGame;
  snapshot: ChessGameSnapshot;
  onMove: (from: Square, to: Square) => boolean;
};

type StudyModeProps = CommonBoardProps & {
  mode: "study";
  fen: string;
  lastMove?: [Square, Square] | null;
  repertoireDests?: Map<Square, Square[]>;
  onRepertoireMove?: (from: Square, to: Square) => boolean;
};

export type ChessBoardProps = PlayModeProps | StudyModeProps;

const DISABLED_DRAWABLE = {
  enabled: false,
  visible: false,
  shapes: [] as DrawShape[],
  autoShapes: [] as DrawShape[],
};

function toChessgroundColor(color: "white" | "black"): Color {
  return color;
}

function getTurnFromFen(fen: string): "white" | "black" {
  const chess = new Chess(fen);
  return chess.turn() === "w" ? "white" : "black";
}

function isInCheck(fen: string): boolean {
  const chess = new Chess(fen);
  return chess.inCheck();
}

function toChessgroundDests(
  dests: Map<Square, Square[]> | undefined,
): Map<Key, Key[]> {
  const result = new Map<Key, Key[]>();
  if (!dests) {
    return result;
  }
  for (const [from, squares] of dests) {
    result.set(from as Key, squares.map((square) => square as Key));
  }
  return result;
}

function hasRepertoireMoves(
  dests: Map<Square, Square[]> | undefined,
): boolean {
  if (!dests) {
    return false;
  }
  return dests.size > 0;
}

function createDrawableConfig(
  enabled: boolean,
  onChange: (shapes: DrawShape[]) => void,
) {
  if (!enabled) {
    return DISABLED_DRAWABLE;
  }
  return {
    enabled: true,
    visible: false,
    defaultSnapToValidMove: false,
    eraseOnMovablePieceClick: false,
    shapes: [] as DrawShape[],
    autoShapes: [] as DrawShape[],
    brushes: CHESSGROUND_DRAW_BRUSHES,
    onChange,
  };
}

export function ChessBoard(props: ChessBoardProps) {
  const { orientation = "white", className, annotations } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const userShapesRef = useRef<BoardAnnotation[]>(annotations?.shapes ?? []);
  const annotationsOnChangeRef = useRef(annotations?.onChange ?? (() => undefined));

  const onMoveRef = useRef(
    props.mode === "play"
      ? props.onMove
      : props.mode === "study" && props.onRepertoireMove
        ? props.onRepertoireMove
        : () => false,
  );
  const fenRef = useRef(props.mode === "play" ? props.snapshot.fen : props.fen);

  const annotationsEnabled =
    annotations !== undefined && annotations.enabled !== false;

  useEffect(() => {
    annotationsOnChangeRef.current = annotations?.onChange ?? (() => undefined);
  }, [annotations?.onChange]);

  useEffect(() => {
    userShapesRef.current = annotations?.shapes ?? [];
  }, [annotations?.shapes]);

  const handleDrawableChange = useCallback((shapes: DrawShape[]) => {
    const session = dragSessionRef.current;
    const incoming = drawShapesToAnnotations(shapes, session);
    dragSessionRef.current = null;
    const next = mergeAnnotationChange(userShapesRef.current, incoming);
    userShapesRef.current = next;
    annotationsOnChangeRef.current(next);
    apiRef.current?.set({ drawable: { shapes: [], autoShapes: [] } });
  }, []);

  const getSquareAtClientPos = useCallback(
    (clientX: number, clientY: number): Square | null => {
      const api = apiRef.current;
      if (api) {
        const key = api.getKeyAtDomPos([clientX, clientY]);
        if (key) {
          return key as Square;
        }
      }
      return null;
    },
    [],
  );

  const overlayStyle = useBoardOverlayStyle(containerRef, boardRef, orientation);

  const { preview, bindListeners } = useBoardAnnotations({
    boardRef,
    orientation,
    enabled: annotationsEnabled,
    shapes: annotations?.shapes ?? [],
    onChange: annotations?.onChange ?? (() => undefined),
    getSquareAtClientPos,
    dragSessionRef,
  });

  const renderedAnnotations = useMemo(
    () => [...(annotations?.autoShapes ?? []), ...(annotations?.shapes ?? [])],
    [annotations?.autoShapes, annotations?.shapes],
  );

  useEffect(() => {
    if (props.mode === "play") {
      onMoveRef.current = props.onMove;
      fenRef.current = props.snapshot.fen;
    } else {
      fenRef.current = props.fen;
      onMoveRef.current = props.onRepertoireMove ?? (() => false);
    }
  });

  useEffect(() => {
    const element = boardRef.current;
    const container = containerRef.current;
    if (!element || !container) {
      return;
    }

    const commonConfig = {
      orientation,
      coordinates: true,
      animation: { enabled: true, duration: 200 },
      highlight: { lastMove: true, check: true },
      addDimensionsCssVarsTo: container,
      drawable: createDrawableConfig(annotationsEnabled, handleDrawableChange),
      disableContextMenu: annotationsEnabled,
    };

    if (props.mode === "study") {
      const turnColor = toChessgroundColor(getTurnFromFen(props.fen));
      const inCheck = isInCheck(props.fen);
      const canPlay = hasRepertoireMoves(props.repertoireDests);
      const dests = toChessgroundDests(props.repertoireDests);

      const api = Chessground(element, {
        ...commonConfig,
        fen: props.fen,
        turnColor,
        check: inCheck ? turnColor : undefined,
        lastMove: props.lastMove ?? undefined,
        viewOnly: !canPlay,
        draggable: { enabled: canPlay, showGhost: canPlay },
        selectable: { enabled: canPlay },
        movable: canPlay
          ? {
              free: false,
              color: turnColor,
              dests,
              showDests: true,
              events: {
                after: (orig: Key, dest: Key) => {
                  const accepted = onMoveRef.current(
                    orig as Square,
                    dest as Square,
                  );
                  if (!accepted) {
                    api.set({ fen: fenRef.current });
                  }
                },
              },
            }
          : { free: false, color: undefined, dests: new Map() },
      });

      apiRef.current = api;
      return () => {
        api.destroy();
        apiRef.current = null;
      };
    }

    const { chess, snapshot } = props;
    const engine = chess.getEngine();
    const turnColor = toChessgroundColor(snapshot.turn);

    const api = Chessground(element, {
      ...commonConfig,
      fen: snapshot.fen,
      turnColor,
      check: snapshot.inCheck ? turnColor : undefined,
      lastMove: snapshot.lastMove ?? undefined,
      draggable: { enabled: true, showGhost: true },
      selectable: { enabled: true },
      movable: {
        free: false,
        color: turnColor,
        dests: buildMovableDests(engine),
        showDests: true,
        events: {
          after: (orig: Key, dest: Key) => {
            const accepted = onMoveRef.current(orig as Square, dest as Square);
            if (!accepted) {
              api.set({ fen: fenRef.current });
            }
          },
        },
      },
    });

    apiRef.current = api;

    return () => {
      api.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once; sync via second effect
  }, [annotationsEnabled, handleDrawableChange, orientation, props.mode]);

  useEffect(() => {
    const root = boardRef.current;
    if (!root || !annotationsEnabled || !apiRef.current) {
      return;
    }

    const boardEl = root.querySelector("cg-board");
    if (!(boardEl instanceof HTMLElement)) {
      return;
    }

    return bindListeners(boardEl);
  }, [annotationsEnabled, bindListeners, orientation, props.mode]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) {
      return;
    }

    const drawable = createDrawableConfig(
      annotationsEnabled,
      handleDrawableChange,
    );

    if (props.mode === "study") {
      const turnColor = toChessgroundColor(getTurnFromFen(props.fen));
      const inCheck = isInCheck(props.fen);
      const canPlay = hasRepertoireMoves(props.repertoireDests);
      const dests = toChessgroundDests(props.repertoireDests);

      api.set({
        fen: props.fen,
        orientation,
        turnColor,
        check: inCheck ? turnColor : undefined,
        lastMove: props.lastMove ?? undefined,
        viewOnly: !canPlay,
        draggable: { enabled: canPlay, showGhost: canPlay },
        selectable: { enabled: canPlay },
        disableContextMenu: annotationsEnabled,
        drawable,
        movable: canPlay
          ? {
              free: false,
              color: turnColor,
              dests,
              showDests: true,
            }
          : { free: false, color: undefined, dests: new Map() },
      });
      return;
    }

    const { chess, snapshot } = props;
    const engine = chess.getEngine();
    const turnColor = toChessgroundColor(snapshot.turn);
    const gameOver = snapshot.result.status !== "ongoing";

    api.set({
      fen: snapshot.fen,
      orientation,
      turnColor,
      check: snapshot.inCheck ? turnColor : undefined,
      lastMove: snapshot.lastMove ?? undefined,
      disableContextMenu: annotationsEnabled,
      drawable,
      movable: {
        color: gameOver ? undefined : turnColor,
        dests: gameOver ? new Map() : buildMovableDests(engine),
        showDests: !gameOver,
      },
    });
  }, [annotationsEnabled, handleDrawableChange, orientation, props]);

  return (
    <div
      ref={containerRef}
      className={`chess-board-container relative ${className ?? ""}`}
    >
      <div ref={boardRef} className="chess-board-host" />
      {annotationsEnabled ? (
        <AnnotationLayer
          annotations={renderedAnnotations}
          preview={preview}
          orientation={orientation}
          style={overlayStyle}
        />
      ) : null}
    </div>
  );
}
