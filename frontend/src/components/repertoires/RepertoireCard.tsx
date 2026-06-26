"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { computeLineStats } from "@/lib/pgn";
import { repertoireToPgn, downloadPgnFile } from "@/lib/pgn/export";
import {
  deleteRepertoire,
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
  const [name, setName] = useState(repertoire.name);
  const stats = aggregateStats(repertoire);

  const handleRename = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === repertoire.name) {
      setShowRename(false);
      return;
    }
    updateRepertoire(repertoire.id, { name: trimmed });
    onRefresh();
    setShowRename(false);
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
    <article className="rounded-xl bg-white p-5 ring-1 ring-zinc-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {showRename ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={handleRename}
                className="rounded-md bg-green-700 px-2 py-1 text-xs font-medium text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setName(repertoire.name);
                  setShowRename(false);
                }}
                className="rounded-md px-2 py-1 text-xs text-zinc-500"
              >
                Cancel
              </button>
            </div>
          ) : (
            <h3 className="truncate text-lg font-semibold text-zinc-900">
              {repertoire.name}
            </h3>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                repertoire.source === "imported"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-purple-50 text-purple-700"
              }`}
            >
              {repertoire.source === "imported" ? "Imported" : "Created"}
            </span>
            <span className="text-xs text-zinc-500">
              Updated {formatDate(repertoire.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-zinc-50 px-2 py-2">
          <dt className="text-zinc-500">Lines</dt>
          <dd className="font-semibold text-zinc-900">{stats.lineCount}</dd>
        </div>
        <div className="rounded-lg bg-zinc-50 px-2 py-2">
          <dt className="text-zinc-500">Moves</dt>
          <dd className="font-semibold text-zinc-900">{stats.totalMoves}</dd>
        </div>
        <div className="rounded-lg bg-zinc-50 px-2 py-2">
          <dt className="text-zinc-500">Variations</dt>
          <dd className="font-semibold text-zinc-900">{stats.variationCount}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/study/${repertoire.id}`}
          className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-green-800"
        >
          Study
        </Link>
        {repertoire.source === "created" ? (
          <button
            type="button"
            onClick={() => router.push(`/repertoires/${repertoire.id}/edit`)}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
          >
            Edit
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setShowRename(true)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
        >
          Rename
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          Delete
        </button>
      </div>

      {showDelete ? (
        <div className="mt-4 rounded-lg bg-red-50 p-3 ring-1 ring-red-200">
          <p className="text-sm text-red-800">
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
              className="rounded-md px-3 py-1 text-xs text-zinc-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
