"use client";

import Link from "next/link";

import { ChessBoard } from "@/components/chess/ChessBoard";
import { PromotionDialog } from "@/components/chess/PromotionDialog";
import { PgnStudyPanel } from "@/components/pgn/PgnStudyPanel";
import { useChessGame } from "@/hooks/useChessGame";
import { usePgnStudy } from "@/hooks/usePgnStudy";

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

export default function BoardPage() {
  const study = usePgnStudy();
  const play = useChessGame();

  const resultMessage = formatResult(play.snapshot.result);
  const turnLabel = play.snapshot.turn === "white" ? "White" : "Black";

  if (study.hasStudy && study.study && study.currentGame && study.lineStats) {
    return (
      <div className="min-h-screen bg-zinc-100">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:py-8">
          <div className="flex shrink-0 flex-col items-center gap-4 lg:w-[min(100%,560px)]">
            <header className="w-full text-center lg:text-left">
              <h1 className="text-2xl font-semibold text-zinc-900">
                Study mode
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                {study.study.fileName
                  ? `Studying ${study.study.fileName}`
                  : "Navigate moves in the sidebar"}
              </p>
            </header>

            <div className="w-full max-w-[min(100%,560px)]">
              <div className="rounded-sm p-1 shadow-lg ring-1 ring-black/10">
                <ChessBoard
                  mode="study"
                  fen={study.boardFen}
                  lastMove={study.boardLastMove}
                />
              </div>
            </div>

            <Link
              href="/"
              className="text-sm font-medium text-green-700 hover:text-green-800"
            >
              Upload another PGN
            </Link>
          </div>

          <div className="min-h-[400px] flex-1 lg:min-h-0">
            <PgnStudyPanel
              games={study.study.games}
              selectedGameIndex={study.study.selectedGameIndex}
              currentGame={study.currentGame}
              currentNodeId={study.currentNodeId}
              currentPath={study.currentPath}
              lineStats={study.lineStats}
              onSelectGame={study.selectGame}
              onSelectNode={study.goToNode}
              onPrev={study.goPrev}
              onNext={study.goNext}
              onClear={study.clearStudyData}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-6 px-4 py-10">
        <header className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Chess Board</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Click or drag pieces to play. Only legal moves are allowed.
          </p>
          <Link
            href="/"
            className="mt-2 inline-block text-sm font-medium text-green-700 hover:text-green-800"
          >
            Upload a PGN to study
          </Link>
        </header>

        <div className="w-full max-w-[min(100%,560px)]">
          <div className="rounded-sm p-1 shadow-lg ring-1 ring-black/10">
            <ChessBoard
              mode="play"
              chess={play.chess}
              snapshot={play.snapshot}
              onMove={play.attemptMove}
            />
          </div>
        </div>

        <div className="flex w-full max-w-[min(100%,560px)] flex-col gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-700">
              <span className="font-medium">Turn:</span> {turnLabel}
              {play.snapshot.inCheck ? (
                <span className="ml-2 font-medium text-red-600">Check</span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={play.resetGame}
              className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-800"
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
      </div>

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
