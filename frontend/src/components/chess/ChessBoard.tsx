"use client";

import { useEffect, useRef } from "react";
import { Chessground } from "@lichess-org/chessground";
import type { Api } from "@lichess-org/chessground/api";
import type { Color, Key } from "@lichess-org/chessground/types";
import type { Square } from "chess.js";

import { buildMovableDests } from "@/lib/chess/destinations";
import type { ChessGame } from "@/lib/chess/game";
import type { ChessGameSnapshot } from "@/lib/chess/types";

interface ChessBoardProps {
  chess: ChessGame;
  snapshot: ChessGameSnapshot;
  onMove: (from: Square, to: Square) => boolean;
  orientation?: "white" | "black";
  className?: string;
}

function toChessgroundColor(color: "white" | "black"): Color {
  return color;
}

export function ChessBoard({
  chess,
  snapshot,
  onMove,
  orientation = "white",
  className,
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  const fenRef = useRef(snapshot.fen);

  useEffect(() => {
    onMoveRef.current = onMove;
    fenRef.current = snapshot.fen;
  });

  useEffect(() => {
    const element = boardRef.current;
    if (!element) {
      return;
    }

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
  }, [chess, orientation]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) {
      return;
    }

    const engine = chess.getEngine();
    const turnColor = toChessgroundColor(snapshot.turn);
    const gameOver = snapshot.result.status !== "ongoing";

    api.set({
      fen: snapshot.fen,
      turnColor,
      check: snapshot.inCheck ? turnColor : undefined,
      lastMove: snapshot.lastMove ?? undefined,
      movable: {
        color: gameOver ? undefined : turnColor,
        dests: gameOver ? new Map() : buildMovableDests(engine),
        showDests: !gameOver,
      },
    });
  }, [chess, snapshot]);

  return (
    <div
      className={className}
      style={{ width: "100%", aspectRatio: "1 / 1" }}
    >
      <div ref={boardRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
