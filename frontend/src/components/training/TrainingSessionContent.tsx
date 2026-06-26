"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useCallback, useMemo, useState } from "react";
import type { Square } from "chess.js";

import { PromotionDialog } from "@/components/chess/PromotionDialog";
import { TrainingBoard } from "@/components/training/TrainingBoard";
import { TrainingPanel } from "@/components/training/TrainingPanel";
import { TrainingSummary } from "@/components/training/TrainingSummary";
import { useTrainingSession } from "@/hooks/useTrainingSession";
import type { PromotionPiece } from "@/lib/chess/types";
import { getRepertoire } from "@/lib/repertoires";
import {
  extractTrainingLines,
  filterLinesForColor,
  type TrainingColor,
  type TrainingLine,
} from "@/lib/training";

interface PendingPromotion {
  from: Square;
  to: Square;
}

function isValidColor(value: string | null): value is TrainingColor {
  return value === "white" || value === "black";
}

function parseLineSubset(
  repertoireId: string,
  userColor: TrainingColor,
  lineIdsParam: string | null,
): TrainingLine[] | undefined {
  if (!lineIdsParam) {
    return undefined;
  }
  const repertoire = getRepertoire(repertoireId);
  if (!repertoire) {
    return undefined;
  }
  const ids = new Set(lineIdsParam.split(",").filter(Boolean));
  return filterLinesForColor(extractTrainingLines(repertoire), userColor).filter(
    (line) => ids.has(line.id),
  );
}

export function TrainingSessionContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const colorParam = searchParams.get("color");
  const lineIdsParam = searchParams.get("lines");
  const userColor = isValidColor(colorParam) ? colorParam : null;

  const lineSubset = useMemo(() => {
    if (!userColor) {
      return undefined;
    }
    return parseLineSubset(id, userColor, lineIdsParam);
  }, [id, lineIdsParam, userColor]);

  const training = useTrainingSession({
    repertoireId: id,
    userColor,
    lineSubset,
  });

  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);

  const handleMove = useCallback(
    (from: Square, to: Square): boolean => {
      if (training.needsPromotion(from, to)) {
        setPendingPromotion({ from, to });
        return false;
      }
      return training.tryUserMoveOnBoard(from, to);
    },
    [training],
  );

  const completePromotion = useCallback(
    (piece: PromotionPiece) => {
      if (!pendingPromotion) {
        return;
      }
      training.completePromotion(
        pendingPromotion.from,
        pendingPromotion.to,
        piece,
      );
      setPendingPromotion(null);
    },
    [pendingPromotion, training],
  );

  const handleEndTraining = useCallback(() => {
    if (
      training.phase === "summary" ||
      !window.confirm(
        "End training now? You'll see your results for the lines completed so far.",
      )
    ) {
      return;
    }
    training.endTraining();
  }, [training]);

  const handleQuit = useCallback(() => {
    if (
      training.phase !== "summary" &&
      !window.confirm("Quit this training session?")
    ) {
      return;
    }
    router.push(`/training/${id}`);
  }, [id, router, training.phase]);

  if (!training.isHydrated) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-100">
        <p className="text-sm text-zinc-500">Loading training…</p>
      </div>
    );
  }

  if (!userColor) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-zinc-100 px-4">
        <p className="text-sm text-zinc-600">Choose a color to start training.</p>
        <Link
          href={`/training/${id}`}
          className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to setup
        </Link>
      </div>
    );
  }

  if (training.notFound) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-zinc-100 px-4">
        <h1 className="text-xl font-semibold text-zinc-900">
          Repertoire not found
        </h1>
        <Link href="/training" className="mt-4 text-sm font-medium text-green-700">
          Back to training
        </Link>
      </div>
    );
  }

  if (training.noLines) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-zinc-100 px-4">
        <h1 className="text-xl font-semibold text-zinc-900">
          No trainable lines
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          This repertoire has no lines for {userColor}.
        </p>
        <Link
          href={`/training/${id}`}
          className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to setup
        </Link>
      </div>
    );
  }

  if (training.phase === "summary" && training.summary) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-100 lg:flex-row">
        <section className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
          <TrainingBoard
            fen={training.boardFen}
            lastMove={training.boardLastMove}
            orientation={training.orientation}
            movableDests={new Map()}
            isUserTurn={false}
            onMove={() => false}
          />
        </section>
        <aside className="flex h-[50dvh] min-h-0 w-full shrink-0 flex-col border-t border-zinc-200 bg-white lg:h-full lg:w-[min(100%,26rem)] lg:border-l lg:border-t-0">
          <TrainingSummary summary={training.summary} repertoireId={id} />
        </aside>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-100 lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-[1.2] flex-col p-3 sm:p-4 lg:flex-1">
        <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-zinc-900">
              {training.repertoireName}
            </h1>
            <p className="text-xs text-zinc-600">{training.lineProgressLabel}</p>
          </div>
        </header>
        <TrainingBoard
          fen={training.boardFen}
          lastMove={training.boardLastMove}
          orientation={training.orientation}
          movableDests={training.movableDests}
          isUserTurn={training.isUserTurn}
          onMove={handleMove}
        />
      </section>

      <aside className="flex h-[42dvh] min-h-0 w-full min-w-0 shrink-0 flex-col border-t border-zinc-200 bg-white lg:h-full lg:w-[min(100%,26rem)] lg:max-w-md lg:border-l lg:border-t-0">
        <TrainingPanel
          lineProgressLabel={training.lineProgressLabel}
          userMoveProgressLabel={training.userMoveProgressLabel}
          currentLineLabel={training.currentLineLabel}
          isUserTurn={training.isUserTurn}
          isAnimatingOpponent={training.isAnimatingOpponent}
          feedback={training.feedback}
          phase={training.phase}
          onAdvanceFeedback={training.advanceFromFeedback}
          onEndTraining={handleEndTraining}
          onQuit={handleQuit}
        />
      </aside>

      {pendingPromotion ? (
        <PromotionDialog
          color={training.orientation}
          onSelect={completePromotion}
          onCancel={() => setPendingPromotion(null)}
        />
      ) : null}
    </div>
  );
}
