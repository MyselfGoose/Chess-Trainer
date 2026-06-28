"use client";

import { useSyncExternalStore } from "react";

import { evalBarPercent } from "@/lib/engine";
import type { EngineEvaluation } from "@/lib/engine";

interface EvalBarProps {
  evaluation: EngineEvaluation | null;
  orientation: "white" | "black";
}

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function EvalBar({ evaluation, orientation }: EvalBarProps) {
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  const whitePercent = evaluation
    ? evalBarPercent(evaluation, orientation)
    : 50;

  return (
    <div
      className="relative h-3 overflow-hidden rounded-full bg-neutral-800 ring-1 ring-border"
      role="meter"
      aria-label="Engine evaluation bar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(whitePercent)}
    >
      <div
        className={`absolute inset-y-0 left-0 bg-neutral-100 ${reduceMotion ? "" : "transition-[width] duration-300 ease-out"}`}
        style={{ width: `${whitePercent}%` }}
      />
    </div>
  );
}
