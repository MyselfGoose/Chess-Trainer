"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ShortcutGroup {
  title: string;
  items: { keys: string; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Global",
    items: [{ keys: "?", description: "Show this shortcuts dialog" }],
  },
  {
    title: "Study & Builder",
    items: [
      { keys: "←", description: "Back one move" },
      { keys: "→", description: "Forward one move (follows tip line)" },
      { keys: "↑", description: "Jump to start" },
      { keys: "↓", description: "Jump to tip / latest on line" },
      { keys: "Scroll on board", description: "Step through moves" },
    ],
  },
  {
    title: "Board annotations",
    items: [
      { keys: "Right-drag", description: "Draw arrow" },
      { keys: "Left-click", description: "Clear user annotations" },
      { keys: "Two-finger drag", description: "Draw arrow (touch)" },
    ],
  },
  {
    title: "Training",
    items: [
      { keys: "—", description: "Live drill — no move navigation shortcuts" },
    ],
  },
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function canRestoreFocus(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  if (element === document.body || element === document.documentElement) {
    return false;
  }
  if (!document.contains(element)) {
    return false;
  }
  if (element.hasAttribute("disabled")) {
    return false;
  }
  return true;
}

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const openDialog = useCallback(() => {
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (isEditableTarget(event.target)) {
          return;
        }
        event.preventDefault();
        if (open) {
          close();
        } else {
          openDialog();
        }
        return;
      }
      if (event.key === "Escape" && open) {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, open, openDialog]);

  useEffect(() => {
    if (!open) {
      const restoreTarget = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (!canRestoreFocus(restoreTarget)) {
        return;
      }
      const frame = window.requestAnimationFrame(() => {
        try {
          restoreTarget.focus({ preventScroll: true });
        } catch {
          // Ignore focus failures on detached or non-focusable nodes.
        }
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={close}
      role="presentation"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl ring-1 ring-zinc-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-zinc-900">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100"
          >
            Esc
          </button>
        </div>
        <div className="mt-4 space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="text-sm font-semibold text-zinc-700">{group.title}</h3>
              <dl className="mt-2 space-y-2">
                {group.items.map((item) => (
                  <div key={item.keys} className="flex justify-between gap-4 text-sm">
                    <dt className="font-mono text-zinc-500">{item.keys}</dt>
                    <dd className="text-right text-zinc-700">{item.description}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
