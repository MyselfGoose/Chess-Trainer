"use client";

import { useCallback } from "react";

import {
  createRepertoire,
  RepertoireStorageError,
  type Repertoire,
} from "@/lib/repertoires";

import { PgnUploadForm, type PgnSavePayload } from "./PgnUploadForm";

export function PgnUploadPage() {
  const handleImport = useCallback(
    async (payload: PgnSavePayload): Promise<Repertoire | null> => {
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
    },
    [],
  );

  return (
    <div className="min-h-full overflow-y-auto bg-surface-muted">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Import a PGN</h1>
          <p className="mt-2 text-muted-foreground">
            Upload or paste a PGN file — it is saved to your library automatically
            using the file name. Lichess studies can be imported by downloading
            the PGN from Lichess and uploading it here.
          </p>
        </header>

        <PgnUploadForm onImport={handleImport} />
      </div>
    </div>
  );
}
