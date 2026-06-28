"use client";

import { useEffect, useState } from "react";

import {
  createRepertoire,
  forkRepertoire,
  REPERTOIRE_NAME_MAX_LENGTH,
  RepertoireStorageError,
  type ForkRegisterStrategy,
  type Repertoire,
} from "@/lib/repertoires";

interface DuplicateForkModalProps {
  repertoire: Repertoire;
  onComplete: (repertoireId: string) => void;
  onCancel: () => void;
}

export function DuplicateForkModal({
  repertoire,
  onComplete,
  onCancel,
}: DuplicateForkModalProps) {
  const [name, setName] = useState(`${repertoire.name} (editable)`);
  const [registerLines, setRegisterLines] =
    useState<ForkRegisterStrategy>("all");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onCancel]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }
    if (trimmed.length > REPERTOIRE_NAME_MAX_LENGTH) {
      setError(`Max ${REPERTOIRE_NAME_MAX_LENGTH} characters.`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const forked = forkRepertoire(repertoire, {
        name: trimmed,
        registerLines,
      });
      const saved = createRepertoire({
        name: forked.name,
        source: forked.source,
        games: forked.games,
        registeredLeafIds: forked.registeredLeafIds,
        fileName: forked.fileName,
        meta: forked.meta,
      });
      onComplete(saved.id);
    } catch (err) {
      setError(
        err instanceof RepertoireStorageError
          ? err.message
          : "Failed to create editable copy.",
      );
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-fork-title"
    >
      <div className="w-full max-w-md rounded-lg bg-surface p-4 shadow-xl ring-1 ring-border">
        <h2
          id="duplicate-fork-title"
          className="text-base font-semibold text-foreground"
        >
          Duplicate &amp; Edit
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an editable copy of this imported repertoire. The original
          stays unchanged.
        </p>

        <label className="mt-4 block text-xs font-medium text-muted-foreground">
          Name
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            maxLength={REPERTOIRE_NAME_MAX_LENGTH}
            className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
            disabled={isSaving}
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-xs font-medium text-muted-foreground">
            Register lines for training
          </legend>
          <div className="mt-2 space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="registerLines"
                checked={registerLines === "all"}
                onChange={() => setRegisterLines("all")}
                disabled={isSaving}
              />
              All leaves
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="registerLines"
                checked={registerLines === "none"}
                onChange={() => setRegisterLines("none")}
                disabled={isSaving}
              />
              None — register manually in the builder
            </label>
          </div>
        </fieldset>

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "Creating…" : "Create & edit"}
          </button>
        </div>
      </div>
    </div>
  );
}
