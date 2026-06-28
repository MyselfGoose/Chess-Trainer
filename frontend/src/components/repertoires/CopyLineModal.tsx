"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PgnGameSelector } from "@/components/pgn/PgnGameSelector";
import { PgnLineSearch } from "@/components/pgn/PgnLineSearch";
import type { StudyGame } from "@/lib/pgn";
import { findNodesByFen } from "@/lib/pgn/positionIndex";
import {
  checkGraftFenMatch,
  copyLineToGame,
  CopyLineError,
  previewCopyLineSan,
  resolveSourceRootChildId,
  listRepertoires,
  RepertoireStorageError,
  updateRepertoire,
  type Repertoire,
} from "@/lib/repertoires";

type WizardStep = "source" | "target" | "confirm";

interface CopyLineModalProps {
  defaultTargetId?: string;
  defaultTargetGameIndex?: number;
  defaultAttachNodeId?: string;
  onComplete: () => void;
  onCancel: () => void;
  onGraftedInBuilder?: (game: StudyGame, attachNodeId: string) => void;
}

export function CopyLineModal({
  defaultTargetId,
  defaultTargetGameIndex = 0,
  defaultAttachNodeId,
  onComplete,
  onCancel,
  onGraftedInBuilder,
}: CopyLineModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("source");
  const [catalog, setCatalog] = useState<Repertoire[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [sourceGameIndex, setSourceGameIndex] = useState(0);
  const [sourceLeafId, setSourceLeafId] = useState("");
  const [targetId, setTargetId] = useState(defaultTargetId ?? "");
  const [targetGameIndex, setTargetGameIndex] = useState(defaultTargetGameIndex);
  const [attachNodeId, setAttachNodeId] = useState(defaultAttachNodeId ?? "");
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

  const source = useMemo(
    () => catalog.find((entry) => entry.id === sourceId) ?? null,
    [catalog, sourceId],
  );
  const target = useMemo(
    () => catalog.find((entry) => entry.id === targetId) ?? null,
    [catalog, targetId],
  );
  const createdTargets = useMemo(
    () => catalog.filter((entry) => entry.source === "created"),
    [catalog],
  );

  const sourceGame = source?.games[sourceGameIndex];
  const targetGame = target?.games[targetGameIndex];

  const requiredFen = useMemo(() => {
    if (!sourceGame || !sourceLeafId) {
      return "";
    }
    const rootChildId = resolveSourceRootChildId(sourceGame, sourceLeafId);
    if (!rootChildId) {
      return "";
    }
    const parentId = sourceGame.nodes[rootChildId]?.parentId;
    if (!parentId) {
      return "";
    }
    return sourceGame.nodes[parentId]?.fen ?? "";
  }, [sourceGame, sourceLeafId]);

  const attachCandidates = useMemo(() => {
    if (!target || !requiredFen) {
      return [];
    }
    return findNodesByFen(target, requiredFen).flatMap((entry) => entry.nodeIds);
  }, [requiredFen, target]);

  const resolvedAttachNodeId = useMemo(() => {
    if (attachNodeId) {
      return attachNodeId;
    }
    if (defaultAttachNodeId) {
      return defaultAttachNodeId;
    }
    const candidate = attachCandidates.find(
      (entry) => entry.gameIndex === targetGameIndex,
    );
    return candidate?.nodeId ?? "";
  }, [
    attachCandidates,
    attachNodeId,
    defaultAttachNodeId,
    targetGameIndex,
  ]);

  const graftPreview = useMemo(() => {
    if (!sourceGame || !targetGame || !sourceLeafId || !resolvedAttachNodeId) {
      return null;
    }
    return checkGraftFenMatch({
      sourceGame,
      sourceLeafNodeId: sourceLeafId,
      targetGame,
      attachAtNodeId: resolvedAttachNodeId,
    });
  }, [resolvedAttachNodeId, sourceGame, sourceLeafId, targetGame]);

  const sanPreview = useMemo(() => {
    if (!sourceGame || !targetGame || !sourceLeafId || !resolvedAttachNodeId) {
      return "";
    }
    return previewCopyLineSan({
      sourceGame,
      sourceLeafNodeId: sourceLeafId,
      targetGame,
      attachAtNodeId: resolvedAttachNodeId,
    });
  }, [resolvedAttachNodeId, sourceGame, sourceLeafId, targetGame]);

  const handleConfirm = () => {
    if (!sourceGame || !targetGame || !sourceLeafId || !resolvedAttachNodeId || !target) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = copyLineToGame({
        sourceGame,
        sourceLeafNodeId: sourceLeafId,
        targetGame,
        attachAtNodeId: resolvedAttachNodeId,
      });

      if (onGraftedInBuilder) {
        onGraftedInBuilder(result.game, resolvedAttachNodeId);
        onComplete();
        return;
      }

      const games = [...target.games];
      games[targetGameIndex] = result.game;
      const updated = updateRepertoire(target.id, { games });
      if (!updated) {
        setError("Failed to save repertoire.");
        setIsSaving(false);
        return;
      }
      onComplete();
      router.push(`/repertoires/${updated.id}/edit`);
    } catch (err) {
      setError(
        err instanceof CopyLineError
          ? err.message
          : err instanceof RepertoireStorageError
            ? err.message
            : "Failed to copy line.",
      );
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="copy-line-title"
    >
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg bg-surface p-4 shadow-xl ring-1 ring-border">
        <h2
          id="copy-line-title"
          className="text-base font-semibold text-foreground"
        >
          Copy line between repertoires
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Graft a line from one repertoire onto a matching position in another.
        </p>

        {step === "source" ? (
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-muted-foreground">
              Source repertoire
              <select
                value={sourceId}
                onChange={(event) => {
                  setSourceId(event.target.value);
                  setSourceGameIndex(0);
                  setSourceLeafId("");
                }}
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

            {source ? (
              <>
                <PgnGameSelector
                  games={source.games}
                  selectedIndex={sourceGameIndex}
                  onSelect={(index) => {
                    setSourceGameIndex(index);
                    setSourceLeafId("");
                  }}
                />
                {sourceGame ? (
                  <PgnLineSearch
                    game={sourceGame}
                    onSelect={setSourceLeafId}
                  />
                ) : null}
              </>
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!sourceLeafId}
                onClick={() => setStep("target")}
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        {step === "target" ? (
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-muted-foreground">
              Target repertoire (created only)
              <select
                value={targetId}
                onChange={(event) => {
                  setTargetId(event.target.value);
                  setTargetGameIndex(0);
                  setAttachNodeId("");
                }}
                className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
              >
                <option value="">Select repertoire…</option>
                {createdTargets.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>

            {target ? (
              <>
                <PgnGameSelector
                  games={target.games}
                  selectedIndex={targetGameIndex}
                  onSelect={(index) => {
                    setTargetGameIndex(index);
                    setAttachNodeId("");
                  }}
                />
                <label className="block text-xs font-medium text-muted-foreground">
                  Attach position
                  <select
                    value={resolvedAttachNodeId}
                    onChange={(event) => setAttachNodeId(event.target.value)}
                    className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
                  >
                    <option value="">Select matching position…</option>
                    {attachCandidates
                      .filter((candidate) => candidate.gameIndex === targetGameIndex)
                      .map((candidate) => {
                        const node = targetGame?.nodes[candidate.nodeId];
                        return (
                          <option key={candidate.nodeId} value={candidate.nodeId}>
                            {node?.pathLabel ?? candidate.nodeId}
                            {node?.san ? ` after ${node.san}` : " (starting position)"}
                          </option>
                        );
                      })}
                  </select>
                </label>
                {graftPreview && !graftPreview.ok ? (
                  <p className="text-sm text-danger">{graftPreview.reason}</p>
                ) : null}
              </>
            ) : null}

            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep("source")}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!resolvedAttachNodeId || !graftPreview?.ok}
                onClick={() => setStep("confirm")}
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                Preview
              </button>
            </div>
          </div>
        ) : null}

        {step === "confirm" ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-background p-3 text-sm ring-1 ring-border">
              <p>
                <span className="font-medium">Line:</span> {sanPreview || "—"}
              </p>
              <p className="mt-1 text-accent">FEN match confirmed.</p>
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep("target")}
                disabled={isSaving}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSaving}
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {isSaving ? "Copying…" : "Copy line"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
