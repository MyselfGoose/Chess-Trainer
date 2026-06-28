"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { extractTrainingLines } from "@/lib/training/lines";
import {
  createRepertoire,
  deleteRepertoire,
  listRepertoires,
  mergeRepertoires,
  REPERTOIRE_NAME_MAX_LENGTH,
  RepertoireStorageError,
  type Repertoire,
} from "@/lib/repertoires";

type WizardStep = "pick" | "options" | "confirm";

interface MergeRepertoiresModalProps {
  onComplete: (repertoireId: string) => void;
  onCancel: () => void;
}

export function MergeRepertoiresModal({
  onComplete,
  onCancel,
}: MergeRepertoiresModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("pick");
  const [catalog, setCatalog] = useState<Repertoire[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [primaryId, setPrimaryId] = useState("");
  const [secondaryId, setSecondaryId] = useState("");
  const [name, setName] = useState("");
  const [includeSecondaryRegistered, setIncludeSecondaryRegistered] =
    useState(true);
  const [deleteSources, setDeleteSources] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (catalogLoaded) {
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage is client-only */
    setCatalog(listRepertoires());
    setCatalogLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [catalogLoaded]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onCancel]);

  const primary = useMemo(
    () => catalog.find((entry) => entry.id === primaryId) ?? null,
    [catalog, primaryId],
  );
  const secondary = useMemo(
    () => catalog.find((entry) => entry.id === secondaryId) ?? null,
    [catalog, secondaryId],
  );

  const summary = useMemo(() => {
    if (!primary || !secondary) {
      return null;
    }
    const primaryLines = extractTrainingLines(primary).length;
    const secondaryLines = extractTrainingLines(secondary).length;
    return {
      games: primary.games.length + secondary.games.length,
      lines: primaryLines + secondaryLines,
    };
  }, [primary, secondary]);

  const goToOptions = () => {
    if (!primary || !secondary) {
      setError("Select two different repertoires.");
      return;
    }
    if (primary.id === secondary.id) {
      setError("Select two different repertoires.");
      return;
    }
    setError(null);
    if (!name.trim()) {
      setName(`${primary.name} + ${secondary.name}`);
    }
    setStep("options");
  };

  const goToConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }
    if (trimmed.length > REPERTOIRE_NAME_MAX_LENGTH) {
      setError(`Max ${REPERTOIRE_NAME_MAX_LENGTH} characters.`);
      return;
    }
    setError(null);
    setStep("confirm");
  };

  const handleMerge = () => {
    if (!primary || !secondary) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const { repertoire } = mergeRepertoires(primary, secondary, {
        name: name.trim(),
        includeSecondaryRegistered,
      });
      const saved = createRepertoire({
        name: repertoire.name,
        source: repertoire.source,
        games: repertoire.games,
        registeredLeafIds: repertoire.registeredLeafIds,
        meta: repertoire.meta,
      });
      if (deleteSources) {
        deleteRepertoire(primary.id);
        deleteRepertoire(secondary.id);
      }
      onComplete(saved.id);
      router.push(`/repertoires/${saved.id}`);
    } catch (err) {
      setError(
        err instanceof RepertoireStorageError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to merge repertoires.",
      );
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-repertoires-title"
    >
      <div className="w-full max-w-md rounded-lg bg-surface p-4 shadow-xl ring-1 ring-border">
        <h2
          id="merge-repertoires-title"
          className="text-base font-semibold text-foreground"
        >
          Merge repertoires
        </h2>

        {step === "pick" ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Combine all games from two repertoires into a new one.
            </p>
            <label className="mt-4 block text-xs font-medium text-muted-foreground">
              Primary (A)
              <select
                value={primaryId}
                onChange={(event) => setPrimaryId(event.target.value)}
                className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
              >
                <option value="">Select repertoire…</option>
                {catalog.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-xs font-medium text-muted-foreground">
              Secondary (B) — games appended
              <select
                value={secondaryId}
                onChange={(event) => setSecondaryId(event.target.value)}
                className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
              >
                <option value="">Select repertoire…</option>
                {catalog.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        {step === "options" ? (
          <>
            <label className="mt-4 block text-xs font-medium text-muted-foreground">
              Merged name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={REPERTOIRE_NAME_MAX_LENGTH}
                className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
              />
            </label>
            {secondary?.source === "created" ? (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeSecondaryRegistered}
                  onChange={(event) =>
                    setIncludeSecondaryRegistered(event.target.checked)
                  }
                />
                Include B&apos;s registered lines
              </label>
            ) : null}
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={deleteSources}
                onChange={(event) => setDeleteSources(event.target.checked)}
              />
              Delete A and B after merge
            </label>
          </>
        ) : null}

        {step === "confirm" && summary ? (
          <div className="mt-4 rounded-lg bg-surface-muted p-3 text-sm text-foreground">
            <p>
              <strong>{name.trim()}</strong>
            </p>
            <p className="mt-1 text-muted-foreground">
              {summary.games} games · ~{summary.lines} trainable lines
            </p>
            {deleteSources ? (
              <p className="mt-2 text-danger">
                Original repertoires will be deleted.
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <div className="mt-4 flex justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              if (step === "pick") {
                onCancel();
              } else if (step === "options") {
                setStep("pick");
              } else {
                setStep("options");
              }
            }}
            disabled={isSaving}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted disabled:opacity-50"
          >
            {step === "pick" ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (step === "pick") {
                goToOptions();
              } else if (step === "options") {
                goToConfirm();
              } else {
                handleMerge();
              }
            }}
            disabled={isSaving}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {step === "confirm"
              ? isSaving
                ? "Merging…"
                : "Merge"
              : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
