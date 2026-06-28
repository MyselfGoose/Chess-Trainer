"use client";

import { useCallback, useMemo, useState } from "react";

import { extractTrainingLines } from "@/lib/training/lines";
import {
  addChapter,
  applySuggestedChapters,
  createChapter,
  deleteChapter,
  moveChapter,
  removeLinesFromChapter,
  setChapterLines,
  sortedChapters,
  suggestChaptersFromLines,
  updateChapter,
  updateRepertoire,
  RepertoireStorageError,
  type Repertoire,
  type RepertoireChapter,
  type SuggestedChapter,
} from "@/lib/repertoires";

const LINE_PAGE_SIZE = 30;

interface ChapterManagerProps {
  repertoire: Repertoire;
  onUpdated: (repertoire: Repertoire) => void;
}

export function ChapterManager({
  repertoire,
  onUpdated,
}: ChapterManagerProps) {
  const [error, setError] = useState<string | null>(null);
  const [newChapterName, setNewChapterName] = useState("");
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [linePage, setLinePage] = useState(0);
  const [suggestions, setSuggestions] = useState<SuggestedChapter[] | null>(
    null,
  );
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<
    Set<number>
  >(new Set());

  const allLines = useMemo(
    () => extractTrainingLines(repertoire),
    [repertoire],
  );
  const chapters = sortedChapters(repertoire.meta);
  const editingChapter = chapters.find(
    (chapter) => chapter.id === editingChapterId,
  );

  const persistMeta = useCallback(
    (nextMeta: Repertoire["meta"]) => {
      setError(null);
      try {
        const updated = updateRepertoire(repertoire.id, { meta: nextMeta });
        if (updated) {
          onUpdated(updated);
        }
      } catch (err) {
        setError(
          err instanceof RepertoireStorageError
            ? err.message
            : "Failed to save chapters.",
        );
      }
    },
    [onUpdated, repertoire.id],
  );

  const handleCreateChapter = () => {
    const trimmed = newChapterName.trim();
    if (!trimmed) {
      return;
    }
    const chapter = createChapter(trimmed, chapters.length);
    persistMeta(addChapter(repertoire.meta, chapter));
    setNewChapterName("");
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (!window.confirm("Delete this chapter? Line assignments will be removed.")) {
      return;
    }
    persistMeta(deleteChapter(repertoire.meta, chapterId));
    if (editingChapterId === chapterId) {
      setEditingChapterId(null);
    }
  };

  const handleToggleLine = (chapter: RepertoireChapter, lineId: string) => {
    const hasLine = chapter.lineIds.includes(lineId);
    const nextMeta = hasLine
      ? removeLinesFromChapter(repertoire.meta, chapter.id, [lineId])
      : {
          ...repertoire.meta,
          chapters: repertoire.meta.chapters.map((entry) =>
            entry.id === chapter.id
              ? { ...entry, lineIds: [...entry.lineIds, lineId] }
              : entry,
          ),
        };
    persistMeta(nextMeta);
  };

  const handleSuggest = () => {
    const found = suggestChaptersFromLines(repertoire);
    setSuggestions(found);
    setSelectedSuggestionIds(new Set(found.map((_, index) => index)));
  };

  const handleApplySuggestions = () => {
    if (!suggestions) {
      return;
    }
    const picked = suggestions.filter((_, index) =>
      selectedSuggestionIds.has(index),
    );
    persistMeta(applySuggestedChapters(repertoire.meta, picked));
    setSuggestions(null);
    setSelectedSuggestionIds(new Set());
  };

  const pagedLines = allLines.slice(
    linePage * LINE_PAGE_SIZE,
    (linePage + 1) * LINE_PAGE_SIZE,
  );
  const totalLinePages = Math.max(
    1,
    Math.ceil(allLines.length / LINE_PAGE_SIZE),
  );

  return (
    <section className="rounded-xl bg-surface p-4 ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Chapters</h2>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={allLines.length === 0}
          className="rounded-md bg-surface-muted px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border transition hover:bg-background disabled:opacity-50"
        >
          Auto-suggest
        </button>
      </div>

      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={newChapterName}
          onChange={(event) => setNewChapterName(event.target.value)}
          placeholder="New chapter name"
          className="min-w-0 flex-1 rounded-md border border-border px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={handleCreateChapter}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Add
        </button>
      </div>

      {chapters.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No chapters yet. Create one or use auto-suggest to group lines by opening.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {chapters.map((chapter) => (
            <li
              key={chapter.id}
              className="rounded-lg border border-border px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditingChapterId(
                      editingChapterId === chapter.id ? null : chapter.id,
                    )
                  }
                  className="text-left text-sm font-medium text-foreground hover:text-accent"
                >
                  {chapter.name}
                </button>
                <span className="text-xs text-muted-foreground">
                  {chapter.lineIds.length} lines
                  {chapter.color ? ` · ${chapter.color}` : ""}
                </span>
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    aria-label="Move chapter up"
                    onClick={() =>
                      persistMeta(moveChapter(repertoire.meta, chapter.id, "up"))
                    }
                    className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-surface-muted"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    aria-label="Move chapter down"
                    onClick={() =>
                      persistMeta(
                        moveChapter(repertoire.meta, chapter.id, "down"),
                      )
                    }
                    className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-surface-muted"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteChapter(chapter.id)}
                    className="rounded px-2 py-1 text-xs text-danger hover:bg-surface-muted"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingChapter ? (
        <div className="mt-4 rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold text-foreground">
            Assign lines — {editingChapter.name}
          </h3>
          <label className="mt-2 block text-xs text-muted-foreground">
            Chapter name
            <input
              type="text"
              value={editingChapter.name}
              onChange={(event) => {
                const next = updateChapter(editingChapter, {
                  name: event.target.value,
                });
                persistMeta({
                  ...repertoire.meta,
                  chapters: repertoire.meta.chapters.map((entry) =>
                    entry.id === next.id ? next : entry,
                  ),
                });
              }}
              className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </label>
          <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">
            {pagedLines.map((line) => (
              <label
                key={line.id}
                className="flex items-start gap-2 text-xs text-foreground"
              >
                <input
                  type="checkbox"
                  checked={editingChapter.lineIds.includes(line.id)}
                  onChange={() => handleToggleLine(editingChapter, line.id)}
                />
                <span className="font-mono">{line.label}</span>
              </label>
            ))}
          </div>
          {totalLinePages > 1 ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <button
                type="button"
                disabled={linePage === 0}
                onClick={() => setLinePage((page) => page - 1)}
                className="rounded px-2 py-1 hover:bg-surface-muted disabled:opacity-50"
              >
                Prev
              </button>
              <span>
                Page {linePage + 1} / {totalLinePages}
              </span>
              <button
                type="button"
                disabled={linePage >= totalLinePages - 1}
                onClick={() => setLinePage((page) => page + 1)}
                className="rounded px-2 py-1 hover:bg-surface-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() =>
              persistMeta(setChapterLines(repertoire.meta, editingChapter.id, []))
            }
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all lines
          </button>
        </div>
      ) : null}

      {suggestions ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="suggest-chapters-title"
        >
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-surface p-4 shadow-xl ring-1 ring-border">
            <h3
              id="suggest-chapters-title"
              className="text-base font-semibold text-foreground"
            >
              Suggested chapters
            </h3>
            <ul className="mt-3 space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.name}-${index}`}>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedSuggestionIds.has(index)}
                      onChange={() => {
                        setSelectedSuggestionIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(index)) {
                            next.delete(index);
                          } else {
                            next.add(index);
                          }
                          return next;
                        });
                      }}
                    />
                    <span>
                      <span className="font-medium">{suggestion.name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {suggestion.lineIds.length} lines
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuggestions(null)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplySuggestions}
                disabled={selectedSuggestionIds.size === 0}
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                Add selected
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
