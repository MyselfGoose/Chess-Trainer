"use client";

import { useEffect, type RefObject } from "react";

import { shouldIgnoreMoveNavigationKey } from "@/lib/navigation/keyboard";

export interface MoveNavigationHandlers {
  goBack: () => void;
  goForward: () => void;
  goToStart: () => void;
  goToEnd: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  canGoToStart: boolean;
  canGoToEnd: boolean;
}

interface UseMoveNavigationOptions extends MoveNavigationHandlers {
  enabled?: boolean;
  wheelTargetRef?: RefObject<HTMLElement | null>;
}

const WHEEL_THRESHOLD = 40;

export function useMoveNavigation({
  enabled = true,
  wheelTargetRef,
  goBack,
  goForward,
  goToStart,
  goToEnd,
  canGoBack,
  canGoForward,
  canGoToStart,
  canGoToEnd,
}: UseMoveNavigationOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (shouldIgnoreMoveNavigationKey(event.target)) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          if (!canGoBack) {
            return;
          }
          event.preventDefault();
          goBack();
          break;
        case "ArrowRight":
          if (!canGoForward) {
            return;
          }
          event.preventDefault();
          goForward();
          break;
        case "ArrowUp":
          if (!canGoToStart) {
            return;
          }
          event.preventDefault();
          goToStart();
          break;
        case "ArrowDown":
          if (!canGoToEnd) {
            return;
          }
          event.preventDefault();
          goToEnd();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canGoBack,
    canGoForward,
    canGoToEnd,
    canGoToStart,
    enabled,
    goBack,
    goForward,
    goToEnd,
    goToStart,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const element = wheelTargetRef?.current;
    if (!element) {
      return;
    }

    let accumulatedDelta = 0;

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        return;
      }

      accumulatedDelta += event.deltaY;

      if (Math.abs(accumulatedDelta) < WHEEL_THRESHOLD) {
        return;
      }

      if (accumulatedDelta > 0) {
        if (!canGoForward) {
          accumulatedDelta = 0;
          return;
        }
        event.preventDefault();
        goForward();
      } else {
        if (!canGoBack) {
          accumulatedDelta = 0;
          return;
        }
        event.preventDefault();
        goBack();
      }

      accumulatedDelta = 0;
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [
    canGoBack,
    canGoForward,
    enabled,
    goBack,
    goForward,
    wheelTargetRef,
  ]);
}
