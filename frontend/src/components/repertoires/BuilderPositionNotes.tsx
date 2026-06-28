"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { StudyNode } from "@/lib/pgn";

interface BuilderPositionNotesProps {
  currentNode: StudyNode | undefined;
  isAtRoot: boolean;
  hasUnsavedAnnotations: boolean;
  onSaveComment: (text: string) => void;
  onSaveAnnotations: () => void;
}

type SaveStatus = "idle" | "pending" | "saved";

export function BuilderPositionNotes({
  currentNode,
  isAtRoot,
  hasUnsavedAnnotations,
  onSaveComment,
  onSaveAnnotations,
}: BuilderPositionNotesProps) {
  const [comment, setComment] = useState(currentNode?.comment ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodeIdRef = useRef(currentNode?.id);

  useEffect(() => {
    if (nodeIdRef.current !== currentNode?.id) {
      nodeIdRef.current = currentNode?.id;
      setComment(currentNode?.comment ?? "");
      setSaveStatus("idle");
    }
  }, [currentNode?.comment, currentNode?.id]);

  const scheduleSave = useCallback(
    (text: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setSaveStatus("pending");
      debounceRef.current = setTimeout(() => {
        onSaveComment(text);
        setSaveStatus("saved");
      }, 500);
    },
    [onSaveComment],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (isAtRoot) {
    return (
      <div className="rounded-lg bg-background p-3 ring-1 ring-border">
        <p className="text-sm text-muted-foreground">
          Play a move to add position notes and arrows.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-background p-3 ring-1 ring-border">
      <label className="text-xs font-medium text-muted-foreground">
        Position notes
      </label>
      <textarea
        value={comment}
        onChange={(event) => {
          const next = event.target.value;
          setComment(next);
          scheduleSave(next);
        }}
        rows={3}
        className="mt-2 w-full resize-y rounded-md border border-border px-2 py-1.5 text-sm text-foreground"
        placeholder="Add a comment for this position…"
        aria-label="Position comment"
      />
      <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
        {saveStatus === "pending"
          ? "Saving comment…"
          : saveStatus === "saved"
            ? "Comment saved."
            : "Comments auto-save after you pause typing."}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Draw on the board, then save. Session drawings are not stored until
        saved.
      </p>
      <button
        type="button"
        onClick={onSaveAnnotations}
        disabled={!hasUnsavedAnnotations}
        className="mt-2 w-full rounded-md bg-surface-muted px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
      >
        Save arrows to position
      </button>
    </div>
  );
}
