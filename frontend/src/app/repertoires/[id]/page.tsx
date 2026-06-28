"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

import { ChapterManager } from "@/components/repertoires/ChapterManager";
import { DuplicateForkModal } from "@/components/repertoires/DuplicateForkModal";
import { computeLineStats } from "@/lib/pgn";
import {
  addRepertoireTag,
  getRepertoire,
  removeRepertoireTag,
  updateRepertoire,
  RepertoireStorageError,
  type Repertoire,
} from "@/lib/repertoires";

export default function RepertoireDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [repertoire, setRepertoire] = useState<Repertoire | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [showFork, setShowFork] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only
    setRepertoire(getRepertoire(id));
    setIsHydrated(true);
  }, [id]);

  const handleUpdated = useCallback((updated: Repertoire) => {
    setRepertoire(updated);
  }, []);

  const handleAddTag = () => {
    if (!repertoire) {
      return;
    }
    const trimmed = tagInput.trim();
    if (!trimmed) {
      return;
    }
    setTagError(null);
    try {
      const updated = updateRepertoire(repertoire.id, {
        meta: addRepertoireTag(repertoire.meta, trimmed),
      });
      if (updated) {
        setRepertoire(updated);
        setTagInput("");
      }
    } catch (err) {
      setTagError(
        err instanceof RepertoireStorageError
          ? err.message
          : "Failed to save tag.",
      );
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (!repertoire) {
      return;
    }
    try {
      const updated = updateRepertoire(repertoire.id, {
        meta: removeRepertoireTag(repertoire.meta, tag),
      });
      if (updated) {
        setRepertoire(updated);
      }
    } catch (err) {
      setTagError(
        err instanceof RepertoireStorageError
          ? err.message
          : "Failed to remove tag.",
      );
    }
  };

  if (!isHydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!repertoire) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
        <h1 className="text-xl font-semibold text-foreground">
          Repertoire not found
        </h1>
        <Link
          href="/repertoires"
          className="mt-4 text-sm font-medium text-accent"
        >
          Back to library
        </Link>
      </div>
    );
  }

  const stats = repertoire.games.reduce(
    (acc, game) => {
      const lineStats = computeLineStats(game);
      return {
        lineCount: acc.lineCount + lineStats.lineCount,
        totalMoves: acc.totalMoves + lineStats.totalMoves,
      };
    },
    { lineCount: 0, totalMoves: 0 },
  );

  return (
    <div className="min-h-full overflow-y-auto bg-surface-muted">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/repertoires"
          className="text-sm font-medium text-accent hover:underline"
        >
          ← Repertoires
        </Link>

        <header className="mt-4 rounded-xl bg-surface p-6 ring-1 ring-border">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {repertoire.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {repertoire.games.length} games · {stats.lineCount} lines ·{" "}
                {stats.totalMoves} moves
              </p>
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  repertoire.source === "imported"
                    ? "bg-info-muted text-blue-700"
                    : "bg-purple-50 text-purple-700"
                }`}
              >
                {repertoire.source === "imported" ? "Imported" : "Created"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/study/${repertoire.id}`}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Study
              </Link>
              <Link
                href={`/training/${repertoire.id}`}
                className="rounded-lg bg-surface px-3 py-1.5 text-sm font-medium ring-1 ring-border hover:bg-background"
              >
                Train
              </Link>
              {repertoire.source === "created" ? (
                <Link
                  href={`/repertoires/${repertoire.id}/edit`}
                  className="rounded-lg bg-surface px-3 py-1.5 text-sm font-medium ring-1 ring-border hover:bg-background"
                >
                  Edit
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowFork(true)}
                  className="rounded-lg bg-surface px-3 py-1.5 text-sm font-medium ring-1 ring-border hover:bg-background"
                >
                  Duplicate &amp; Edit
                </button>
              )}
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-xl bg-surface p-4 ring-1 ring-border">
          <h2 className="text-lg font-semibold text-foreground">Tags</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {repertoire.meta.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1 text-xs text-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tag"
              className="min-w-0 flex-1 rounded-md border border-border px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Add
            </button>
          </div>
          {tagError ? (
            <p className="mt-2 text-sm text-danger">{tagError}</p>
          ) : null}
        </section>

        <div className="mt-6">
          <ChapterManager repertoire={repertoire} onUpdated={handleUpdated} />
        </div>
      </div>

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
    </div>
  );
}
