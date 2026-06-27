"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type ReactNode } from "react";
import type { Square } from "chess.js";

import { ChessBoard } from "@/components/chess/ChessBoard";
import {
  MoveNavigationBindings,
  MoveNavigationHints,
} from "@/components/chess/MoveNavigationBindings";
import { PromotionDialog } from "@/components/chess/PromotionDialog";
import { PgnLineStats } from "@/components/pgn/PgnLineStats";
import { PgnPathBar } from "@/components/pgn/PgnPathBar";
import type { PromotionPiece } from "@/lib/chess/types";
import { useBoardAnnotationState } from "@/hooks/useBoardAnnotationState";
import { useRepertoireBuilder } from "@/hooks/useRepertoireBuilder";
import { REPERTOIRE_NAME_MAX_LENGTH } from "@/lib/repertoires";

interface PendingPromotion {
  from: Square;
  to: Square;
}

type BoardOrientation = "white" | "black";

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

interface RepertoireBuilderProps {
  repertoireId?: string;
  initialName?: string;
}

export function RepertoireBuilder({
  repertoireId,
  initialName,
}: RepertoireBuilderProps) {
  const router = useRouter();
  const builder = useRepertoireBuilder({ repertoireId, initialName });
  const boardAnnotations = useBoardAnnotationState();
  const boardNavRef = useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] = useState<BoardOrientation>("white");
  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);

  const handleMove = useCallback(
    (from: Square, to: Square): boolean => {
      if (builder.needsPromotion(from, to)) {
        setPendingPromotion({ from, to });
        return false;
      }
      return builder.attemptMove(from, to);
    },
    [builder],
  );

  const completePromotion = useCallback(
    (piece: PromotionPiece) => {
      if (!pendingPromotion) {
        return;
      }
      builder.completePromotion(
        pendingPromotion.from,
        pendingPromotion.to,
        piece,
      );
      setPendingPromotion(null);
    },
    [builder, pendingPromotion],
  );

  const handleSaveClick = useCallback(() => {
    if (!builder.canSave) {
      return;
    }
    const saved = builder.save();
    if (saved) {
      router.push("/repertoires");
    }
  }, [builder, router]);

  const turnColor = builder.turnLabel === "White" ? "white" : "black";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-100 lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-[1.2] flex-col p-3 sm:p-4 lg:flex-1">
        <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={builder.name}
              onChange={(event) => builder.setName(event.target.value)}
              maxLength={REPERTOIRE_NAME_MAX_LENGTH}
              className="w-full max-w-md truncate border-b border-transparent bg-transparent text-lg font-semibold text-zinc-900 focus:border-green-600 focus:outline-none sm:text-xl"
              aria-label="Repertoire name"
            />
            <p className="text-xs text-zinc-600 sm:text-sm">
              Play moves on the board, register complete lines, branch variations
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <FlipBoardButton
              orientation={orientation}
              onFlip={() =>
                setOrientation((current) =>
                  current === "white" ? "black" : "white",
                )
              }
            />
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={!builder.canSave || builder.isSaving}
              className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
            >
              {builder.isSaving ? "Saving…" : "Save repertoire"}
            </button>
          </div>
        </header>

        <BoardFrame>
          <div ref={boardNavRef} className="h-full w-full">
            <ChessBoard
              mode="study"
              fen={builder.boardFen}
              lastMove={builder.boardLastMove}
              repertoireDests={builder.movableDests}
              onRepertoireMove={handleMove}
              orientation={orientation}
              annotations={{
                ...boardAnnotations.annotations,
                enabled: pendingPromotion === null,
              }}
            />
          </div>
        </BoardFrame>
        <MoveNavigationHints />
        <MoveNavigationBindings
          navigation={builder.navigation}
          enabled={pendingPromotion === null}
          wheelTargetRef={boardNavRef}
        />
      </section>

      <aside className="flex min-h-0 w-full min-w-0 flex-col gap-3 border-t border-zinc-200 bg-white p-4 lg:w-[min(100%,24rem)] lg:max-w-md lg:border-l lg:border-t-0">
        <PgnPathBar
          path={builder.currentPath}
          currentNodeId={builder.currentNodeId}
          onSelect={builder.goToNode}
        />

        <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
          <p className="text-xs font-medium text-zinc-500">Turn</p>
          <p className="text-sm font-semibold text-zinc-900">
            {builder.turnLabel} to move
          </p>
        </div>

        <button
          type="button"
          onClick={builder.registerCurrentLine}
          disabled={!builder.canRegister}
          className="w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Register line
        </button>

        {builder.registerMessage ? (
          <p
            className={`text-sm ${
              builder.registerMessage === "Line registered."
                ? "text-green-700"
                : "text-amber-700"
            }`}
          >
            {builder.registerMessage}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={builder.undoMove}
            disabled={!builder.canUndo}
            className="flex-1 rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-40"
          >
            Undo move
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="mb-2 text-xs font-medium text-zinc-500">
            Registered lines ({builder.registeredLines.length})
          </p>
          {builder.registeredLines.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Register at least one complete line before saving.
            </p>
          ) : (
            <ul className="space-y-2">
              {builder.registeredLines.map((line, index) => (
                <li
                  key={line.leafId}
                  className="flex items-start gap-2 rounded-lg bg-zinc-50 p-2 ring-1 ring-zinc-200"
                >
                  <button
                    type="button"
                    onClick={() => builder.goToNode(line.leafId)}
                    className="min-w-0 flex-1 text-left font-mono text-xs text-zinc-800 hover:text-green-800"
                  >
                    <span className="font-sans text-zinc-400">
                      {index + 1}.{" "}
                    </span>
                    {line.label || "(empty)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => builder.removeRegisteredLine(line.leafId)}
                    className="shrink-0 text-xs text-red-600 hover:text-red-800"
                    aria-label="Remove registered line"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <PgnLineStats stats={builder.lineStats} />

        {builder.saveError ? (
          <p className="text-sm text-red-700">{builder.saveError}</p>
        ) : null}
      </aside>

      {pendingPromotion ? (
        <PromotionDialog
          color={turnColor}
          onSelect={completePromotion}
          onCancel={() => setPendingPromotion(null)}
        />
      ) : null}
    </div>
  );
}
