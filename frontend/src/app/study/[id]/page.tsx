"use client";

import Link from "next/link";
import { use, useCallback, useRef, useState, type ReactNode } from "react";
import type { Square } from "chess.js";

import { ChessBoard } from "@/components/chess/ChessBoard";
import {
  MoveNavigationBindings,
  MoveNavigationHints,
} from "@/components/chess/MoveNavigationBindings";
import { PromotionDialog } from "@/components/chess/PromotionDialog";
import { PgnStudyPanel } from "@/components/pgn/PgnStudyPanel";
import type { PromotionPiece } from "@/lib/chess/types";
import { usePgnStudy } from "@/hooks/usePgnStudy";

interface StudyPendingPromotion {
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

export default function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const study = usePgnStudy(id);
  const boardNavRef = useRef<HTMLDivElement>(null);
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
      study.tryBoardMove(studyPromotion.from, studyPromotion.to, piece);
      setStudyPromotion(null);
    },
    [study, studyPromotion],
  );

  const cancelStudyPromotion = useCallback(() => {
    setStudyPromotion(null);
  }, []);

  const studyTurnColor = study.turnLabel === "White" ? "white" : "black";

  if (!study.isHydrated) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-zinc-100">
        <p className="text-sm text-zinc-500">Loading study…</p>
      </div>
    );
  }

  if (!study.hasStudy || !study.repertoire || !study.currentGame || !study.lineStats) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center bg-zinc-100 px-4">
        <h1 className="text-xl font-semibold text-zinc-900">
          Repertoire not found
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          This repertoire may have been deleted or is invalid.
        </p>
        <Link
          href="/repertoires"
          className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to repertoires
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-100 lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-[1.2] flex-col p-3 sm:p-4 lg:flex-1">
        <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-zinc-900 sm:text-xl">
              {study.repertoire.name}
            </h1>
            <p className="text-xs text-zinc-600 sm:text-sm">
              Study mode — choose your next repertoire move
            </p>
          </div>
          <FlipBoardButton orientation={orientation} onFlip={flipBoard} />
        </header>

        <BoardFrame>
          <div ref={boardNavRef} className="h-full w-full">
            <ChessBoard
              mode="study"
              fen={study.boardFen}
              lastMove={study.boardLastMove}
              repertoireDests={study.repertoireDests}
              onRepertoireMove={handleStudyMove}
              orientation={orientation}
            />
          </div>
        </BoardFrame>
        <MoveNavigationHints />
        <MoveNavigationBindings
          navigation={study.navigation}
          enabled={studyPromotion === null}
          wheelTargetRef={boardNavRef}
        />
      </section>

      <aside className="flex h-[42dvh] min-h-0 w-full min-w-0 shrink-0 flex-col border-t border-zinc-200 bg-white lg:h-full lg:w-[min(100%,26rem)] lg:max-w-md lg:flex-1 lg:shrink-0 lg:border-l lg:border-t-0">
        <PgnStudyPanel
          games={study.repertoire.games}
          selectedGameIndex={study.selectedGameIndex}
          currentGame={study.currentGame}
          currentNodeId={study.currentNodeId}
          currentPath={study.currentPath}
          availableMoves={study.availableMoves}
          turnLabel={study.turnLabel}
          isAtLineEnd={study.isAtLineEnd}
          lineStats={study.lineStats}
          repertoireName={study.repertoire.name}
          onSelectGame={study.selectGame}
          onSelectNode={study.goToNode}
          onSelectChoice={study.selectChoice}
          onBack={study.goBack}
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
