"use client";

import { ChessBoard } from "@/components/chess/ChessBoard";
import { PromotionDialog } from "@/components/chess/PromotionDialog";
import { useChessGame } from "@/hooks/useChessGame";

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
  const {
    snapshot,
    pendingPromotion,
    attemptMove,
    completePromotion,
    cancelPromotion,
    resetGame,
    chess,
  } = useChessGame();

  const resultMessage = formatResult(snapshot.result);
  const turnLabel = snapshot.turn === "white" ? "White" : "Black";

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-6 px-4 py-10">
        <header className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Chess Board</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Click or drag pieces to play. Only legal moves are allowed.
          </p>
        </header>

        <div className="w-full max-w-[min(100%,560px)]">
          <div className="rounded-sm p-1 shadow-lg ring-1 ring-black/10">
            <ChessBoard
              chess={chess}
              snapshot={snapshot}
              onMove={attemptMove}
            />
          </div>
        </div>

        <div className="flex w-full max-w-[min(100%,560px)] flex-col gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-700">
              <span className="font-medium">Turn:</span> {turnLabel}
              {snapshot.inCheck ? (
                <span className="ml-2 font-medium text-red-600">Check</span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={resetGame}
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

      {pendingPromotion ? (
        <PromotionDialog
          color={snapshot.turn}
          onSelect={completePromotion}
          onCancel={cancelPromotion}
        />
      ) : null}
    </div>
  );
}
