"use client";

import { useEffect, useRef } from "react";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { Color, Key } from "@lichess-org/chessground/types";
import { Chess } from "chess.js";
import type { Square } from "chess.js";

import { buildMovableDests } from "@/lib/chess/destinations";
import type { ChessGame } from "@/lib/chess/game";
import type { ChessGameSnapshot } from "@/lib/chess/types";

type PlayModeProps = {
  mode: "play";
  chess: ChessGame;
  snapshot: ChessGameSnapshot;
  onMove: (from: Square, to: Square) => boolean;
  orientation?: "white" | "black";
  className?: string;
};

type StudyModeProps = {
  mode: "study";
  fen: string;
  lastMove?: [Square, Square] | null;
  repertoireDests?: Map<Square, Square[]>;
  onRepertoireMove?: (from: Square, to: Square) => boolean;
  orientation?: "white" | "black";
  className?: string;
};

export type ChessBoardProps = PlayModeProps | StudyModeProps;

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

export function ChessBoard(props: ChessBoardProps) {
  const { orientation = "white", className } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const onMoveRef = useRef(
    props.mode === "play"
      ? props.onMove
      : props.mode === "study" && props.onRepertoireMove
        ? props.onRepertoireMove
        : () => false,
  );
  const fenRef = useRef(props.mode === "play" ? props.snapshot.fen : props.fen);

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

    if (props.mode === "study") {
      const turnColor = toChessgroundColor(getTurnFromFen(props.fen));
      const inCheck = isInCheck(props.fen);
      const canPlay = hasRepertoireMoves(props.repertoireDests);
      const dests = toChessgroundDests(props.repertoireDests);

      const api = Chessground(element, {
        fen: props.fen,
        orientation,
        turnColor,
        check: inCheck ? turnColor : undefined,
        lastMove: props.lastMove ?? undefined,
        coordinates: true,
        animation: { enabled: true, duration: 200 },
        highlight: { lastMove: true, check: true },
        viewOnly: !canPlay,
        draggable: { enabled: canPlay, showGhost: canPlay },
        selectable: { enabled: canPlay },
        addDimensionsCssVarsTo: container,
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
      fen: snapshot.fen,
      orientation,
      turnColor,
      check: snapshot.inCheck ? turnColor : undefined,
      lastMove: snapshot.lastMove ?? undefined,
      coordinates: true,
      animation: { enabled: true, duration: 200 },
      highlight: { lastMove: true, check: true },
      draggable: { enabled: true, showGhost: true },
      selectable: { enabled: true },
      addDimensionsCssVarsTo: container,
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
  }, [orientation, props.mode]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) {
      return;
    }

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
      movable: {
        color: gameOver ? undefined : turnColor,
        dests: gameOver ? new Map() : buildMovableDests(engine),
        showDests: !gameOver,
      },
    });
  }, [orientation, props]);

  return (
    <div
      ref={containerRef}
      className={`chess-board-container ${className ?? ""}`}
    >
      <div ref={boardRef} className="chess-board-host" />
    </div>
  );
}
