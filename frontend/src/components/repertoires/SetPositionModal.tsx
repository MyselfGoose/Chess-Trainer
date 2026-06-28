"use client";

import { useEffect, useState } from "react";

interface SetPositionModalProps {
  hasMoves: boolean;
  onConfirm: (fen: string, force: boolean) => void;
  onCancel: () => void;
}

export function SetPositionModal({
  hasMoves,
  onConfirm,
  onCancel,
}: SetPositionModalProps) {
  const [fen, setFen] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleSubmit = () => {
    if (!fen.trim()) {
      setError("Enter a FEN string.");
      return;
    }
    if (hasMoves && !confirmReset) {
      setError("Confirm that you want to clear existing moves.");
      return;
    }
    setError(null);
    onConfirm(fen.trim(), hasMoves);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="set-position-title"
    >
      <div className="w-full max-w-md rounded-lg bg-surface p-4 shadow-xl ring-1 ring-border">
        <h2
          id="set-position-title"
          className="text-base font-semibold text-foreground"
        >
          Set position (FEN)
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start building from a custom position instead of the standard start.
        </p>

        <label className="mt-4 block text-xs font-medium text-muted-foreground">
          FEN
          <textarea
            value={fen}
            onChange={(event) => {
              setFen(event.target.value);
              setError(null);
            }}
            rows={3}
            placeholder="Paste a FEN string…"
            className="mt-1 w-full rounded-md border border-border px-2 py-1.5 font-mono text-sm"
          />
        </label>

        {hasMoves ? (
          <label className="mt-3 flex items-start gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              checked={confirmReset}
              onChange={(event) => {
                setConfirmReset(event.target.checked);
                setError(null);
              }}
              className="mt-0.5"
            />
            Clear all existing moves and reset the tree
          </label>
        ) : null}

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

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
            onClick={handleSubmit}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Set position
          </button>
        </div>
      </div>
    </div>
  );
}
