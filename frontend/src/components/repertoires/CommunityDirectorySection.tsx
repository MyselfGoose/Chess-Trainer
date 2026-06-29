"use client";

import { useCallback, useEffect, useState } from "react";

import { createRepertoire } from "@/lib/repertoires";
import { downloadEntryPgn, fetchDirectory, getDirectoryUrl } from "@/lib/cloud/directory";
import type { RepertoireDirectoryEntry } from "@/lib/cloud/types";
import { parsePgnDatabase } from "@/lib/pgn";

export function CommunityDirectorySection({ onImported }: { onImported: () => void }) {
  const directoryUrl = getDirectoryUrl();
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState<RepertoireDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadDirectory = useCallback(async () => {
    if (!directoryUrl) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const directory = await fetchDirectory();
      setEntries(directory.entries);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load community directory.",
      );
    } finally {
      setLoading(false);
    }
  }, [directoryUrl]);

  useEffect(() => {
    if (expanded && directoryUrl && entries.length === 0 && !loading && !error) {
      /* eslint-disable react-hooks/set-state-in-effect -- lazy load on expand */
      void loadDirectory();
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [directoryUrl, entries.length, error, expanded, loadDirectory, loading]);

  if (!directoryUrl) {
    return null;
  }

  const filtered = entries.filter((entry) => {
    if (!query.trim()) {
      return true;
    }
    const haystack = `${entry.name} ${entry.author} ${entry.tags.join(" ")}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const handleImport = async (entry: RepertoireDirectoryEntry) => {
    setImportingId(entry.id);
    setError(null);
    try {
      const pgn = await downloadEntryPgn(entry);
      const parsed = parsePgnDatabase(pgn);
      if (parsed.games.length === 0) {
        throw new Error("Downloaded PGN contained no games.");
      }
      createRepertoire({
        name: entry.name,
        source: "imported",
        games: parsed.games,
        fileName: `${entry.id}.pgn`,
      });
      onImported();
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Failed to import repertoire.",
      );
    } finally {
      setImportingId(null);
    }
  };

  return (
    <section className="mb-8 rounded-xl bg-surface p-5 ring-1 ring-border">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="text-lg font-semibold text-foreground">Community repertoires</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse shared opening packs and import into your library
          </p>
        </div>
        <span className="text-sm text-muted-foreground">{expanded ? "−" : "+"}</span>
      </button>

      {expanded ? (
        <div className="mt-4 space-y-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, author, or tag"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading directory…</p>
          ) : null}
          {error ? (
            <div className="rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">
              {error}
              <button
                type="button"
                onClick={() => void loadDirectory()}
                className="ml-2 font-semibold underline"
              >
                Retry
              </button>
            </div>
          ) : null}
          {filtered.length === 0 && !loading && !error ? (
            <p className="text-sm text-muted-foreground">No entries match your search.</p>
          ) : null}
          <ul className="space-y-3">
            {filtered.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{entry.name}</p>
                  <p className="text-sm text-muted-foreground">by {entry.author}</p>
                  {entry.description ? (
                    <p className="mt-1 text-sm text-foreground/90">{entry.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.tags.join(" · ")}
                    {entry.color ? ` · As ${entry.color}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={importingId === entry.id}
                  onClick={() => void handleImport(entry)}
                  className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {importingId === entry.id ? "Importing…" : "Import"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
