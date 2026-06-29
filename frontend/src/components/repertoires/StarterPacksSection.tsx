"use client";

import { useCallback, useEffect, useState } from "react";

import { createRepertoire } from "@/lib/repertoires";
import { parsePgnDatabase } from "@/lib/pgn";
import {
  fetchPackPgn,
  loadPackManifest,
  previewPackStats,
  type StarterPackEntry,
} from "@/lib/packs/starterPacks";

interface PackPreview extends StarterPackEntry {
  lineCount: number;
  maxDepth: number;
}

export function StarterPacksSection({ onImported }: { onImported: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [packs, setPacks] = useState<PackPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  const loadPacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const manifest = await loadPackManifest();
      const previews = await Promise.all(
        manifest.packs.map(async (pack) => {
          const pgn = await fetchPackPgn(pack.fileName);
          const stats = previewPackStats(pgn);
          return { ...pack, ...stats };
        }),
      );
      setPacks(previews);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load starter packs.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (expanded && packs.length === 0 && !loading && !error) {
      /* eslint-disable react-hooks/set-state-in-effect -- lazy load on expand */
      void loadPacks();
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [error, expanded, loadPacks, loading, packs.length]);

  const handleImport = async (pack: PackPreview) => {
    setImportingId(pack.id);
    setError(null);
    try {
      const pgn = await fetchPackPgn(pack.fileName);
      const parsed = parsePgnDatabase(pgn);
      if (parsed.games.length === 0) {
        throw new Error("Pack contained no games.");
      }
      createRepertoire({
        name: pack.name,
        source: "imported",
        games: parsed.games,
        fileName: pack.fileName,
      });
      onImported();
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Failed to import pack.",
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
          <h2 className="text-lg font-semibold text-foreground">Starter packs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Import ready-made opening lines to get started quickly
          </p>
        </div>
        <span className="text-sm text-muted-foreground">{expanded ? "−" : "+"}</span>
      </button>

      {expanded ? (
        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading packs…</p>
          ) : null}
          {error ? (
            <div className="rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">
              {error}
              <button
                type="button"
                onClick={() => void loadPacks()}
                className="ml-2 font-semibold underline"
              >
                Retry
              </button>
            </div>
          ) : null}
          <ul className="space-y-3">
            {packs.map((pack) => (
              <li
                key={pack.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{pack.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pack.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pack.lineCount} lines · max depth {pack.maxDepth} · As{" "}
                    {pack.color}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={importingId === pack.id}
                  onClick={() => void handleImport(pack)}
                  className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {importingId === pack.id ? "Importing…" : "Import"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
