"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { computeLineStats } from "@/lib/pgn";
import { getRepertoire } from "@/lib/repertoires";
import {
  aggregateLineStats,
  applySessionLineLimit,
  countLinesAfterPlyRange,
  createDefaultTrainingConfig,
  decodeTrainingConfig,
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
  filterLinesByChapterIds,
  sortedChapters,
} from "@/lib/repertoires";
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
  const chapterParam = searchParams.get("chapter");
  const linesParam = searchParams.get("lines");
  const weakParam = searchParams.get("weak");
  const drillParam = searchParams.get("drill");
  const configParam = searchParams.get("config");

  const [isHydrated, setIsHydrated] = useState(false);
  const [userColor, setUserColor] = useState<TrainingColor>(
    colorParam === "black" ? "black" : "white",
  );
  const [mode, setMode] = useState<TrainingMode>("drill");
  const [maxLines, setMaxLines] = useState<number>(0);
  const [showComments, setShowComments] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [opponentPolicy, setOpponentPolicy] = useState<OpponentPolicy>("mainline");
  const [plyRangeEnabled, setPlyRangeEnabled] = useState(false);
  const [plyFrom, setPlyFrom] = useState(1);
  const [plyTo, setPlyTo] = useState(12);
  const [drillFromFailure, setDrillFromFailure] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(
    new Set(),
  );
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

  const chapterFilteredLines = useMemo(() => {
    if (!repertoire) {
      return anchorFilteredLines;
    }
    const chapterIds = [...selectedChapterIds];
    return filterLinesByChapterIds(repertoire, anchorFilteredLines, chapterIds);
  }, [anchorFilteredLines, repertoire, selectedChapterIds]);

  const chapters = useMemo(
    () => (repertoire ? sortedChapters(repertoire.meta) : []),
    [repertoire],
  );

  useEffect(() => {
    if (!repertoire || !chapterParam) {
      return;
    }
    if (repertoire.meta.chapters.some((chapter) => chapter.id === chapterParam)) {
      /* eslint-disable react-hooks/set-state-in-effect -- URL preselect */
      setSelectedChapterIds(new Set([chapterParam]));
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [chapterParam, repertoire]);

  const prepLineIds = useMemo(() => {
    if (!linesParam) {
      return null;
    }
    const ids = linesParam
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    return ids.length > 0 ? new Set(ids) : null;
  }, [linesParam]);

  const weakLineIdsFromUrl = useMemo(() => {
    if (!weakParam) {
      return null;
    }
    const ids = weakParam
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    return ids.length > 0 ? new Set(ids) : null;
  }, [weakParam]);

  useEffect(() => {
    if (!configParam) {
      return;
    }
    const decoded = decodeTrainingConfig(configParam);
    if (!decoded || decoded.repertoireId !== repertoireId) {
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect -- URL prefill */
    if (decoded.drillFromFailure) {
      setDrillFromFailure(true);
    }
    if (decoded.plyRange) {
      setPlyRangeEnabled(true);
      setPlyFrom(decoded.plyRange.from + 1);
      setPlyTo(decoded.plyRange.to + 1);
    }
  }, [configParam, repertoireId]);

  useEffect(() => {
    if (drillParam === "failure") {
      /* eslint-disable react-hooks/set-state-in-effect -- URL prefill */
      setDrillFromFailure(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [drillParam]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset selection when filters change */
    const urlLineIds = prepLineIds ?? weakLineIdsFromUrl;
    if (urlLineIds) {
      const intersected = chapterFilteredLines.filter((line) =>
        urlLineIds.has(line.id),
      );
      setSelectedLineIds(new Set(intersected.map((line) => line.id)));
      setLinesExpanded(true);
    } else {
      setSelectedLineIds(new Set(chapterFilteredLines.map((line) => line.id)));
    }
    setPage(0);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [chapterFilteredLines, prepLineIds, userColor, weakLineIdsFromUrl]);

  const selectedLines = chapterFilteredLines.filter((line) =>
    selectedLineIds.has(line.id),
  );

  const maxLineDepth = useMemo(() => {
    if (selectedLines.length === 0) {
      return chapterFilteredLines.reduce(
        (max, line) => Math.max(max, line.moves.length),
        0,
      );
    }
    return selectedLines.reduce(
      (max, line) => Math.max(max, line.moves.length),
      0,
    );
  }, [chapterFilteredLines, selectedLines]);

  const plyRangeError = useMemo(() => {
    if (!plyRangeEnabled) {
      return null;
    }
    if (!Number.isInteger(plyFrom) || !Number.isInteger(plyTo)) {
      return "Ply range must be whole numbers.";
    }
    if (plyFrom < 1 || plyTo < 1) {
      return "Ply numbers start at 1.";
    }
    if (plyFrom > plyTo) {
      return "From ply must be less than or equal to to ply.";
    }
    if (maxLineDepth > 0 && plyFrom > maxLineDepth) {
      return `From ply exceeds max depth (${maxLineDepth}).`;
    }
    return null;
  }, [maxLineDepth, plyFrom, plyRangeEnabled, plyTo]);

  const plyRangePreview = useMemo(() => {
    if (!plyRangeEnabled || plyRangeError || selectedLines.length === 0) {
      return null;
    }
    const range = { from: plyFrom - 1, to: plyTo - 1 };
    const validCount = countLinesAfterPlyRange(selectedLines, range, userColor);
    const dropped = selectedLines.length - validCount;
    return { validCount, dropped };
  }, [plyFrom, plyRangeEnabled, plyRangeError, plyTo, selectedLines, userColor]);

  const pagedLines = chapterFilteredLines.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );
  const totalPages = Math.ceil(chapterFilteredLines.length / PAGE_SIZE);

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
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!repertoire) {
    return (
      <div className="rounded-xl bg-surface p-8 text-center ring-1 ring-border">
        <h2 className="text-xl font-semibold text-foreground">
          Repertoire not found
        </h2>
        <Link
          href="/training"
          className="mt-4 inline-block text-sm font-medium text-accent"
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
    if (selectedLines.length === 0 || plyRangeError) {
      return;
    }
    setTrainingSoundEnabled(soundEnabled);
    const config = {
      ...createDefaultTrainingConfig(repertoireId, userColor),
      mode,
      lineIds: selectedLines.map((line) => line.id),
      maxLines,
      anchorLeafNodeId: anchorParam ?? undefined,
      chapterIds:
        selectedChapterIds.size > 0
          ? [...selectedChapterIds]
          : undefined,
      showCommentsAfterLine: showComments || mode === "learn",
      soundEnabled,
      opponentPolicy,
      drillFromFailure: drillFromFailure ? true : undefined,
      plyRange: plyRangeEnabled
        ? { from: plyFrom - 1, to: plyTo - 1 }
        : undefined,
    };
    router.push(
      `/training/${repertoireId}/session?config=${encodeTrainingConfig(config)}`,
    );
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl bg-surface p-6 ring-1 ring-border">
        <h2 className="text-2xl font-bold text-foreground">{repertoire.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalLines} lines · max depth {aggregateStats.maxDepth}
        </p>

        {anchorParam ? (
          <p className="mt-2 text-sm text-accent">
            {chapterFilteredLines.length} lines from this position
          </p>
        ) : null}

        {prepLineIds ? (
          <p className="mt-2 rounded-lg bg-accent-muted px-3 py-2 text-sm text-accent-foreground">
            Prep session — {selectedLineIds.size} line
            {selectedLineIds.size === 1 ? "" : "s"} preselected
          </p>
        ) : null}

        {weakLineIdsFromUrl ? (
          <p className="mt-2 rounded-lg bg-warning-muted px-3 py-2 text-sm text-warning-foreground">
            Weak lines — {selectedLineIds.size} line
            {selectedLineIds.size === 1 ? "" : "s"} preselected
          </p>
        ) : null}

        {drillFromFailure ? (
          <p className="mt-2 rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">
            Failure-point drill — sessions start one move before your typical
            mistake
          </p>
        ) : null}

        {chapters.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-foreground/90">
              Chapters ({chapterFilteredLines.length} lines
              {selectedChapterIds.size > 0 ? " in filter" : ""})
            </p>
            <div className="flex flex-wrap gap-2">
              {chapters.map((chapter) => (
                <label
                  key={chapter.id}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-surface-muted px-2 py-1 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selectedChapterIds.has(chapter.id)}
                    onChange={(event) => {
                      setSelectedChapterIds((current) => {
                        const next = new Set(current);
                        if (event.target.checked) {
                          next.add(chapter.id);
                        } else {
                          next.delete(chapter.id);
                        }
                        return next;
                      });
                    }}
                  />
                  {chapter.name} ({chapter.lineIds.length})
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Leave all unchecked to train every line for your color.
            </p>
          </div>
        ) : null}

        {!hasRegisteredLines ? (
          <div className="mt-6 rounded-lg bg-warning-muted p-4 ring-1 ring-warning/30">
            <p className="text-sm text-warning-foreground">
              This repertoire has no registered lines yet. Build and register
              lines before training.
            </p>
            <Link
              href={`/repertoires/${repertoire.id}/edit`}
              className="mt-3 inline-block text-sm font-semibold text-warning-foreground underline"
            >
              Edit repertoire
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-foreground/90">Your color</p>
              <TrainingColorPicker value={userColor} onChange={setUserColor} />
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-foreground/90">Mode</p>
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
                        ? "bg-accent-muted text-accent-foreground ring-accent/40"
                        : "bg-surface text-foreground/90 ring-border hover:bg-background"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
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

            <details
              className="mt-6"
              open={linesExpanded}
              onToggle={(event) =>
                setLinesExpanded((event.target as HTMLDetailsElement).open)
              }
            >
              <summary className="cursor-pointer text-sm font-medium text-foreground/90">
                Lines to train ({selectedLineIds.size} selected)
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLineIds(
                      new Set(chapterFilteredLines.map((line) => line.id)),
                    )
                  }
                  className="rounded-md bg-surface-muted px-2 py-1 text-xs font-medium text-foreground/90"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLineIds(new Set())}
                  className="rounded-md bg-surface-muted px-2 py-1 text-xs font-medium text-foreground/90"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={weakLineIds.size === 0}
                  onClick={() => setSelectedLineIds(new Set(weakLineIds))}
                  className="rounded-md bg-surface-muted px-2 py-1 text-xs font-medium text-foreground/90 disabled:opacity-40"
                >
                  Failed / weak only
                </button>
              </div>
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                {pagedLines.map((line) => (
                  <li key={line.id}>
                    <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md px-2 py-2 hover:bg-background">
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
                      <span className="font-mono text-xs text-foreground/90">
                        {line.label}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {totalPages > 1 ? (
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
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

            <CoverageMap lines={chapterFilteredLines} repertoireId={repertoireId} />

            <div className="mt-6 space-y-2">
              <label className="flex items-center gap-2 text-sm text-foreground/90">
                <input
                  type="checkbox"
                  checked={showComments}
                  onChange={(event) => setShowComments(event.target.checked)}
                />
                Show comment after each line
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

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-foreground/90">
                Opponent branches
              </p>
              <select
                value={opponentPolicy}
                onChange={(event) =>
                  setOpponentPolicy(event.target.value as OpponentPolicy)
                }
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              >
                <option value="mainline">Main line first</option>
                <option value="random">Random</option>
                <option value="weighted">Prefer main over variations</option>
              </select>
            </div>

            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-foreground/90">
                Advanced
              </summary>
              <div className="mt-4 space-y-4">
                <label className="flex items-center gap-2 text-sm text-foreground/90">
                  <input
                    type="checkbox"
                    checked={drillFromFailure}
                    onChange={(event) => setDrillFromFailure(event.target.checked)}
                  />
                  Drill from last failure point
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground/90">
                  <input
                    type="checkbox"
                    checked={plyRangeEnabled}
                    onChange={(event) => setPlyRangeEnabled(event.target.checked)}
                  />
                  Limit to ply range
                </label>
                {plyRangeEnabled ? (
                  <div className="space-y-2">
                    <div className="flex gap-3">
                      <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                        From ply
                        <input
                          type="number"
                          min={1}
                          max={maxLineDepth || undefined}
                          value={plyFrom}
                          onChange={(event) =>
                            setPlyFrom(Number.parseInt(event.target.value, 10) || 1)
                          }
                          className="rounded-md border border-border px-2 py-1.5 text-sm text-foreground"
                        />
                      </label>
                      <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                        To ply
                        <input
                          type="number"
                          min={1}
                          max={maxLineDepth || undefined}
                          value={plyTo}
                          onChange={(event) =>
                            setPlyTo(Number.parseInt(event.target.value, 10) || 1)
                          }
                          className="rounded-md border border-border px-2 py-1.5 text-sm text-foreground"
                        />
                      </label>
                    </div>
                    {maxLineDepth > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Max depth in selection: {maxLineDepth} plies
                      </p>
                    ) : null}
                    {plyRangeError ? (
                      <p className="text-xs text-danger">{plyRangeError}</p>
                    ) : plyRangePreview ? (
                      <p className="text-xs text-muted-foreground">
                        {plyRangePreview.validCount} line
                        {plyRangePreview.validCount === 1 ? "" : "s"} after slice
                        {plyRangePreview.dropped > 0
                          ? ` · ${plyRangePreview.dropped} empty after slice`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </details>

            <button
              type="button"
              disabled={
                selectedLines.length === 0 ||
                Boolean(plyRangeError) ||
                (plyRangeEnabled &&
                  plyRangePreview !== null &&
                  plyRangePreview.validCount === 0)
              }
              onClick={startTraining}
              className="mt-6 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
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
