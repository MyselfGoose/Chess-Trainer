"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { DuplicateForkModal } from "@/components/repertoires/DuplicateForkModal";

import { computeLineStats } from "@/lib/pgn";
import { repertoireToPgn, downloadPgnFile } from "@/lib/pgn/export";
import {
  aggregateLineStats,
  findWeakLines,
  getTrainingHistory,
  getMasteryForRepertoire,
} from "@/lib/training";
import {
  deleteRepertoire,
  REPERTOIRE_NAME_MAX_LENGTH,
  updateRepertoire,
  type Repertoire,
} from "@/lib/repertoires";

interface RepertoireCardProps {
  repertoire: Repertoire;
  onRefresh: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function aggregateStats(repertoire: Repertoire) {
  return repertoire.games.reduce(
    (acc, game) => {
      const stats = computeLineStats(game);
      return {
        lineCount: acc.lineCount + stats.lineCount,
        totalMoves: acc.totalMoves + stats.totalMoves,
        variationCount: acc.variationCount + stats.variationCount,
      };
    },
    { lineCount: 0, totalMoves: 0, variationCount: 0 },
  );
}

export function RepertoireCard({ repertoire, onRefresh }: RepertoireCardProps) {
  const router = useRouter();
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showFork, setShowFork] = useState(false);
  const [name, setName] = useState(repertoire.name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const stats = aggregateStats(repertoire);
  const weakLines = findWeakLines(
    aggregateLineStats(
      repertoire.id,
      getTrainingHistory(),
      getMasteryForRepertoire(repertoire.id),
    ),
  );

  const handleRename = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setRenameError("Name cannot be empty.");
      return;
    }
    if (trimmed.length > REPERTOIRE_NAME_MAX_LENGTH) {
      setRenameError(`Max ${REPERTOIRE_NAME_MAX_LENGTH} characters.`);
      return;
    }
    if (trimmed === repertoire.name) {
      setShowRename(false);
      setRenameError(null);
      return;
    }
    updateRepertoire(repertoire.id, { name: trimmed });
    onRefresh();
    setShowRename(false);
    setRenameError(null);
  }, [name, onRefresh, repertoire.id, repertoire.name]);

  const handleDelete = useCallback(() => {
    deleteRepertoire(repertoire.id);
    onRefresh();
    setShowDelete(false);
  }, [onRefresh, repertoire.id]);

  const handleExport = useCallback(() => {
    const pgn = repertoireToPgn(repertoire.games);
    downloadPgnFile(pgn, repertoire.name);
  }, [repertoire.games, repertoire.name]);

  return (
    <article className="rounded-xl bg-surface p-5 ring-1 ring-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {showRename ? (
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setRenameError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleRename();
                    }
                    if (event.key === "Escape") {
                      setName(repertoire.name);
                      setShowRename(false);
                      setRenameError(null);
                    }
                  }}
                  maxLength={REPERTOIRE_NAME_MAX_LENGTH}
                  className="min-w-0 flex-1 rounded-md border border-border-strong px-2 py-1 text-sm"
                  autoFocus
                  aria-label="Repertoire name"
                />
                <button
                  type="button"
                  onClick={handleRename}
                  className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-white"
                >
                  Save
                </button>
              </div>
              {renameError ? (
                <p className="text-xs text-red-600">{renameError}</p>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={`/repertoires/${repertoire.id}`}
                className="truncate text-lg font-semibold text-foreground hover:text-accent"
              >
                {repertoire.name}
              </Link>
              <button
                type="button"
                onClick={() => setShowRename(true)}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-surface-muted"
                aria-label="Rename repertoire"
              >
                ✎
              </button>
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                repertoire.source === "imported"
                  ? "bg-info-muted text-blue-700"
                  : "bg-purple-50 text-purple-700"
              }`}
            >
              {repertoire.source === "imported" ? "Imported" : "Created"}
            </span>
            <span className="text-xs text-muted-foreground">
              Updated {formatDate(repertoire.updatedAt)}
            </span>
            {weakLines.length > 0 ? (
              <Link
                href={`/training/${repertoire.id}?weak=${weakLines.map((line) => line.lineId).join(",")}`}
                className="rounded-full bg-danger-muted px-2 py-0.5 text-xs font-medium text-danger"
              >
                {weakLines.length} weak lines
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-background px-2 py-2">
          <dt className="text-muted-foreground">Lines</dt>
          <dd className="font-semibold text-foreground">{stats.lineCount}</dd>
        </div>
        <div className="rounded-lg bg-background px-2 py-2">
          <dt className="text-muted-foreground">Moves</dt>
          <dd className="font-semibold text-foreground">{stats.totalMoves}</dd>
        </div>
        <div className="rounded-lg bg-background px-2 py-2">
          <dt className="text-muted-foreground">Variations</dt>
          <dd className="font-semibold text-foreground">{stats.variationCount}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/study/${repertoire.id}`}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
        >
          Study
        </Link>
        {repertoire.source === "created" ? (
          <button
            type="button"
            onClick={() => router.push(`/repertoires/${repertoire.id}/edit`)}
            className="rounded-lg bg-surface px-3 py-1.5 text-sm font-medium text-foreground/90 ring-1 ring-border transition hover:bg-background"
          >
            Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowFork(true)}
            className="rounded-lg bg-surface px-3 py-1.5 text-sm font-medium text-foreground/90 ring-1 ring-border transition hover:bg-background"
          >
            Duplicate &amp; Edit
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setShowRename(true);
            setRenameError(null);
          }}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-background"
        >
          Rename
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-background"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-danger-muted"
        >
          Delete
        </button>
      </div>

      {showDelete ? (
        <div className="mt-4 rounded-lg bg-danger-muted p-3 ring-1 ring-danger/30">
          <p className="text-sm text-danger-foreground">
            Delete &ldquo;{repertoire.name}&rdquo;? This cannot be undone.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setShowDelete(false)}
              className="rounded-md px-3 py-1 text-xs text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showFork ? (
        <DuplicateForkModal
          repertoire={repertoire}
          onComplete={(newId) => {
            setShowFork(false);
            router.push(`/repertoires/${newId}/edit`);
          }}
          onCancel={() => setShowFork(false)}
        />
      ) : null}
    </article>
  );
}
