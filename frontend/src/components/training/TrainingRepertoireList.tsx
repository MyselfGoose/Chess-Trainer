"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { useRepertoires } from "@/hooks/useRepertoires";
import { computeLineStats } from "@/lib/pgn";
import {
  countTrainableLines,
  formatLastTrained,
  formatPassRate,
  getDueLines,
  getRepertoireStats,
} from "@/lib/training";

function aggregateLineCount(
  games: Parameters<typeof computeLineStats>[0][],
): number {
  return games.reduce(
    (sum, game) => sum + computeLineStats(game).lineCount,
    0,
  );
}

export function TrainingRepertoireList() {
  const { repertoires, isHydrated } = useRepertoires();
  const [dueOnly, setDueOnly] = useState(false);

  const sortedRepertoires = useMemo(() => {
    return [...repertoires].sort((a, b) => {
      const dueA = getDueLines(a.id).length;
      const dueB = getDueLines(b.id).length;
      return dueB - dueA;
    });
  }, [repertoires]);

  const visibleRepertoires = dueOnly
    ? sortedRepertoires.filter((repertoire) => getDueLines(repertoire.id).length > 0)
    : sortedRepertoires;

  if (!isHydrated) {
    return (
      <p className="text-center text-sm text-muted-foreground">Loading repertoires…</p>
    );
  }

  if (repertoires.length === 0) {
    return (
      <EmptyState
        title="No repertoires yet"
        description="Import or create a repertoire before you can train."
        actions={
          <>
            <Link
              href="/repertoires"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Go to repertoires
            </Link>
          </>
        }
      />
    );
  }

  return (
    <div>
      <label className="mb-4 flex items-center gap-2 text-sm text-foreground/90">
        <input
          type="checkbox"
          checked={dueOnly}
          onChange={(event) => setDueOnly(event.target.checked)}
        />
        Show due only
      </label>

      {dueOnly && visibleRepertoires.length === 0 ? (
        <EmptyState
          title="Nothing due today"
          description="All caught up — check back tomorrow or train any repertoire."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleRepertoires.map((repertoire) => {
            const stats = getRepertoireStats(repertoire.id);
            const dueCount = getDueLines(repertoire.id).length;
            const lineCount = aggregateLineCount(repertoire.games);
            const whiteLines = countTrainableLines(repertoire, "white");
            const blackLines = countTrainableLines(repertoire, "black");
            const canTrain =
              repertoire.source === "imported"
                ? lineCount > 0
                : repertoire.registeredLeafIds.length > 0;

            return (
              <article
                key={repertoire.id}
                className="rounded-xl bg-surface p-5 ring-1 ring-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-foreground">
                      {repertoire.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          repertoire.source === "imported"
                            ? "bg-info-muted text-blue-700"
                            : "bg-purple-50 text-purple-700"
                        }`}
                      >
                        {repertoire.source === "imported" ? "Imported" : "Created"}
                      </span>
                      {dueCount > 0 ? (
                        <span className="rounded-full bg-warning-muted px-2 py-0.5 text-xs font-semibold text-warning-foreground">
                          {dueCount} due
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-background px-2 py-2">
                    <dt className="text-muted-foreground">Lines</dt>
                    <dd className="font-semibold text-foreground">{lineCount}</dd>
                  </div>
                  <div className="rounded-lg bg-background px-2 py-2">
                    <dt className="text-muted-foreground">As White</dt>
                    <dd className="font-semibold text-foreground">{whiteLines}</dd>
                  </div>
                  <div className="rounded-lg bg-background px-2 py-2">
                    <dt className="text-muted-foreground">As Black</dt>
                    <dd className="font-semibold text-foreground">{blackLines}</dd>
                  </div>
                </dl>

                {stats.lastTrainedAt ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Last trained {formatLastTrained(stats.lastTrainedAt)} —{" "}
                    {formatPassRate(stats.lastPassRate)} passed
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">Not trained yet</p>
                )}

                {canTrain ? (
                  <Link
                    href={`/training/${repertoire.id}`}
                    className="mt-4 block min-h-11 w-full rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-accent-hover"
                  >
                    Train
                  </Link>
                ) : (
                  <div className="mt-4 rounded-lg bg-warning-muted px-3 py-2 text-center text-sm text-warning-foreground ring-1 ring-warning/30">
                    Register lines before training.{" "}
                    <Link
                      href={`/repertoires/${repertoire.id}/edit`}
                      className="font-medium underline"
                    >
                      Edit repertoire
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
