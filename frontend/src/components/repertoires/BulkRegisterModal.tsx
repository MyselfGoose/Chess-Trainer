"use client";

import { useEffect, useMemo, useState } from "react";

import { previewBulkRegister } from "@/lib/repertoires/bulkRegister";

interface BulkRegisterModalProps {
  maxDepth: number;
  currentMaxPly: number;
  registeredLeafIds: string[];
  game: import("@/lib/pgn").StudyGame;
  onConfirm: (maxPly: number) => void;
  onCancel: () => void;
}

export function BulkRegisterModal({
  maxDepth,
  currentMaxPly,
  registeredLeafIds,
  game,
  onConfirm,
  onCancel,
}: BulkRegisterModalProps) {
  const [maxPly, setMaxPly] = useState(
    Math.min(Math.max(currentMaxPly, 1), maxDepth || 8),
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const preview = useMemo(
    () => previewBulkRegister(game, registeredLeafIds, maxPly),
    [game, maxPly, registeredLeafIds],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-register-title"
    >
      <div className="w-full max-w-md rounded-lg bg-surface p-4 shadow-xl ring-1 ring-border">
        <h2
          id="bulk-register-title"
          className="text-base font-semibold text-foreground"
        >
          Bulk register lines
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Register all leaf lines at depth ≤ N plies.
        </p>

        <label className="mt-4 block text-xs font-medium text-muted-foreground">
          Max ply depth
          <input
            type="number"
            min={1}
            max={Math.max(maxDepth, 1)}
            value={maxPly}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value)) {
                setMaxPly(value);
              }
            }}
            className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
          />
        </label>

        <div className="mt-4 rounded-lg bg-background p-3 text-sm text-foreground/90 ring-1 ring-border">
          <p>
            Will register{" "}
            <span className="font-semibold">{preview.toRegister.length}</span>{" "}
            {preview.toRegister.length === 1 ? "line" : "lines"}.
          </p>
          {preview.alreadyRegistered.length > 0 ? (
            <p className="mt-1 text-muted-foreground">
              {preview.alreadyRegistered.length} already registered.
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(maxPly)}
            disabled={preview.toRegister.length === 0}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Register {preview.toRegister.length} lines
          </button>
        </div>
      </div>
    </div>
  );
}
