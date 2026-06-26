"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { computeLineStats, parsePgnDatabase } from "@/lib/pgn";
import type { PgnParseResult, StudyGame } from "@/lib/pgn";
import { REPERTOIRE_NAME_MAX_LENGTH, type Repertoire } from "@/lib/repertoires";

import { PgnLineStats } from "./PgnLineStats";

export interface PgnSavePayload {
  name: string;
  games: StudyGame[];
  fileName?: string;
}

interface PgnUploadFormProps {
  className?: string;
  onImport: (payload: PgnSavePayload) => Promise<Repertoire | null>;
}

function defaultName(fileName?: string, firstGame?: StudyGame): string {
  if (fileName) {
    return fileName.replace(/\.pgn$/i, "").slice(0, REPERTOIRE_NAME_MAX_LENGTH);
  }
  if (firstGame?.meta.Event?.trim()) {
    return firstGame.meta.Event.trim().slice(0, REPERTOIRE_NAME_MAX_LENGTH);
  }
  return "Imported repertoire";
}

export function PgnUploadForm({ className, onImport }: PgnUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importRequestRef = useRef(0);
  const [pgnText, setPgnText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | undefined>();
  const [parseResult, setParseResult] = useState<PgnParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [savedRepertoire, setSavedRepertoire] = useState<Repertoire | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const importParsedGames = useCallback(
    async (result: PgnParseResult, sourceFileName?: string) => {
      if (result.games.length === 0) {
        setSavedRepertoire(null);
        return;
      }

      const requestId = importRequestRef.current + 1;
      importRequestRef.current = requestId;
      setIsImporting(true);
      setImportError(null);

      const name = defaultName(sourceFileName, result.games[0]);
      try {
        const repertoire = await onImport({
          name,
          games: result.games,
          fileName: sourceFileName,
        });
        if (importRequestRef.current === requestId) {
          setSavedRepertoire(repertoire);
        }
      } catch (error) {
        if (importRequestRef.current === requestId) {
          setSavedRepertoire(null);
          setImportError(
            error instanceof Error
              ? error.message
              : "Failed to save repertoire.",
          );
        }
      } finally {
        if (importRequestRef.current === requestId) {
          setIsImporting(false);
        }
      }
    },
    [onImport],
  );

  const handleParse = useCallback(
    async (content: string, name?: string) => {
      setIsParsing(true);
      setSavedRepertoire(null);
      setImportError(null);
      const result = parsePgnDatabase(content, name);
      setParseResult(result);
      setFileName(name);
      setPgnText(content);
      setIsParsing(false);

      if (result.games.length > 0) {
        await importParsedGames(result, name);
      }

      return result;
    },
    [importParsedGames],
  );

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        void handleParse(text, file.name);
      };
      reader.readAsText(file);
    },
    [handleParse],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const onSubmitPaste = useCallback(() => {
    if (pgnText.trim()) {
      void handleParse(pgnText.trim());
    }
  }, [handleParse, pgnText]);

  const firstGame = parseResult?.games[0];
  const firstStats = firstGame ? computeLineStats(firstGame) : null;
  const hasSuccess = hasSuccessGames(parseResult);
  const repertoireName = savedRepertoire?.name ?? defaultName(fileName, firstGame);

  return (
    <div className={className}>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition ${
          isDragging
            ? "border-green-600 bg-green-50"
            : "border-zinc-300 bg-white hover:border-zinc-400"
        }`}
      >
        <p className="text-lg font-medium text-zinc-800">
          Drop your .pgn file here
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Opening repertoires with variations supported
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800"
        >
          Browse files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pgn,text/plain"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowPaste((value) => !value)}
          className="text-sm font-medium text-green-700 hover:text-green-800"
        >
          {showPaste ? "Hide paste area" : "Paste PGN instead"}
        </button>

        {showPaste ? (
          <div className="mt-3">
            <textarea
              value={pgnText}
              onChange={(event) => setPgnText(event.target.value)}
              placeholder="Paste PGN text here..."
              rows={8}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm text-zinc-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            <button
              type="button"
              onClick={onSubmitPaste}
              disabled={!pgnText.trim() || isParsing || isImporting}
              className="mt-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-900 disabled:opacity-50"
            >
              Parse PGN
            </button>
          </div>
        ) : null}
      </div>

      {parseResult && parseResult.errors.length > 0 ? (
        <div className="mt-4 rounded-lg bg-red-50 p-4 ring-1 ring-red-200">
          <p className="text-sm font-medium text-red-800">Parse errors</p>
          <ul className="mt-2 space-y-1">
            {parseResult.errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">
                {error.line ? `Line ${error.line}: ` : ""}
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {parseResult && parseResult.warnings.length > 0 ? (
        <div className="mt-4 rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="text-sm font-medium text-amber-800">Warnings</p>
          <ul className="mt-2 space-y-1">
            {parseResult.warnings.map((warning, index) => (
              <li key={index} className="text-sm text-amber-700">
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasSuccess && firstGame && firstStats && parseResult ? (
        <div className="mt-6 rounded-xl bg-white p-5 ring-1 ring-zinc-200">
          {isImporting ? (
            <p className="text-sm font-medium text-zinc-600">
              Saving repertoire…
            </p>
          ) : savedRepertoire ? (
            <p className="text-sm font-medium text-green-700">Ready to study</p>
          ) : (
            <p className="text-sm font-medium text-amber-700">
              Parsed — save failed
            </p>
          )}

          <p className="mt-1 text-lg font-semibold text-zinc-900">
            {parseResult.games.length}{" "}
            {parseResult.games.length === 1 ? "game" : "games"} parsed
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Saved as{" "}
            <span className="font-medium text-zinc-800">{repertoireName}</span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {firstGame.meta.White ?? "White"} vs {firstGame.meta.Black ?? "Black"}
            {firstGame.meta.Event ? ` — ${firstGame.meta.Event}` : ""}
          </p>
          <div className="mt-3">
            <PgnLineStats stats={firstStats} />
          </div>

          {importError ? (
            <p className="mt-3 text-sm text-red-700">{importError}</p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                if (savedRepertoire) {
                  router.push(`/study/${savedRepertoire.id}`);
                }
              }}
              disabled={!savedRepertoire || isImporting}
              className="flex-1 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
            >
              Study
            </button>
            <button
              type="button"
              onClick={() => router.push("/repertoires")}
              disabled={!savedRepertoire || isImporting}
              className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              View in library
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function hasSuccessGames(result: PgnParseResult | null): boolean {
  return result !== null && result.games.length > 0;
}
