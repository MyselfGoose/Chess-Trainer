"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { TrainingColorPicker } from "@/components/training/TrainingColorPicker";
import { useRepertoires } from "@/hooks/useRepertoires";
import {
  countTrainableLines,
  createDefaultTrainingConfig,
  encodeTrainingConfig,
  type TrainingColor,
} from "@/lib/training";
import {
  isTrainingSoundEnabled,
  setTrainingSoundEnabled,
} from "@/lib/training/sounds";

const SESSION_SIZES = [10, 20, 50, 0] as const;

export function MixedTrainingSetup() {
  const router = useRouter();
  const { repertoires, isHydrated } = useRepertoires();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [userColor, setUserColor] = useState<TrainingColor>("white");
  const [maxLines, setMaxLines] = useState<number>(0);
  const [interleaved, setInterleaved] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(isTrainingSoundEnabled());

  const trainableRepertoires = useMemo(
    () =>
      repertoires.filter((repertoire) => {
        const canTrain =
          repertoire.source === "imported"
            ? repertoire.games.length > 0
            : repertoire.registeredLeafIds.length > 0;
        return canTrain && countTrainableLines(repertoire, userColor) > 0;
      }),
    [repertoires, userColor],
  );

  const selectedRepertoires = trainableRepertoires.filter((repertoire) =>
    selectedIds.has(repertoire.id),
  );

  const totalLineCount = selectedRepertoires.reduce(
    (sum, repertoire) => sum + countTrainableLines(repertoire, userColor),
    0,
  );
  const estimatedLines =
    maxLines === 0 ? totalLineCount : Math.min(maxLines, totalLineCount);

  const canStart = selectedRepertoires.length >= 2;

  const startMixedSession = () => {
    if (!canStart) {
      return;
    }
    const repertoireIds = selectedRepertoires.map((repertoire) => repertoire.id);
    const primaryId = repertoireIds[0]!;
    setTrainingSoundEnabled(soundEnabled);
    const config = {
      ...createDefaultTrainingConfig(primaryId, userColor),
      repertoireId: primaryId,
      repertoireIds,
      interleaved: interleaved ? undefined : false,
      maxLines,
      lineIds: [],
    };
    router.push(
      `/training/${primaryId}/session?config=${encodeTrainingConfig(config)}`,
    );
  };

  if (!isHydrated) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (trainableRepertoires.length < 2) {
    return (
      <div className="mx-auto max-w-lg rounded-xl bg-surface p-6 ring-1 ring-border">
        <h2 className="text-xl font-bold text-foreground">Mixed session</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You need at least two repertoires with trainable lines for your color.
        </p>
        <Link
          href="/training"
          className="mt-4 inline-block text-sm font-medium text-accent"
        >
          Back to training
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl bg-surface p-6 ring-1 ring-border">
        <h2 className="text-2xl font-bold text-foreground">Mixed session</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Train lines from multiple repertoires in one session — closer to
          tournament rhythm.
        </p>

        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-foreground/90">Your color</p>
          <TrainingColorPicker value={userColor} onChange={setUserColor} />
        </div>

        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-foreground/90">
            Repertoires ({selectedIds.size} selected)
          </p>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {trainableRepertoires.map((repertoire) => (
              <li key={repertoire.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-background">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(repertoire.id)}
                    onChange={(event) => {
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (event.target.checked) {
                          next.add(repertoire.id);
                        } else {
                          next.delete(repertoire.id);
                        }
                        return next;
                      });
                    }}
                  />
                  <span className="min-w-0 flex-1 text-sm text-foreground">
                    {repertoire.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {countTrainableLines(repertoire, userColor)} lines
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-foreground/90">
            Lines this session
          </p>
          <div className="flex flex-wrap gap-2">
            {SESSION_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setMaxLines(size)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ring-1 ${
                  maxLines === size
                    ? "bg-accent text-white ring-accent"
                    : "bg-surface text-foreground/90 ring-border"
                }`}
              >
                {size === 0 ? "All" : size}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="flex items-center gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              checked={interleaved}
              onChange={(event) => setInterleaved(event.target.checked)}
            />
            Interleave openings (spread lines across repertoires)
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
            />
            Sound effects
          </label>
        </div>

        <button
          type="button"
          disabled={!canStart}
          onClick={startMixedSession}
          className="mt-6 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          Start mixed session ({estimatedLines} lines)
        </button>

        {!canStart ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Select at least two repertoires.
          </p>
        ) : null}

        <Link
          href="/training"
          className="mt-4 block text-center text-sm font-medium text-muted-foreground"
        >
          Back to training
        </Link>
      </div>
    </div>
  );
}
