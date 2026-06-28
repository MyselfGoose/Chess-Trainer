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
        <h2 className="text-lg font-semibold text-zinc-900">Training</h2>
        <div className="flex items-center gap-1">
          {phase !== "summary" ? (
            <button
              type="button"
              onClick={onEndTraining}
              className="min-h-11 rounded-md px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50"
            >
              End training
            </button>
          ) : null}
          <button
            type="button"
            onClick={onQuit}
            className="min-h-11 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100"
          >
            Quit
          </button>
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-zinc-500">
          <span>{lineProgressLabel}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-green-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {currentLineLabel ? (
        <details className="rounded-lg bg-zinc-50 ring-1 ring-zinc-200">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-700">
            Current line
          </summary>
          <p className="border-t border-zinc-200 px-3 py-2 font-mono text-xs text-zinc-700">
            {currentLineLabel}
          </p>
        </details>
      ) : null}

      <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
        {phase === "lineFeedback" && feedback ? (
          <div role="alert">
            {feedback.passed ? (
              <p className="text-sm font-medium text-green-700">
                {feedback.message}
              </p>
            ) : feedback.playedSan && feedback.expectedSan ? (
              <div className="rounded-md bg-red-50 px-3 py-2 ring-1 ring-red-200">
                <p className="text-sm font-semibold text-red-800">
                  You played {feedback.playedSan}, expected {feedback.expectedSan}
                </p>
              </div>
            ) : (
              <p className="text-sm font-medium text-red-700">
                {feedback.message}
              </p>
            )}
            {feedback.comment ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-700">
                {feedback.comment}
              </p>
            ) : null}
          </div>
        ) : isAnimatingOpponent ? (
          <p className="text-sm text-zinc-600">Opponent playing…</p>
        ) : isUserTurn ? (
          <>
            <p className="text-sm font-semibold text-zinc-900">Your turn</p>
            {userMoveProgressLabel ? (
              <p className="mt-1 text-xs text-zinc-500">
                {userMoveProgressLabel}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-zinc-600">Preparing next position…</p>
        )}
      </div>

      {phase === "lineFeedback" && feedback ? (
        <button
          type="button"
          onClick={onAdvanceFeedback}
          className="min-h-11 w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white"
        >
          {feedback.comment ? "Skip" : "Continue"}
        </button>
      ) : phase === "active" ? (
        <button
          type="button"
          onClick={onEndTraining}
          className="min-h-11 w-full rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-200"
        >
          End training
        </button>
      ) : null}

      <p className="mt-auto text-xs text-zinc-500">
        Wrong moves end the line immediately unless you are in test mode.
      </p>
    </aside>
  );
}
