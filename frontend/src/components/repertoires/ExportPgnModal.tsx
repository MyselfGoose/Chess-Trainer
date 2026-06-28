"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildExportFileName,
  downloadPgnFile,
  exportRepertoirePgn,
  gamesForChapter,
  type ExportScope,
} from "@/lib/pgn/export";
import { sortedChapters, type Repertoire } from "@/lib/repertoires";

interface ExportPgnModalProps {
  repertoire: Repertoire;
  selectedGameIndex: number;
  onClose: () => void;
}

export function ExportPgnModal({
  repertoire,
  selectedGameIndex,
  onClose,
}: ExportPgnModalProps) {
  const chapters = useMemo(
    () => sortedChapters(repertoire.meta),
    [repertoire.meta],
  );
  const [scope, setScope] = useState<ExportScope>(
    repertoire.games.length > 1 ? "currentGame" : "fullRepertoire",
  );
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isExporting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExporting, onClose]);

  const preview = useMemo(() => {
    if (scope === "fullRepertoire") {
      return `${repertoire.games.length} game${repertoire.games.length === 1 ? "" : "s"}`;
    }
    if (scope === "currentGame") {
      return `1 game (game ${selectedGameIndex + 1})`;
    }
    const games = chapterId ? gamesForChapter(repertoire, chapterId) : [];
    return `${games.length} game${games.length === 1 ? "" : "s"} for chapter`;
  }, [chapterId, repertoire, scope, selectedGameIndex]);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const options =
        scope === "currentGame"
          ? { scope, gameIndex: selectedGameIndex }
          : scope === "chapter"
            ? { scope, chapterId }
            : { scope };
      const content = exportRepertoirePgn(repertoire, options);
      if (!content.trim()) {
        return;
      }
      const fileName = buildExportFileName(repertoire.name, options, repertoire);
      downloadPgnFile(content, fileName);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  const chapterDisabled = chapters.length === 0;
  const exportDisabled =
    isExporting ||
    (scope === "chapter" && (chapterDisabled || !chapterId));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-pgn-title"
    >
      <div className="w-full max-w-md rounded-lg bg-surface p-4 shadow-xl ring-1 ring-border">
        <h2
          id="export-pgn-title"
          className="text-base font-semibold text-foreground"
        >
          Export PGN
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Download this repertoire as a PGN file. Chapter export includes full
          games that contain chapter lines.
        </p>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-xs font-medium text-muted-foreground">
            Export scope
          </legend>
          {repertoire.games.length > 1 ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="exportScope"
                checked={scope === "currentGame"}
                onChange={() => setScope("currentGame")}
                disabled={isExporting}
              />
              Current game
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="exportScope"
              checked={scope === "fullRepertoire"}
              onChange={() => setScope("fullRepertoire")}
              disabled={isExporting}
            />
            Full repertoire
          </label>
          <label
            className={`flex items-center gap-2 text-sm ${chapterDisabled ? "opacity-50" : ""}`}
          >
            <input
              type="radio"
              name="exportScope"
              checked={scope === "chapter"}
              onChange={() => setScope("chapter")}
              disabled={isExporting || chapterDisabled}
            />
            Chapter
          </label>
        </fieldset>

        {scope === "chapter" && !chapterDisabled ? (
          <label className="mt-3 block text-xs font-medium text-muted-foreground">
            Chapter
            <select
              value={chapterId}
              onChange={(event) => setChapterId(event.target.value)}
              className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
              disabled={isExporting}
            >
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <p className="mt-3 text-sm text-muted-foreground">Preview: {preview}</p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exportDisabled}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {isExporting ? "Exporting…" : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}
