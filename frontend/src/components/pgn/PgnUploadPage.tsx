"use client";

import { useState } from "react";

import { GameAnalyzePanel } from "@/components/pgn/GameAnalyzePanel";
import { PgnUploadForm, type PgnSavePayload } from "@/components/pgn/PgnUploadForm";
import {
  createRepertoire,
  RepertoireStorageError,
  type Repertoire,
} from "@/lib/repertoires";

type UploadMode = "import" | "analyze";

export function PgnUploadPage() {
  const [mode, setMode] = useState<UploadMode>("import");

  const handleImport = async (payload: PgnSavePayload): Promise<Repertoire | null> => {
    try {
      return createRepertoire({
        name: payload.name,
        source: "imported",
        games: payload.games,
        fileName: payload.fileName,
      });
    } catch (error) {
      throw error instanceof RepertoireStorageError
        ? error
        : new Error("Failed to save repertoire.");
    }
  };

  return (
    <div className="min-h-full overflow-y-auto bg-surface-muted">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">
            {mode === "import" ? "Import a PGN" : "Analyze a played game"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {mode === "import"
              ? "Upload or paste a repertoire PGN — it is saved to your library automatically."
              : "Paste a game PGN and see where you left your repertoire."}
          </p>
        </header>

        <div className="mb-6 flex rounded-lg bg-surface p-1 ring-1 ring-border">
          <button
            type="button"
            onClick={() => setMode("import")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              mode === "import"
                ? "bg-accent text-white"
                : "text-foreground/90 hover:bg-background"
            }`}
          >
            Import repertoire
          </button>
          <button
            type="button"
            onClick={() => setMode("analyze")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              mode === "analyze"
                ? "bg-accent text-white"
                : "text-foreground/90 hover:bg-background"
            }`}
          >
            Analyze game
          </button>
        </div>

        {mode === "import" ? (
          <PgnUploadForm onImport={handleImport} />
        ) : (
          <GameAnalyzePanel />
        )}
      </div>
    </div>
  );
}
