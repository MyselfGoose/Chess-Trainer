"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { TrainingColorPicker } from "@/components/training/TrainingColorPicker";
import { useRepertoires } from "@/hooks/useRepertoires";
import { parsePgnDatabase } from "@/lib/pgn";
import {
  analyzeGameDeviation,
  isDeviationError,
  type DeviationAnalysisResult,
} from "@/lib/prep/gameDeviations";
import {
  loadGameAnalysis,
  saveGameAnalysis,
  type StoredGameAnalysis,
} from "@/lib/prep/gameAnalysisSession";
import type { TrainingColor } from "@/lib/training";

export function GameAnalyzePanel() {
  const { repertoires, isHydrated } = useRepertoires();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pgnText, setPgnText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [repertoireId, setRepertoireId] = useState("");
  const [userColor, setUserColor] = useState<TrainingColor>("white");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [multiGameWarning, setMultiGameWarning] = useState(false);
  const [stored, setStored] = useState<StoredGameAnalysis | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sessionStorage restore on mount */
    const existing = loadGameAnalysis();
    if (existing) {
      setStored(existing);
      setRepertoireId(existing.repertoireId);
      setUserColor(existing.userColor);
      setMultiGameWarning(Boolean(existing.multiGameWarning));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- default repertoire when list loads */
    if (!repertoireId && repertoires.length > 0) {
      setRepertoireId(repertoires[0]!.id);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [repertoireId, repertoires]);

  const runAnalysis = useCallback(
    (content: string) => {
      setAnalysisError(null);
      const trimmed = content.trim();
      if (!trimmed) {
        setAnalysisError("Paste or upload a game PGN first.");
        return;
      }
      if (!repertoireId) {
        setAnalysisError("Select a repertoire to compare against.");
        return;
      }

      const repertoire = repertoires.find((entry) => entry.id === repertoireId);
      if (!repertoire) {
        setAnalysisError("Selected repertoire was not found.");
        return;
      }

      const parsed = parsePgnDatabase(trimmed);
      if (parsed.games.length === 0) {
        setAnalysisError("No games found in PGN.");
        return;
      }

      const warning = parsed.games.length > 1;
      setMultiGameWarning(warning);

      const game = parsed.games[0]!;
      const outcome = analyzeGameDeviation(game, repertoire, userColor);
      if (isDeviationError(outcome)) {
        setAnalysisError(outcome.error);
        setStored(null);
        return;
      }

      const next: StoredGameAnalysis = {
        repertoireId: repertoire.id,
        repertoireName: repertoire.name,
        userColor,
        analyzedAt: new Date().toISOString(),
        multiGameWarning: warning,
        result: outcome,
      };
      saveGameAnalysis(next);
      setStored(next);
    },
    [repertoireId, repertoires, userColor],
  );

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        setPgnText(text);
        runAnalysis(text);
      };
      reader.readAsText(file);
    },
    [runAnalysis],
  );

  if (!isHydrated) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (repertoires.length === 0) {
    return (
      <div className="rounded-xl bg-warning-muted p-4 ring-1 ring-warning/30">
        <p className="text-sm text-warning-foreground">
          Import a repertoire before analyzing games against your book.
        </p>
        <Link href="/upload" className="mt-2 inline-block text-sm font-semibold text-accent">
          Import a repertoire
        </Link>
      </div>
    );
  }

  const result = stored?.result ?? null;

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) {
            handleFile(file);
          }
        }}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragging
            ? "border-accent bg-accent-muted"
            : "border-border-strong bg-surface hover:border-border-strong"
        }`}
      >
        <p className="text-lg font-medium text-foreground">Drop a played game PGN</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Single-game PGN recommended — first game is analyzed if multiple are present
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
        >
          Browse files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pgn,text/plain"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              handleFile(file);
            }
          }}
        />
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowPaste((value) => !value)}
          className="text-sm font-medium text-accent hover:text-accent-foreground"
        >
          {showPaste ? "Hide paste area" : "Paste PGN instead"}
        </button>
        {showPaste ? (
          <div className="mt-3">
            <textarea
              value={pgnText}
              onChange={(event) => setPgnText(event.target.value)}
              placeholder="Paste your game PGN…"
              rows={8}
              className="w-full rounded-lg border border-border-strong px-3 py-2 font-mono text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-4 rounded-xl bg-surface p-5 ring-1 ring-border">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground/90">
            Compare against repertoire
          </label>
          <select
            value={repertoireId}
            onChange={(event) => setRepertoireId(event.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          >
            {repertoires.map((repertoire) => (
              <option key={repertoire.id} value={repertoire.id}>
                {repertoire.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground/90">Your color</p>
          <TrainingColorPicker value={userColor} onChange={setUserColor} />
        </div>

        <button
          type="button"
          onClick={() => runAnalysis(pgnText)}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
        >
          Analyze game
        </button>
      </div>

      {analysisError ? (
        <p className="mt-4 rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">
          {analysisError}
        </p>
      ) : null}

      {multiGameWarning ? (
        <p className="mt-4 rounded-lg bg-warning-muted px-3 py-2 text-sm text-warning-foreground">
          Multiple games detected — only the first game was analyzed.
        </p>
      ) : null}

      {result ? (
        <GameAnalysisResults
          repertoireId={stored!.repertoireId}
          userColor={stored!.userColor}
          result={result}
        />
      ) : null}
    </div>
  );
}

function GameAnalysisResults({
  repertoireId,
  userColor,
  result,
}: {
  repertoireId: string;
  userColor: TrainingColor;
  result: DeviationAnalysisResult;
}) {
  const deviation = result.deviation;
  const trainHref =
    deviation?.parentNodeId
      ? `/training/${repertoireId}?anchor=${encodeURIComponent(deviation.parentNodeId)}&color=${userColor}`
      : null;

  return (
    <div className="mt-6 rounded-xl bg-surface p-5 ring-1 ring-border">
      <h2 className="text-lg font-semibold text-foreground">Analysis results</h2>
      {result.deviation === null ? (
        <p className="mt-2 text-sm text-accent">
          In book for all {result.inBookPlies} of your moves ({result.totalPlies} plies in
          mainline).
        </p>
      ) : (
        <p className="mt-2 text-sm text-danger">
          Left repertoire at move {Math.ceil(result.deviation.ply / 2)} (ply{" "}
          {result.deviation.ply}): played {result.deviation.playedSan}
          {result.deviation.expectedSan
            ? ` · repertoire: ${result.deviation.expectedSan}`
            : null}
        </p>
      )}

      {result.deviation && result.deviation.repertoireSans.length > 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Repertoire moves: {result.deviation.repertoireSans.join(", ")}
        </p>
      ) : null}

      <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto font-mono text-xs text-foreground/90">
        {result.gameMoves.map((move, index) => (
          <li key={`${move.ply}-${index}`}>
            {move.ply}. {move.san}
            {result.deviation?.moveIndex === index ? " ← deviation" : ""}
          </li>
        ))}
      </ul>

      {trainHref ? (
        <Link
          href={trainHref}
          className="mt-4 inline-block rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          Train from deviation
        </Link>
      ) : null}
    </div>
  );
}
