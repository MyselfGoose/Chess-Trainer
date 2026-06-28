"use client";

import { useState } from "react";

import { EnginePanel } from "@/components/engine/EnginePanel";

interface EnginePanelDrawerProps {
  fen: string;
  orientation: "white" | "black";
}

export function EnginePanelDrawer({
  fen,
  orientation,
}: EnginePanelDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-md bg-surface px-3 py-1.5 text-sm font-medium text-foreground/90 ring-1 ring-border transition hover:bg-background"
        aria-expanded={open}
      >
        Engine
      </button>

      {open ? (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[55dvh] overflow-y-auto border-t border-border bg-surface p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Engine analysis
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-surface-muted"
            >
              Close
            </button>
          </div>
          <EnginePanel fen={fen} orientation={orientation} />
        </div>
      ) : null}
    </div>
  );
}
