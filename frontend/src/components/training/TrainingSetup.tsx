"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { computeLineStats } from "@/lib/pgn";
import { getRepertoire } from "@/lib/repertoires";
import {
  aggregateLineStats,
  applySessionLineLimit,
  createDefaultTrainingConfig,
  encodeTrainingConfig,
  extractTrainingLines,
  filterLinesForColor,
  filterLinesFromAnchorForGame,
  findWeakLines,
  getTrainingHistory,
  getMasteryForRepertoire,
  type TrainingColor,
  type TrainingMode,
  type OpponentPolicy,
} from "@/lib/training";
import {
  isTrainingSoundEnabled,
  setTrainingSoundEnabled,
} from "@/lib/training/sounds";

import { CoverageMap } from "./CoverageMap";
import { TrainingColorPicker } from "./TrainingColorPicker";

const PAGE_SIZE = 50;
const SESSION_SIZES = [10, 20, 50, 0] as const;

interface TrainingSetupProps {
  repertoireId: string;
}

export function TrainingSetup({ repertoireId }: TrainingSetupProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const anchorParam = searchParams.get("anchor");
  const colorParam = searchParams.get("color");

  const [isHydrated, setIsHydrated] = useState(false);
  const [userColor, setUserColor] = useState<TrainingColor>(
    colorParam === "black" ? "black" : "white",
  );
  const [mode, setMode] = useState<TrainingMode>("drill");
  const [maxLines, setMaxLines] = useState<number>(0);
  const [showComments, setShowComments] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [opponentPolicy, setOpponentPolicy] = useState<OpponentPolicy>("mainline");
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [linesExpanded, setLinesExpanded] = useState(false);
  const [repertoire, setRepertoire] = useState<ReturnType<typeof getRepertoire>>(
    null,
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- client-only localStorage init */
    setRepertoire(getRepertoire(repertoireId));
    setSoundEnabled(isTrainingSoundEnabled());
    setIsHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [repertoireId]);

  const allLines = useMemo(
    () => (repertoire ? extractTrainingLines(repertoire) : []),
    [repertoire],
  );

  const colorFilteredLines = useMemo(
    () => filterLinesForColor(allLines, userColor),
    [allLines, userColor],
  );

  const anchorFilteredLines = useMemo(() => {
    if (!repertoire || !anchorParam) {
      return colorFilteredLines;
    }
    return filterLinesFromAnchorForGame(
      colorFilteredLines,
      repertoire.games,
      anchorParam,
    );
  }, [anchorParam, colorFilteredLines, repertoire]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset selection when filters change */
    setSelectedLineIds(new Set(anchorFilteredLines.map((line) => line.id)));
    setPage(0);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [anchorFilteredLines, userColor]);

  const selectedLines = anchorFilteredLines.filter((line) =>
    selectedLineIds.has(line.id),
  );

  const pagedLines = anchorFilteredLines.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );
  const totalPages = Math.ceil(anchorFilteredLines.length / PAGE_SIZE);

  const weakLineIds = useMemo(() => {
    if (!repertoire) {
      return new Set<string>();
    }
    const stats = aggregateLineStats(
      repertoire.id,
      getTrainingHistory(),
      getMasteryForRepertoire(repertoire.id),
    );
    return new Set(findWeakLines(stats).map((entry) => entry.lineId));
  }, [repertoire]);

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

  const totalLines = allLines.length;
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

  const startTraining = () => {
    if (selectedLines.length === 0) {
      return;
    }
    setTrainingSoundEnabled(soundEnabled);
    const config = {
      ...createDefaultTrainingConfig(repertoireId, userColor),
      mode,
      lineIds: selectedLines.map((line) => line.id),
      maxLines,
      anchorLeafNodeId: anchorParam ?? undefined,
      showCommentsAfterLine: showComments || mode === "learn",
      soundEnabled,
      opponentPolicy,
    };
    router.push(
      `/training/${repertoireId}/session?config=${encodeTrainingConfig(config)}`,
    );
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl bg-white p-6 ring-1 ring-zinc-200">
        <h2 className="text-2xl font-bold text-zinc-900">{repertoire.name}</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {totalLines} lines · max depth {aggregateStats.maxDepth}
        </p>

        {anchorParam ? (
          <p className="mt-2 text-sm text-green-700">
            {anchorFilteredLines.length} lines from this position
          </p>
        ) : null}

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
              <p className="mb-3 text-sm font-medium text-zinc-700">Your color</p>
              <TrainingColorPicker value={userColor} onChange={setUserColor} />
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-zinc-700">Mode</p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["learn", "Learn — hints & comments"],
                    ["drill", "Drill — standard"],
                    ["test", "Test — no fail hints"],
                    ["survival", "Survival — one mistake ends"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={`rounded-lg px-3 py-2 text-left text-xs font-medium ring-1 ${
                      mode === value
                        ? "bg-green-50 text-green-800 ring-green-300"
                        : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-zinc-700">
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
                        ? "bg-green-700 text-white ring-green-700"
                        : "bg-white text-zinc-700 ring-zinc-200"
                    }`}
                  >
                    {size === 0 ? "All" : size}
                  </button>
                ))}
              </div>
            </div>

            <details
              className="mt-6"
              open={linesExpanded}
              onToggle={(event) =>
                setLinesExpanded((event.target as HTMLDetailsElement).open)
              }
            >
              <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                Lines to train ({selectedLineIds.size} selected)
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLineIds(
                      new Set(anchorFilteredLines.map((line) => line.id)),
                    )
                  }
                  className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLineIds(new Set())}
                  className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={weakLineIds.size === 0}
                  onClick={() => setSelectedLineIds(new Set(weakLineIds))}
                  className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 disabled:opacity-40"
                >
                  Failed / weak only
                </button>
              </div>
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                {pagedLines.map((line) => (
                  <li key={line.id}>
                    <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md px-2 py-2 hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        checked={selectedLineIds.has(line.id)}
                        onChange={(event) => {
                          setSelectedLineIds((current) => {
                            const next = new Set(current);
                            if (event.target.checked) {
                              next.add(line.id);
                            } else {
                              next.delete(line.id);
                            }
                            return next;
                          });
                        }}
                        className="mt-1"
                      />
                      <span className="font-mono text-xs text-zinc-700">
                        {line.label}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {totalPages > 1 ? (
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((current) => current - 1)}
                    className="disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span>
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((current) => current + 1)}
                    className="disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </details>

            <CoverageMap lines={anchorFilteredLines} repertoireId={repertoireId} />

            <div className="mt-6 space-y-2">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={showComments}
                  onChange={(event) => setShowComments(event.target.checked)}
                />
                Show comment after each line
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(event) => setSoundEnabled(event.target.checked)}
                />
                Sound effects
              </label>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-zinc-700">
                Opponent branches
              </p>
              <select
                value={opponentPolicy}
                onChange={(event) =>
                  setOpponentPolicy(event.target.value as OpponentPolicy)
                }
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="mainline">Main line first</option>
                <option value="random">Random</option>
                <option value="weighted">Prefer main over variations</option>
              </select>
            </div>

            <button
              type="button"
              disabled={selectedLines.length === 0}
              onClick={startTraining}
              className="mt-6 w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
            >
              Start training ({applySessionLineLimit(selectedLines, maxLines, false).length}{" "}
              lines)
            </button>
            {selectedLines.length === 0 ? (
              <p className="mt-2 text-center text-xs text-amber-700">
                Select at least one line to start.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
