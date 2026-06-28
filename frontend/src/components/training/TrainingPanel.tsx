"use client";

import { useEffect } from "react";

import type { TrainingFeedback } from "@/lib/training";

interface TrainingPanelProps {
  lineProgressLabel: string;
  userMoveProgressLabel: string | null;
  currentLineLabel: string | null;
  isUserTurn: boolean;
  isAnimatingOpponent: boolean;
  feedback: TrainingFeedback | null;
  phase: "active" | "lineFeedback" | "summary";
  onAdvanceFeedback: () => void;
  onEndTraining: () => void;
  onQuit: () => void;
}

export function TrainingPanel({
  lineProgressLabel,
  userMoveProgressLabel,
  currentLineLabel,
  isUserTurn,
  isAnimatingOpponent,
  feedback,
  phase,
  onAdvanceFeedback,
  onEndTraining,
  onQuit,
}: TrainingPanelProps) {
  useEffect(() => {
    if (phase !== "lineFeedback" || !feedback) {
      return;
    }
    const delay = feedback.comment ? 3000 : 2000;
    const timer = setTimeout(onAdvanceFeedback, delay);
    return () => clearTimeout(timer);
  }, [feedback, onAdvanceFeedback, phase]);

  const progress =
    lineProgressLabel && lineProgressLabel.includes(" of ")
      ? (() => {
          const match = /Line (\d+) of (\d+)/.exec(lineProgressLabel);
          if (!match) {
            return 0;
          }
          const current = Number(match[1]);
          const total = Number(match[2]);
          return total > 0 ? (current / total) * 100 : 0;
        })()
      : 0;

  return (
    <aside className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Training</h2>
        <div className="flex items-center gap-1">
          {phase !== "summary" ? (
            <button
              type="button"
              onClick={onEndTraining}
              className="min-h-11 rounded-md px-2 py-1 text-xs font-medium text-warning-foreground hover:bg-warning-muted"
            >
              End training
            </button>
          ) : null}
          <button
            type="button"
            onClick={onQuit}
            className="min-h-11 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-muted"
          >
            Quit
          </button>
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>{lineProgressLabel}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {currentLineLabel ? (
        <details className="rounded-lg bg-background ring-1 ring-border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-foreground/90">
            Current line
          </summary>
          <p className="border-t border-border px-3 py-2 font-mono text-xs text-foreground/90">
            {currentLineLabel}
          </p>
        </details>
      ) : null}

      <div className="rounded-lg bg-background p-3 ring-1 ring-border">
        {phase === "lineFeedback" && feedback ? (
          <div role="alert">
            {feedback.passed ? (
              <p className="text-sm font-medium text-accent">
                {feedback.message}
              </p>
            ) : feedback.playedSan && feedback.expectedSan ? (
              <div className="rounded-md bg-danger-muted px-3 py-2 ring-1 ring-danger/30">
                <p className="text-sm font-semibold text-danger-foreground">
                  You played {feedback.playedSan}, expected {feedback.expectedSan}
                </p>
              </div>
            ) : (
              <p className="text-sm font-medium text-danger">
                {feedback.message}
              </p>
            )}
            {feedback.comment ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
                {feedback.comment}
              </p>
            ) : null}
          </div>
        ) : isAnimatingOpponent ? (
          <p className="text-sm text-muted-foreground">Opponent playing…</p>
        ) : isUserTurn ? (
          <>
            <p className="text-sm font-semibold text-foreground">Your turn</p>
            {userMoveProgressLabel ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {userMoveProgressLabel}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Preparing next position…</p>
        )}
      </div>

      {phase === "lineFeedback" && feedback ? (
        <button
          type="button"
          onClick={onAdvanceFeedback}
          className="min-h-11 w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-white"
        >
          {feedback.comment ? "Skip" : "Continue"}
        </button>
      ) : phase === "active" ? (
        <button
          type="button"
          onClick={onEndTraining}
          className="min-h-11 w-full rounded-lg bg-warning-muted px-4 py-2 text-sm font-semibold text-warning-foreground ring-1 ring-warning/30 transition hover:bg-warning-muted"
        >
          End training
        </button>
      ) : null}

      <p className="mt-auto text-xs text-muted-foreground">
        Wrong moves end the line immediately unless you are in test mode.
      </p>
    </aside>
  );
}
