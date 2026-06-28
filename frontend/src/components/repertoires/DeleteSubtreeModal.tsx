"use client";

import { useEffect } from "react";

import type { PruneImpact } from "@/lib/repertoires";

interface DeleteSubtreeModalProps {
  impact: PruneImpact;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteSubtreeModal({
  impact,
  onConfirm,
  onCancel,
}: DeleteSubtreeModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-subtree-title"
    >
      <div className="w-full max-w-md rounded-lg bg-surface p-4 shadow-xl ring-1 ring-border">
        <h2
          id="delete-subtree-title"
          className="text-base font-semibold text-foreground"
        >
          Delete from here?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Deletes <strong>{impact.positionCount}</strong> position
          {impact.positionCount === 1 ? "" : "s"} and{" "}
          <strong>{impact.registeredLineCount}</strong> registered line
          {impact.registeredLineCount === 1 ? "" : "s"}. This cannot be undone
          except with Undo edit (Ctrl+Z).
        </p>
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
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete branch
          </button>
        </div>
      </div>
    </div>
  );
}
