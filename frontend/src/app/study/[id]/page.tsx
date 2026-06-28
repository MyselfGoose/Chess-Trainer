"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { Square } from "chess.js";

import { ChessBoard } from "@/components/chess/ChessBoard";
import {
  MoveNavigationBindings,
  MoveNavigationHints,
} from "@/components/chess/MoveNavigationBindings";
import { PromotionDialog } from "@/components/chess/PromotionDialog";
import { DuplicateForkModal } from "@/components/repertoires/DuplicateForkModal";
import { PgnStudyMovesPanel } from "@/components/pgn/PgnStudyMovesPanel";
import { PgnStudyToolsPanel } from "@/components/pgn/PgnStudyToolsPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PromotionPiece } from "@/lib/chess/types";
import { annotationsFromPgnNode } from "@/lib/chess/annotations";
import { findAlternativePaths } from "@/lib/pgn/transpositions";
import { findGaps } from "@/lib/repertoires/gaps";
import { useBoardAnnotationState } from "@/hooks/useBoardAnnotationState";
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
      className="shrink-0 rounded-md bg-surface px-3 py-1.5 text-sm font-medium text-foreground/90 ring-1 ring-border transition hover:bg-background"
    >
      Flip ({orientation === "white" ? "White" : "Black"} below)
    </button>
  );
}

function BoardFrame({ children }: { children: ReactNode }) {
  return (
    <div className="board-fit-container mx-auto w-full max-w-[min(100%,720px)]">
      <div className="board-fit-square rounded-sm p-1 shadow-lg ring-1 ring-border">
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
  const router = useRouter();
  const study = usePgnStudy(id);
  const boardAnnotations = useBoardAnnotationState();
  const boardNavRef = useRef<HTMLDivElement>(null);
  const [studyPromotion, setStudyPromotion] =
    useState<StudyPendingPromotion | null>(null);
  const [showFork, setShowFork] = useState(false);

  const {
    setOrientation: setStudyOrientation,
    orientation: studyOrientation,
  } = study;

  const flipBoard = useCallback(() => {
    setStudyOrientation(studyOrientation === "white" ? "black" : "white");
  }, [setStudyOrientation, studyOrientation]);

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

  const pgnAutoShapes = useMemo(
    () =>
      annotationsFromPgnNode(
        study.currentNode?.arrows,
        study.currentNode?.squares,
      ),
    [study.currentNode?.arrows, study.currentNode?.squares],
  );

  const transpositionLabels = useMemo(() => {
    if (!study.currentGame || !study.currentNodeId) {
      return [];
    }
    return findAlternativePaths(study.currentGame, study.currentNodeId);
  }, [study.currentGame, study.currentNodeId]);

  const preparationGaps = useMemo(() => {
    if (!study.repertoire) {
      return [];
    }
    return findGaps(study.repertoire);
  }, [study.repertoire]);

  const trainColor = study.turnLabel === "White" ? "white" : "black";
  const trainFromHereHref =
    study.currentNodeId && study.repertoire
      ? `/training/${study.repertoire.id}?anchor=${study.currentNodeId}&color=${trainColor}`
      : null;

  if (!study.isHydrated) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-surface-muted">
        <p className="text-sm text-muted-foreground">Loading study…</p>
      </div>
    );
  }

  if (!study.hasStudy || !study.repertoire || !study.currentGame || !study.lineStats) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center bg-surface-muted px-4">
        <EmptyState
          title="Repertoire not found"
          description="This repertoire may have been deleted or is invalid."
          actions={
            <Link
              href="/repertoires"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Back to library
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-muted lg:grid lg:grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)_minmax(16rem,22rem)]">
      {/* Left: navigation & tools */}
      <div className="order-2 hidden min-h-0 border-r border-border bg-surface lg:order-1 lg:block">
        <PgnStudyToolsPanel
          games={study.repertoire.games}
          selectedGameIndex={study.selectedGameIndex}
          currentGame={study.currentGame}
          currentNodeId={study.currentNodeId}
          currentPath={study.currentPath}
          lineStats={study.lineStats}
          repertoireName={study.repertoire.name}
          preparationGaps={preparationGaps}
          onSelectGame={study.selectGame}
          onSelectNode={study.goToNode}
          onNavigateToGap={(nodeId) => study.goToNode(nodeId)}
          onSelectSearchLine={(leafNodeId) => study.goToNode(leafNodeId)}
        />
      </div>

      {/* Mobile: collapsible tools */}
      <details className="order-2 border-b border-border bg-surface lg:hidden">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground/90">
          Search, gaps & game info
        </summary>
        <div className="max-h-[40dvh] overflow-y-auto border-t border-border/70">
          <PgnStudyToolsPanel
            games={study.repertoire.games}
            selectedGameIndex={study.selectedGameIndex}
            currentGame={study.currentGame}
            currentNodeId={study.currentNodeId}
            currentPath={study.currentPath}
            lineStats={study.lineStats}
            repertoireName={study.repertoire.name}
            preparationGaps={preparationGaps}
            onSelectGame={study.selectGame}
            onSelectNode={study.goToNode}
            onNavigateToGap={(nodeId) => study.goToNode(nodeId)}
            onSelectSearchLine={(leafNodeId) => study.goToNode(leafNodeId)}
          />
        </div>
      </details>

      {/* Center: board */}
      <section className="order-1 flex min-h-0 min-w-0 flex-col p-3 sm:p-4 lg:order-2">
        <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 lg:hidden">
            <h1 className="truncate text-lg font-semibold text-foreground">
              {study.repertoire.name}
            </h1>
          </div>
          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
            <FlipBoardButton orientation={study.orientation} onFlip={flipBoard} />
            {study.repertoire.source === "imported" ? (
              <button
                type="button"
                onClick={() => setShowFork(true)}
                className="rounded-md bg-surface px-3 py-1.5 text-sm font-medium text-foreground/90 ring-1 ring-border transition hover:bg-background"
              >
                Duplicate &amp; Edit
              </button>
            ) : null}
            {trainFromHereHref ? (
              <Link
                href={trainFromHereHref}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Train from here
              </Link>
            ) : null}
          </div>
        </header>

        {transpositionLabels.length > 0 ? (
          <div className="mb-3 rounded-lg bg-info-muted px-3 py-2 text-sm text-info-foreground ring-1 ring-info/30">
            Also reached via: {transpositionLabels.join(" · ")}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <BoardFrame>
            <div ref={boardNavRef} className="h-full w-full">
              <ChessBoard
                mode="study"
                fen={study.boardFen}
                lastMove={study.boardLastMove}
                repertoireDests={study.repertoireDests}
                onRepertoireMove={handleStudyMove}
                orientation={study.orientation}
                annotations={{
                  shapes: boardAnnotations.shapes,
                  autoShapes: pgnAutoShapes,
                  onChange: boardAnnotations.annotations.onChange,
                  enabled: studyPromotion === null,
                }}
              />
            </div>
          </BoardFrame>
        </div>
        <MoveNavigationHints />
        <MoveNavigationBindings
          navigation={study.navigation}
          enabled={studyPromotion === null}
          wheelTargetRef={boardNavRef}
        />
      </section>

      {/* Right: comments & move choices */}
      <div className="order-3 flex min-h-0 border-t border-border bg-surface lg:h-full lg:max-h-none lg:border-l lg:border-t-0">
        <div className="flex h-[min(52dvh,100%)] min-h-0 w-full lg:h-full lg:max-h-none">
          <PgnStudyMovesPanel
            currentGame={study.currentGame}
            currentNodeId={study.currentNodeId}
            availableMoves={study.availableMoves}
            turnLabel={study.turnLabel}
            isAtLineEnd={study.isAtLineEnd}
            onSelectChoice={study.selectChoice}
            onBack={study.goBack}
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

      {showFork && study.repertoire ? (
        <DuplicateForkModal
          repertoire={study.repertoire}
          onComplete={(newId) => {
            setShowFork(false);
            router.push(`/repertoires/${newId}/edit`);
          }}
          onCancel={() => setShowFork(false)}
        />
      ) : null}
    </div>
  );
}
