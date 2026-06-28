"use client";

import { useMemo, useState } from "react";

import { EvalBar } from "@/components/engine/EvalBar";
import { useStockfish } from "@/hooks/useStockfish";
import { formatEvalScore, uciToSan } from "@/lib/engine";

interface EnginePanelProps {
  fen: string;
  orientation: "white" | "black";
  className?: string;
}

function statusLabel(
  enabled: boolean,
  status: ReturnType<typeof useStockfish>["status"],
): string {
  if (!enabled) {
    return "Off";
  }
  switch (status) {
    case "loading":
      return "Loading engine…";
    case "analyzing":
      return "Analyzing…";
    case "ready":
      return "Ready";
    case "error":
      return "Unavailable";
    default:
      return "Idle";
  }
}

export function EnginePanel({
  fen,
  orientation,
  className = "",
}: EnginePanelProps) {
  const [enabled, setEnabled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const engine = useStockfish({ fen, enabled });

  const formattedScore = useMemo(() => {
    if (!engine.evaluation) {
      return "—";
    }
    return formatEvalScore(engine.evaluation, orientation);
  }, [engine.evaluation, orientation]);

  const bestMoveLabel = useMemo(() => {
    const bestMove = engine.evaluation?.bestMove ?? engine.evaluation?.pv[0];
    if (!bestMove) {
      return "—";
    }
    return uciToSan(fen, bestMove) ?? bestMove;
  }, [engine.evaluation, fen]);

  const handleToggle = () => {
    setEnabled((current) => !current);
  };

  return (
    <section
      className={`rounded-lg ring-1 ring-border ${className}`}
      aria-label="Engine analysis"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Engine</h3>
          <p className="text-xs text-muted-foreground">
            {statusLabel(enabled, engine.status)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-muted lg:inline-flex"
            aria-expanded={!collapsed}
          >
            {collapsed ? "Show" : "Hide"}
          </button>
          <label className="flex items-center gap-2 text-xs font-medium text-foreground/90">
            <span className="sr-only">Analyze position</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggle}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            Analyze
          </label>
        </div>
      </div>

      {!collapsed ? (
        <div className="space-y-3 border-t border-border/70 px-3 py-3">
          <EvalBar evaluation={engine.evaluation} orientation={orientation} />

          <dl className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Eval</dt>
              <dd className="font-mono text-sm font-semibold text-foreground">
                {formattedScore}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Best</dt>
              <dd className="font-mono text-sm font-semibold text-foreground">
                {bestMoveLabel}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Depth</dt>
              <dd className="font-mono text-sm font-semibold text-foreground">
                {enabled ? `${engine.depth}/${engine.targetDepth}` : "—"}
              </dd>
            </div>
          </dl>

          {engine.error ? (
            <p className="text-xs text-danger">{engine.error}</p>
          ) : null}

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Engine suggestion — may differ from repertoire prep.
          </p>
        </div>
      ) : null}
    </section>
  );
}
