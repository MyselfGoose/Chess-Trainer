"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { ChessBoard } from "@/components/chess/ChessBoard";
import {
  MoveNavigationBindings,
  MoveNavigationHints,
} from "@/components/chess/MoveNavigationBindings";
import { PromotionDialog } from "@/components/chess/PromotionDialog";
import { useBoardAnnotationState } from "@/hooks/useBoardAnnotationState";
import { useChessGame } from "@/hooks/useChessGame";
import {
  BOARD_ORIENTATION_KEY,
  loadOrientationPreference,
  saveOrientationPreference,
  toggleOrientation,
} from "@/lib/chess/orientationPreference";
import type { BoardOrientation } from "@/lib/repertoires/types";

function formatResult(
  result: ReturnType<typeof useChessGame>["snapshot"]["result"],
): string | null {
  switch (result.status) {
    case "ongoing":
      return null;
    case "checkmate":
      return `Checkmate — ${result.winner === "white" ? "White" : "Black"} wins`;
    case "stalemate":
      return "Stalemate — draw";
    case "draw":
      return `Draw — ${result.reason}`;
    default:
      return null;
  }
}

function FlipBoardButton({
  orientation,
  onFlip,
}: {
  orientation: BoardOrientation;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFlip}
      className="shrink-0 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
    >
      Flip ({orientation === "white" ? "White" : "Black"} below)
    </button>
  );
}

function BoardFrame({ children }: { children: ReactNode }) {
  return (
    <div className="board-fit-container">
      <div className="board-fit-square rounded-sm p-1 shadow-lg ring-1 ring-black/10">
        {children}
      </div>
    </div>
  );
}

function PlayControls({
  turnLabel,
  inCheck,
  onReset,
  resultMessage,
}: {
  turnLabel: string;
  inCheck: boolean;
  onReset: () => void;
  resultMessage: string | null;
}) {
  return (
    <div className="flex w-full max-w-lg shrink-0 flex-col gap-2 rounded-lg bg-white p-3 shadow-sm ring-1 ring-zinc-200">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-700">
          <span className="font-medium">Turn:</span> {turnLabel}
          {inCheck ? (
            <span className="ml-2 font-medium text-red-600">Check</span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-800"
        >
          New Game
        </button>
      </div>
      {resultMessage ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
          {resultMessage}
        </p>
      ) : null}
    </div>
  );
}

export default function BoardPage() {
  const play = useChessGame();
  const boardAnnotations = useBoardAnnotationState();
  const boardNavRef = useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] = useState<BoardOrientation>(() =>
    loadOrientationPreference(BOARD_ORIENTATION_KEY),
  );

  useEffect(() => {
    saveOrientationPreference(BOARD_ORIENTATION_KEY, orientation);
  }, [orientation]);

  const flipBoard = useCallback(() => {
    setOrientation((current) => toggleOrientation(current));
  }, []);

  const resultMessage = formatResult(play.snapshot.result);
  const turnLabel = play.snapshot.turn === "white" ? "White" : "Black";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-100 lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-4">
        <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-zinc-900 sm:text-xl">
              Chess Board
            </h1>
            <p className="text-xs text-zinc-600 sm:text-sm">
              Click or drag pieces to play a free game
            </p>
          </div>
          <FlipBoardButton orientation={orientation} onFlip={flipBoard} />
        </header>

        <BoardFrame>
          <div ref={boardNavRef} className="h-full w-full">
            <ChessBoard
              mode="play"
              chess={play.chess}
              snapshot={play.snapshot}
              onMove={play.attemptMove}
              orientation={orientation}
              annotations={{
                ...boardAnnotations.annotations,
                enabled: play.pendingPromotion === null,
              }}
            />
          </div>
        </BoardFrame>
        <MoveNavigationHints />
        <MoveNavigationBindings
          navigation={play.navigation}
          enabled={play.pendingPromotion === null}
          wheelTargetRef={boardNavRef}
        />

        <div className="mt-3 flex shrink-0 justify-center lg:hidden">
          <PlayControls
            turnLabel={turnLabel}
            inCheck={play.snapshot.inCheck}
            onReset={play.resetGame}
            resultMessage={resultMessage}
          />
        </div>
      </section>

      <aside className="hidden min-h-0 w-full min-w-0 flex-col justify-center border-l border-zinc-200 bg-white p-4 lg:flex lg:w-80 lg:shrink-0">
        <PlayControls
          turnLabel={turnLabel}
          inCheck={play.snapshot.inCheck}
          onReset={play.resetGame}
          resultMessage={resultMessage}
        />
      </aside>

      {play.pendingPromotion ? (
        <PromotionDialog
          color={play.snapshot.turn}
          onSelect={play.completePromotion}
          onCancel={play.cancelPromotion}
        />
      ) : null}
    </div>
  );
}
