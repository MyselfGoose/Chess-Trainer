"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import type { Square } from "chess.js";

import { ChessBoard } from "@/components/chess/ChessBoard";
import { PromotionDialog } from "@/components/chess/PromotionDialog";
import { PgnStudyPanel } from "@/components/pgn/PgnStudyPanel";
import type { PromotionPiece } from "@/lib/chess/types";
import { useChessGame } from "@/hooks/useChessGame";
import { usePgnStudy } from "@/hooks/usePgnStudy";

interface StudyPendingPromotion {
  from: Square;
  to: Square;
}

type BoardOrientation = "white" | "black";

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
  const study = usePgnStudy();
  const play = useChessGame();
  const [orientation, setOrientation] = useState<BoardOrientation>("white");
  const [studyPromotion, setStudyPromotion] =
    useState<StudyPendingPromotion | null>(null);

  const flipBoard = useCallback(() => {
    setOrientation((current) => (current === "white" ? "black" : "white"));
  }, []);

  const handleStudyMove = useCallback(
    (from: Square, to: Square): boolean => {
      if (study.needsPromotion(from, to)) {
        setStudyPromotion({ from, to });
        return false;
      }
      return study.tryBoardMove(from, to);
    },
    [study],
  );

  const completeStudyPromotion = useCallback(
    (piece: PromotionPiece) => {
      if (!studyPromotion) {
        return;
      }
      study.tryBoardMove(
        studyPromotion.from,
        studyPromotion.to,
        piece,
      );
      setStudyPromotion(null);
    },
    [study, studyPromotion],
  );

  const cancelStudyPromotion = useCallback(() => {
    setStudyPromotion(null);
  }, []);

  const resultMessage = formatResult(play.snapshot.result);
  const turnLabel = play.snapshot.turn === "white" ? "White" : "Black";
  const studyTurnColor =
    study.turnLabel === "White" ? "white" : "black";

  if (!study.isHydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-100">
        <p className="text-sm text-zinc-500">Loading board…</p>
      </div>
    );
  }

  if (study.hasStudy && study.study && study.currentGame && study.lineStats) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-zinc-100 lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-[1.2] flex-col p-3 sm:p-4 lg:flex-1">
          <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-zinc-900 sm:text-xl">
                Study mode
              </h1>
              <p className="text-xs text-zinc-600 sm:text-sm">
                Choose your next move from the repertoire
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <FlipBoardButton orientation={orientation} onFlip={flipBoard} />
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-green-700 ring-1 ring-green-200 transition hover:bg-green-50"
              >
                Upload PGN
              </Link>
            </div>
          </header>

          <BoardFrame>
            <ChessBoard
              mode="study"
              fen={study.boardFen}
              lastMove={study.boardLastMove}
              repertoireDests={study.repertoireDests}
              onRepertoireMove={handleStudyMove}
              orientation={orientation}
            />
          </BoardFrame>
        </section>

        <aside className="flex h-[42dvh] min-h-0 w-full min-w-0 shrink-0 flex-col border-t border-zinc-200 bg-white lg:h-full lg:w-[min(100%,26rem)] lg:max-w-md lg:flex-1 lg:shrink-0 lg:border-l lg:border-t-0">
          <PgnStudyPanel
            games={study.study.games}
            selectedGameIndex={study.study.selectedGameIndex}
            currentGame={study.currentGame}
            currentNodeId={study.currentNodeId}
            currentPath={study.currentPath}
            availableMoves={study.availableMoves}
            turnLabel={study.turnLabel}
            isAtLineEnd={study.isAtLineEnd}
            lineStats={study.lineStats}
            onSelectGame={study.selectGame}
            onSelectNode={study.goToNode}
            onSelectChoice={study.selectChoice}
            onBack={study.goBack}
            onClear={study.clearStudyData}
          />
        </aside>

        {studyPromotion ? (
          <PromotionDialog
            color={studyTurnColor}
            onSelect={completeStudyPromotion}
            onCancel={cancelStudyPromotion}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-100 lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-4">
        <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-zinc-900 sm:text-xl">
              Chess Board
            </h1>
            <p className="text-xs text-zinc-600 sm:text-sm">
              Click or drag pieces to play
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <FlipBoardButton orientation={orientation} onFlip={flipBoard} />
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-green-700 ring-1 ring-green-200 transition hover:bg-green-50"
            >
              Upload PGN
            </Link>
          </div>
        </header>

        <BoardFrame>
          <ChessBoard
            mode="play"
            chess={play.chess}
            snapshot={play.snapshot}
            onMove={play.attemptMove}
            orientation={orientation}
          />
        </BoardFrame>

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
