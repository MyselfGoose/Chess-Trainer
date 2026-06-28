"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import {
  BUILDER_ORIENTATION_KEY,
  loadOrientationPreference,
  saveOrientationPreference,
  toggleOrientation,
} from "@/lib/chess/orientationPreference";
import { useBoardAnnotationState } from "@/hooks/useBoardAnnotationState";
import { useRepertoireBuilder } from "@/hooks/useRepertoireBuilder";
import { REPERTOIRE_NAME_MAX_LENGTH } from "@/lib/repertoires";
import type { BoardOrientation } from "@/lib/repertoires/types";

interface PendingPromotion {
  from: Square;
  to: Square;
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
      className="shrink-0 rounded-md bg-surface px-3 py-1.5 text-sm font-medium text-foreground/90 ring-1 ring-border transition hover:bg-background"
    >
      Flip ({orientation === "white" ? "White" : "Black"} below)
    </button>
  );
}

function BoardFrame({ children }: { children: ReactNode }) {
  return (
    <div className="board-fit-container">
      <div className="board-fit-square rounded-sm p-1 shadow-lg ring-1 ring-border">
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
  const [orientation, setOrientation] = useState<BoardOrientation>(() =>
    loadOrientationPreference(BUILDER_ORIENTATION_KEY),
  );
  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);

  useEffect(() => {
    saveOrientationPreference(BUILDER_ORIENTATION_KEY, orientation);
  }, [orientation]);

  const flipBoard = useCallback(() => {
    setOrientation((current) => toggleOrientation(current));
  }, []);

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-muted lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-[1.2] flex-col p-3 sm:p-4 lg:flex-1">
        <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={builder.name}
              onChange={(event) => builder.setName(event.target.value)}
              maxLength={REPERTOIRE_NAME_MAX_LENGTH}
              className="w-full max-w-md truncate border-b border-transparent bg-transparent text-lg font-semibold text-foreground focus:border-accent focus:outline-none sm:text-xl"
              aria-label="Repertoire name"
            />
            <p className="text-xs text-muted-foreground sm:text-sm">
              Play moves on the board, register complete lines, branch variations
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <FlipBoardButton orientation={orientation} onFlip={flipBoard} />
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={!builder.canSave || builder.isSaving}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
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

      <aside className="flex min-h-0 w-full min-w-0 flex-col gap-3 border-t border-border bg-surface p-4 lg:w-[min(100%,24rem)] lg:max-w-md lg:border-l lg:border-t-0">
        <PgnPathBar
          path={builder.currentPath}
          currentNodeId={builder.currentNodeId}
          onSelect={builder.goToNode}
        />

        <div className="rounded-lg bg-background p-3 ring-1 ring-border">
          <p className="text-xs font-medium text-muted-foreground">Turn</p>
          <p className="text-sm font-semibold text-foreground">
            {builder.turnLabel} to move
          </p>
        </div>

        <button
          type="button"
          onClick={builder.registerCurrentLine}
          disabled={!builder.canRegister}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Register line
        </button>

        {builder.registerMessage ? (
          <p
            className={`text-sm ${
              builder.registerMessage === "Line registered."
                ? "text-accent"
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
            className="flex-1 rounded-md bg-surface-muted px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-surface-muted disabled:opacity-40"
          >
            Undo move
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Registered lines ({builder.registeredLines.length})
          </p>
          {builder.registeredLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Register at least one complete line before saving.
            </p>
          ) : (
            <ul className="space-y-2">
              {builder.registeredLines.map((line, index) => (
                <li
                  key={line.leafId}
                  className="flex items-start gap-2 rounded-lg bg-background p-2 ring-1 ring-border"
                >
                  <button
                    type="button"
                    onClick={() => builder.goToNode(line.leafId)}
                    className="min-w-0 flex-1 text-left font-mono text-xs text-foreground hover:text-accent-foreground"
                  >
                    <span className="font-sans text-muted-foreground/80">
                      {index + 1}.{" "}
                    </span>
                    {line.label || "(empty)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => builder.removeRegisteredLine(line.leafId)}
                    className="shrink-0 text-xs text-red-600 hover:text-danger-foreground"
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
          <p className="text-sm text-danger">{builder.saveError}</p>
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
