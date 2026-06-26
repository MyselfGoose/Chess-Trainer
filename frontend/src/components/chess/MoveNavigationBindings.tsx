"use client";

import { type RefObject } from "react";

import {
  useMoveNavigation,
  type MoveNavigationHandlers,
} from "@/hooks/useMoveNavigation";

interface MoveNavigationBindingsProps {
  navigation: MoveNavigationHandlers;
  enabled?: boolean;
  wheelTargetRef?: RefObject<HTMLElement | null>;
}

export function MoveNavigationBindings({
  navigation,
  enabled = true,
  wheelTargetRef,
}: MoveNavigationBindingsProps) {
  useMoveNavigation({
    enabled,
    wheelTargetRef,
    ...navigation,
  });
  return null;
}

export function MoveNavigationHints() {
  return (
    <p className="mt-2 text-center text-xs text-zinc-500">
      <span className="font-mono">←</span> back ·{" "}
      <span className="font-mono">→</span> forward ·{" "}
      <span className="font-mono">↑</span> start ·{" "}
      <span className="font-mono">↓</span> latest · scroll on board
    </p>
  );
}
