"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Square } from "chess.js";

import { ChessBoard } from "@/components/chess/ChessBoard";
import {
  MoveNavigationBindings,
  MoveNavigationHints,
} from "@/components/chess/MoveNavigationBindings";
import { PromotionDialog } from "@/components/chess/PromotionDialog";
import { PgnLineStats } from "@/components/pgn/PgnLineStats";
import { PgnPathBar } from "@/components/pgn/PgnPathBar";
import { BuilderPositionNotes } from "@/components/repertoires/BuilderPositionNotes";
import { BulkRegisterModal } from "@/components/repertoires/BulkRegisterModal";
import { CopyLineModal } from "@/components/repertoires/CopyLineModal";
import { DeleteSubtreeModal } from "@/components/repertoires/DeleteSubtreeModal";
import { SetPositionModal } from "@/components/repertoires/SetPositionModal";
import type { PromotionPiece } from "@/lib/chess/types";
import { annotationsFromPgnNode } from "@/lib/chess/annotations";
import { gameHasMoves } from "@/lib/repertoires/setStartFen";
import {
  BUILDER_ORIENTATION_KEY,
  loadOrientationPreference,
  saveOrientationPreference,
  toggleOrientation,
} from "@/lib/chess/orientationPreference";
import { useBoardAnnotationState } from "@/hooks/useBoardAnnotationState";
import { useRepertoireBuilder } from "@/hooks/useRepertoireBuilder";
import type { PruneImpact } from "@/lib/repertoires";
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
  const [deleteImpact, setDeleteImpact] = useState<PruneImpact | null>(null);
  const [showBulkRegister, setShowBulkRegister] = useState(false);
  const [showSetPosition, setShowSetPosition] = useState(false);
  const [showCopyLine, setShowCopyLine] = useState(false);

  useEffect(() => {
    saveOrientationPreference(BUILDER_ORIENTATION_KEY, orientation);
  }, [orientation]);

  const pgnAutoShapes = useMemo(
    () =>
      annotationsFromPgnNode(
        builder.currentNode?.arrows,
        builder.currentNode?.squares,
      ),
    [builder.currentNode?.arrows, builder.currentNode?.squares],
  );

  const hasUnsavedAnnotations = builder.hasUnsavedAnnotations(
    boardAnnotations.shapes,
  );

  const persistAnnotationsIfNeeded = useCallback(() => {
    if (builder.hasUnsavedAnnotations(boardAnnotations.shapes)) {
      builder.saveAnnotationsToNode(boardAnnotations.shapes);
      boardAnnotations.clearAnnotations();
    }
  }, [boardAnnotations, builder]);

  const navigateWithAnnotationSave = useCallback(
    (navigate: () => void) => {
      persistAnnotationsIfNeeded();
      navigate();
      boardAnnotations.clearAnnotations();
    },
    [boardAnnotations, persistAnnotationsIfNeeded],
  );

  const wrappedGoToNode = useCallback(
    (nodeId: string) => {
      navigateWithAnnotationSave(() => builder.goToNode(nodeId));
    },
    [builder, navigateWithAnnotationSave],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const mod = event.metaKey || event.ctrlKey;
      if (!mod) {
        return;
      }

      if (event.key === "z" && event.shiftKey) {
        event.preventDefault();
        builder.redoEdit();
        return;
      }

      if (event.key === "z") {
        event.preventDefault();
        builder.undoEdit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [builder]);

  const flipBoard = useCallback(() => {
    setOrientation((current) => toggleOrientation(current));
  }, []);

  const handleMove = useCallback(
    (from: Square, to: Square): boolean => {
      if (builder.needsPromotion(from, to)) {
        setPendingPromotion({ from, to });
        return false;
      }
      persistAnnotationsIfNeeded();
      boardAnnotations.clearAnnotations();
      return builder.attemptMove(from, to);
    },
    [boardAnnotations, builder, persistAnnotationsIfNeeded],
  );

  const completePromotion = useCallback(
    (piece: PromotionPiece) => {
      if (!pendingPromotion) {
        return;
      }
      persistAnnotationsIfNeeded();
      boardAnnotations.clearAnnotations();
      builder.completePromotion(
        pendingPromotion.from,
        pendingPromotion.to,
        piece,
      );
      setPendingPromotion(null);
    },
    [boardAnnotations, builder, pendingPromotion, persistAnnotationsIfNeeded],
  );

  const handleSaveClick = useCallback(() => {
    if (!builder.canSave) {
      return;
    }
    persistAnnotationsIfNeeded();
    const saved = builder.save();
    if (saved) {
      router.push("/repertoires");
    }
  }, [builder, persistAnnotationsIfNeeded, router]);

  const handleDeleteRequest = useCallback(() => {
    const impact = builder.getPruneImpact();
    if (impact) {
      setDeleteImpact(impact);
    }
  }, [builder]);

  const handleDeleteConfirm = useCallback(() => {
    builder.confirmDeleteFromHere();
    setDeleteImpact(null);
    boardAnnotations.clearAnnotations();
  }, [boardAnnotations, builder]);

  const handleCollapseEmpty = useCallback(() => {
    if (builder.emptyBranchCount === 0) {
      return;
    }
    const confirmed = window.confirm(
      `Remove ${builder.emptyBranchCount} empty branch${builder.emptyBranchCount === 1 ? "" : "es"} with no comments or annotations?`,
    );
    if (!confirmed) {
      return;
    }
    builder.collapseEmptyBranchesAction();
    boardAnnotations.clearAnnotations();
  }, [boardAnnotations, builder]);

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
            <button
              type="button"
              onClick={() => setShowSetPosition(true)}
              className="rounded-md bg-surface px-3 py-1.5 text-sm font-medium text-foreground/90 ring-1 ring-border transition hover:bg-background"
            >
              Set position
            </button>
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
                shapes: boardAnnotations.shapes,
                autoShapes: pgnAutoShapes,
                onChange: boardAnnotations.annotations.onChange,
                enabled: pendingPromotion === null,
              }}
            />
          </div>
        </BoardFrame>
        <MoveNavigationHints />
        <MoveNavigationBindings
          navigation={{
            ...builder.navigation,
            goBack: () => navigateWithAnnotationSave(builder.goBack),
            goForward: () => navigateWithAnnotationSave(builder.goForward),
            goToStart: () => navigateWithAnnotationSave(builder.goToStart),
            goToEnd: () => navigateWithAnnotationSave(builder.goToEnd),
          }}
          enabled={pendingPromotion === null}
          wheelTargetRef={boardNavRef}
        />
      </section>

      <aside className="flex min-h-0 w-full min-w-0 flex-col gap-3 border-t border-border bg-surface p-4 lg:w-[min(100%,24rem)] lg:max-w-md lg:border-l lg:border-t-0">
        <PgnPathBar
          path={builder.currentPath}
          currentNodeId={builder.currentNodeId}
          onSelect={wrappedGoToNode}
        />

        <BuilderPositionNotes
          currentNode={builder.currentNode}
          isAtRoot={builder.currentNodeId === builder.game.rootId}
          hasUnsavedAnnotations={hasUnsavedAnnotations}
          onSaveComment={builder.saveComment}
          onSaveAnnotations={() => {
            builder.saveAnnotationsToNode(boardAnnotations.shapes);
            boardAnnotations.clearAnnotations();
          }}
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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowBulkRegister(true)}
            className="min-h-10 flex-1 rounded-md bg-surface-muted px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-surface"
          >
            Bulk register
          </button>
          <button
            type="button"
            onClick={() => setShowCopyLine(true)}
            className="min-h-10 flex-1 rounded-md bg-surface-muted px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-surface"
          >
            Import line
          </button>
        </div>

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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={builder.undoMove}
            disabled={!builder.canUndo}
            className="min-h-11 flex-1 rounded-md bg-surface-muted px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-surface disabled:opacity-40"
          >
            Undo move
          </button>
          <button
            type="button"
            onClick={builder.undoEdit}
            disabled={!builder.canUndoEdit}
            className="min-h-11 flex-1 rounded-md bg-surface-muted px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-surface disabled:opacity-40"
            title="Undo edit (Ctrl+Z)"
          >
            Undo edit
          </button>
          <button
            type="button"
            onClick={builder.redoEdit}
            disabled={!builder.canRedoEdit}
            className="min-h-11 flex-1 rounded-md bg-surface-muted px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-surface disabled:opacity-40"
            title="Redo edit (Ctrl+Shift+Z)"
          >
            Redo
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDeleteRequest}
            disabled={!builder.canDeleteFromHere}
            className="min-h-11 flex-1 rounded-md bg-danger-muted px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger-muted/80 disabled:opacity-40"
          >
            Delete from here
          </button>
          <button
            type="button"
            onClick={handleCollapseEmpty}
            disabled={builder.emptyBranchCount === 0}
            className="min-h-11 flex-1 rounded-md bg-surface-muted px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-surface disabled:opacity-40"
          >
            Collapse empty ({builder.emptyBranchCount})
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
                    onClick={() => wrappedGoToNode(line.leafId)}
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

      {deleteImpact ? (
        <DeleteSubtreeModal
          impact={deleteImpact}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteImpact(null)}
        />
      ) : null}

      {showBulkRegister ? (
        <BulkRegisterModal
          maxDepth={builder.lineStats.maxDepth}
          currentMaxPly={builder.lineStats.maxDepth}
          registeredLeafIds={builder.registeredLeafIds}
          game={builder.game}
          onConfirm={(maxPly) => {
            builder.bulkRegisterAtDepth(maxPly);
            setShowBulkRegister(false);
          }}
          onCancel={() => setShowBulkRegister(false)}
        />
      ) : null}

      {showSetPosition ? (
        <SetPositionModal
          hasMoves={gameHasMoves(builder.game)}
          onConfirm={(fen, force) => {
            const result = builder.setStartPosition(fen, force);
            if (!result.ok) {
              return;
            }
            setShowSetPosition(false);
            boardAnnotations.clearAnnotations();
          }}
          onCancel={() => setShowSetPosition(false)}
        />
      ) : null}

      {showCopyLine ? (
        <CopyLineModal
          defaultTargetId={builder.repertoireId}
          defaultAttachNodeId={builder.currentNodeId}
          onGraftedInBuilder={(game, attachNodeId) => {
            builder.applyGraftedGame(game, attachNodeId);
          }}
          onComplete={() => setShowCopyLine(false)}
          onCancel={() => setShowCopyLine(false)}
        />
      ) : null}
    </div>
  );
}
