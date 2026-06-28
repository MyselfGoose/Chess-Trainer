"use client";

import { useRef, useState } from "react";

import {
  downloadBackupFile,
  importBackup,
  type ImportBackupResult,
} from "@/lib/repertoires/backup";
import {
  computeStorageStats,
  formatBytes,
} from "@/lib/repertoires/storageStats";

export function RepertoireBackupSection() {
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [pendingImport, setPendingImport] = useState<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = computeStorageStats();
  const catalogPercent =
    stats.catalogLimitBytes > 0
      ? (stats.catalogBytes / stats.catalogLimitBytes) * 100
      : 0;
  const barColor =
    catalogPercent > 95
      ? "bg-red-600"
      : catalogPercent > 80
        ? "bg-amber-500"
        : "bg-accent";

  const handleFile = async (file: File) => {
    setImportError(null);
    setImportSuccess(null);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      setPendingImport(parsed);
      setConfirmText("");
    } catch {
      setImportError("Invalid JSON file.");
    }
  };

  const confirmImport = () => {
    if (!pendingImport) {
      return;
    }
    if (confirmText !== "DELETE") {
      setImportError('Type DELETE to confirm full restore.');
      return;
    }
    const result: ImportBackupResult = importBackup(pendingImport);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    setImportSuccess(
      `Restored ${result.counts.repertoires} repertoires, ${result.counts.history} sessions, ${result.counts.mastery} mastery records.`,
    );
    setPendingImport(null);
    setConfirmText("");
    window.location.reload();
  };

  return (
    <section className="mt-10 rounded-xl bg-surface p-6 ring-1 ring-border">
      <h2 className="text-lg font-semibold text-foreground">Backup & storage</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Export all RepertoireLab data or restore from a backup file.
      </p>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Catalog usage</span>
          <span>
            {formatBytes(stats.catalogBytes)} / {formatBytes(stats.catalogLimitBytes)}
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full ${barColor}`}
            style={{ width: `${Math.min(catalogPercent, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Total chess:* storage: {formatBytes(stats.totalBytes)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => downloadBackupFile()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
        >
          Export backup
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-border-strong"
        >
          Import backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
          }}
        />
      </div>

      {importError ? (
        <p className="mt-3 text-sm text-danger">{importError}</p>
      ) : null}
      {importSuccess ? (
        <p className="mt-3 text-sm text-accent">{importSuccess}</p>
      ) : null}

      {pendingImport ? (
        <div className="mt-4 rounded-lg bg-warning-muted p-4 ring-1 ring-warning/30">
          <p className="text-sm text-warning-foreground">
            Import will replace all local data. Type DELETE to confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder="DELETE"
            className="mt-2 w-full rounded-md border border-amber-300 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirmImport}
              className="rounded-md bg-warning px-3 py-1.5 text-sm font-medium text-white"
            >
              Confirm import
            </button>
            <button
              type="button"
              onClick={() => setPendingImport(null)}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
