"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { computeLineStats } from "@/lib/pgn";
import { getRepertoire } from "@/lib/repertoires";
import {
  countTrainableLines,
  extractTrainingLines,
  filterLinesForColor,
  type TrainingColor,
} from "@/lib/training";

import { TrainingColorPicker } from "./TrainingColorPicker";

interface TrainingSetupProps {
  repertoireId: string;
}

export function TrainingSetup({ repertoireId }: TrainingSetupProps) {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [userColor, setUserColor] = useState<TrainingColor>("white");
  const [repertoire, setRepertoire] = useState<ReturnType<typeof getRepertoire>>(
    null,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only
    setRepertoire(getRepertoire(repertoireId));
    setIsHydrated(true);
  }, [repertoireId]);

  if (!isHydrated) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!repertoire) {
    return (
      <div className="rounded-xl bg-white p-8 text-center ring-1 ring-zinc-200">
        <h2 className="text-xl font-semibold text-zinc-900">
          Repertoire not found
        </h2>
        <Link
          href="/training"
          className="mt-4 inline-block text-sm font-medium text-green-700"
        >
          Back to training
        </Link>
      </div>
    );
  }

  const allLines = extractTrainingLines(repertoire);
  const totalLines = allLines.length;
  const trainableLines = filterLinesForColor(allLines, userColor);
  const whiteCount = countTrainableLines(repertoire, "white");
  const blackCount = countTrainableLines(repertoire, "black");
  const hasRegisteredLines =
    repertoire.source === "imported" || repertoire.registeredLeafIds.length > 0;

  const aggregateStats = repertoire.games.reduce(
    (acc, game) => {
      const stats = computeLineStats(game);
      return {
        lineCount: acc.lineCount + stats.lineCount,
        maxDepth: Math.max(acc.maxDepth, stats.maxDepth),
      };
    },
    { lineCount: 0, maxDepth: 0 },
  );

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl bg-white p-6 ring-1 ring-zinc-200">
        <h2 className="text-2xl font-bold text-zinc-900">{repertoire.name}</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {totalLines} lines · max depth {aggregateStats.maxDepth}
        </p>

        {!hasRegisteredLines ? (
          <div className="mt-6 rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200">
            <p className="text-sm text-amber-900">
              This repertoire has no registered lines yet. Build and register
              lines before training.
            </p>
            <Link
              href={`/repertoires/${repertoire.id}/edit`}
              className="mt-3 inline-block text-sm font-semibold text-amber-800 underline"
            >
              Edit repertoire
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-zinc-700">
                Choose your color
              </p>
              <TrainingColorPicker value={userColor} onChange={setUserColor} />
            </div>

            <p className="mt-4 text-sm text-zinc-600">
              You&apos;ll be tested on{" "}
              <span className="font-semibold text-zinc-900">
                {trainableLines.length}
              </span>{" "}
              lines as {userColor} in random order.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {whiteCount} lines as White · {blackCount} lines as Black
            </p>

            <button
              type="button"
              disabled={trainableLines.length === 0}
              onClick={() =>
                router.push(
                  `/training/${repertoireId}/session?color=${userColor}`,
                )
              }
              className="mt-6 w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
            >
              Start training
            </button>
            {trainableLines.length === 0 ? (
              <p className="mt-2 text-center text-xs text-amber-700">
                No lines include moves for {userColor}.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
