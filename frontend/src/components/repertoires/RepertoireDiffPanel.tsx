"use client";

import { useCallback, useMemo, useState } from "react";

import {
  diffRepertoires,
  getRepertoire,
  hasRepertoireDiff,
  listRepertoires,
  listSnapshots,
  loadSnapshot,
  deleteSnapshot,
  saveSnapshot,
  SnapshotStorageError,
  type Repertoire,
  type RepertoireDiff,
} from "@/lib/repertoires";

type CompareSourceKind = "snapshot" | "fork-parent" | "repertoire";

interface RepertoireDiffPanelProps {
  repertoire: Repertoire;
}

function DiffListSection({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-md bg-background px-2 py-1 font-mono text-xs text-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentChangesSection({
  changes,
}: {
  changes: RepertoireDiff["changedComments"];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Changed comments ({changes.length})
      </h3>
      {changes.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No comment changes.</p>
      ) : (
        <ul className="mt-2 max-h-48 space-y-3 overflow-y-auto">
          {changes.map((change) => (
            <li
              key={change.pathKey}
              className="rounded-md border border-border bg-background p-2 text-xs"
            >
              <p className="font-mono font-medium text-foreground">{change.label}</p>
              <p className="mt-1 text-muted-foreground">
                <span className="font-medium">Before:</span>{" "}
                {change.before || "(empty)"}
              </p>
              <p className="mt-1 text-muted-foreground">
                <span className="font-medium">After:</span>{" "}
                {change.after || "(empty)"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SanChangesSection({
  changes,
}: {
  changes: RepertoireDiff["sanPathChanges"];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        SAN path changes ({changes.length})
      </h3>
      {changes.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No divergent SAN paths.</p>
      ) : (
        <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
          {changes.map((change) => (
            <li
              key={`${change.pathKey}:${change.before}:${change.after}`}
              className="rounded-md bg-background px-2 py-1 text-xs"
            >
              <p className="font-mono font-medium text-foreground">{change.label}</p>
              <p className="mt-1 font-mono text-muted-foreground">
                {change.before} → {change.after}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RepertoireDiffPanel({ repertoire }: RepertoireDiffPanelProps) {
  const [snapshotVersion, setSnapshotVersion] = useState(0);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [sourceKind, setSourceKind] = useState<CompareSourceKind>("snapshot");
  const [sourceId, setSourceId] = useState("");
  const [diff, setDiff] = useState<RepertoireDiff | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  const forkParentId = repertoire.meta.forkedFromId;
  const forkParentAvailable = Boolean(
    forkParentId && getRepertoire(forkParentId),
  );

  const otherRepertoires = useMemo(
    () => listRepertoires().filter((entry) => entry.id !== repertoire.id),
    [repertoire.id],
  );

  const refreshSnapshots = useCallback(() => {
    setSnapshotVersion((version) => version + 1);
  }, []);

  void snapshotVersion;
  const snapshots = listSnapshots(repertoire.id);

  const openCompare = () => {
    if (forkParentAvailable) {
      setSourceKind("fork-parent");
      setSourceId("");
    } else if (snapshots.length > 0) {
      setSourceKind("snapshot");
      setSourceId(snapshots[0]?.snapshotId ?? "");
    } else if (otherRepertoires.length > 0) {
      setSourceKind("repertoire");
      setSourceId(otherRepertoires[0]?.id ?? "");
    }
    setCompareError(null);
    setDiff(null);
    setCompareOpen(true);
  };

  const handleSaveSnapshot = () => {
    setSaveError(null);
    try {
      saveSnapshot(repertoire, snapshotLabel || undefined);
      setSnapshotLabel("");
      refreshSnapshots();
    } catch (error) {
      setSaveError(
        error instanceof SnapshotStorageError
          ? error.message
          : "Failed to save snapshot.",
      );
    }
  };

  const resolveSourceRepertoire = (): Repertoire | null => {
    if (sourceKind === "fork-parent" && forkParentId) {
      return getRepertoire(forkParentId);
    }
    if (sourceKind === "snapshot" && sourceId) {
      return loadSnapshot(sourceId)?.repertoire ?? null;
    }
    if (sourceKind === "repertoire" && sourceId) {
      return getRepertoire(sourceId);
    }
    return null;
  };

  const handleCompare = () => {
    setCompareError(null);
    const source = resolveSourceRepertoire();
    if (!source) {
      setCompareError("Select a valid comparison source.");
      setDiff(null);
      return;
    }
    setDiff(diffRepertoires(source, repertoire));
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    deleteSnapshot(snapshotId);
    if (sourceKind === "snapshot" && sourceId === snapshotId) {
      setSourceId("");
    }
    refreshSnapshots();
  };

  const canCompare =
    sourceKind === "fork-parent"
      ? forkParentAvailable
      : sourceKind === "snapshot"
        ? snapshots.some((entry) => entry.snapshotId === sourceId)
        : otherRepertoires.some((entry) => entry.id === sourceId);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Repertoire compare
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Save snapshots and compare against a previous version, fork parent,
            or another repertoire.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (compareOpen) {
                setCompareOpen(false);
              } else {
                openCompare();
              }
            }}
            className="min-h-9 rounded-lg bg-surface-muted px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-background"
          >
            {compareOpen ? "Hide compare" : "Compare"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="min-w-[12rem] flex-1 text-xs font-medium text-muted-foreground">
          Snapshot label (optional)
          <input
            type="text"
            value={snapshotLabel}
            onChange={(event) => setSnapshotLabel(event.target.value)}
            placeholder="Before tournament changes"
            className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={handleSaveSnapshot}
          className="min-h-9 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
        >
          Save snapshot
        </button>
      </div>

      {saveError ? (
        <p className="mt-2 text-sm text-danger">{saveError}</p>
      ) : null}

      {snapshots.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Saved snapshots
          </h3>
          <ul className="mt-2 space-y-2">
            {snapshots.map((snapshot) => (
              <li
                key={snapshot.snapshotId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{snapshot.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(snapshot.savedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSnapshot(snapshot.snapshotId)}
                  className="text-xs font-medium text-danger hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          No snapshots yet. Save one before making major edits.
        </p>
      )}

      {compareOpen ? (
        <div className="mt-6 space-y-4 border-t border-border pt-4">
          <fieldset>
            <legend className="text-xs font-medium text-muted-foreground">
              Compare source (before)
            </legend>
            <div className="mt-2 space-y-2 text-sm">
              {forkParentAvailable ? (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="compare-source"
                    checked={sourceKind === "fork-parent"}
                    onChange={() => setSourceKind("fork-parent")}
                  />
                  Fork parent
                </label>
              ) : null}
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="compare-source"
                  checked={sourceKind === "snapshot"}
                  onChange={() => {
                    setSourceKind("snapshot");
                    if (!sourceId && snapshots[0]) {
                      setSourceId(snapshots[0].snapshotId);
                    }
                  }}
                  disabled={snapshots.length === 0}
                />
                Snapshot
              </label>
              {sourceKind === "snapshot" && snapshots.length > 0 ? (
                <select
                  value={sourceId}
                  onChange={(event) => setSourceId(event.target.value)}
                  className="ml-6 w-full max-w-md rounded-md border border-border px-2 py-1.5 text-sm"
                >
                  {snapshots.map((snapshot) => (
                    <option key={snapshot.snapshotId} value={snapshot.snapshotId}>
                      {snapshot.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="compare-source"
                  checked={sourceKind === "repertoire"}
                  onChange={() => {
                    setSourceKind("repertoire");
                    if (!sourceId && otherRepertoires[0]) {
                      setSourceId(otherRepertoires[0].id);
                    }
                  }}
                  disabled={otherRepertoires.length === 0}
                />
                Another repertoire
              </label>
              {sourceKind === "repertoire" && otherRepertoires.length > 0 ? (
                <select
                  value={sourceId}
                  onChange={(event) => setSourceId(event.target.value)}
                  className="ml-6 w-full max-w-md rounded-md border border-border px-2 py-1.5 text-sm"
                >
                  {otherRepertoires.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={handleCompare}
            disabled={!canCompare}
            className="min-h-9 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            Run comparison
          </button>

          {compareError ? (
            <p className="text-sm text-danger">{compareError}</p>
          ) : null}

          {diff ? (
            <div className="space-y-4 rounded-lg border border-border bg-background p-4">
              {!hasRepertoireDiff(diff) ? (
                <p className="text-sm text-muted-foreground">No differences.</p>
              ) : (
                <>
                  <DiffListSection
                    title="Added lines"
                    items={diff.addedLines}
                    emptyLabel="No added lines."
                  />
                  <DiffListSection
                    title="Removed lines"
                    items={diff.removedLines}
                    emptyLabel="No removed lines."
                  />
                  <CommentChangesSection changes={diff.changedComments} />
                  <SanChangesSection changes={diff.sanPathChanges} />
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
