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

function BoardToolbar({
  orientation,
  onFlip,
  children,
}: {
  orientation: BoardOrientation;
  onFlip: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full max-w-[min(100%,560px)] items-center justify-between gap-3">
      <button
        type="button"
        onClick={onFlip}
        className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
      >
        Flip board ({orientation === "white" ? "White" : "Black"} below)
      </button>
      {children}
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <p className="text-sm text-zinc-500">Loading board…</p>
      </div>
    );
  }

  if (study.hasStudy && study.study && study.currentGame && study.lineStats) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-zinc-100">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-start lg:py-8">
          <div className="flex min-w-0 flex-col items-center gap-4">
            <header className="w-full text-center lg:text-left">
              <h1 className="text-2xl font-semibold text-zinc-900">
                Study mode
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Choose your next move from the repertoire
              </p>
            </header>

            <BoardToolbar orientation={orientation} onFlip={flipBoard} />

            <div className="w-full max-w-[560px]">
              <div className="rounded-sm p-1 shadow-lg ring-1 ring-black/10">
                <ChessBoard
                  mode="study"
                  fen={study.boardFen}
                  lastMove={study.boardLastMove}
                  repertoireDests={study.repertoireDests}
                  onRepertoireMove={handleStudyMove}
                  orientation={orientation}
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

          <div className="min-h-[400px] min-w-0">
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
          </div>
        </div>

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
    <div className="min-h-screen overflow-x-hidden bg-zinc-100">
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

        <BoardToolbar orientation={orientation} onFlip={flipBoard} />

        <div className="w-full max-w-[min(100%,560px)]">
          <div className="rounded-sm p-1 shadow-lg ring-1 ring-black/10">
            <ChessBoard
              mode="play"
              chess={play.chess}
              snapshot={play.snapshot}
              onMove={play.attemptMove}
              orientation={orientation}
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
