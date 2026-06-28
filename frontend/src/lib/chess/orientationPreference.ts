import type { BoardOrientation } from "@/lib/repertoires/types";

export const BUILDER_ORIENTATION_KEY = "chess:builder-orientation";
export const BOARD_ORIENTATION_KEY = "chess:board-orientation";
export const TRAINING_ORIENTATION_KEY = "chess:training-orientation";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function isBoardOrientation(value: unknown): value is BoardOrientation {
  return value === "white" || value === "black";
}

export function loadOrientationPreference(key: string): BoardOrientation {
  if (!isBrowser()) {
    return "white";
  }
  const raw = localStorage.getItem(key);
  return isBoardOrientation(raw) ? raw : "white";
}

export function loadOrientationPreferenceOrDefault(
  key: string,
  defaultOrientation: BoardOrientation,
): BoardOrientation {
  if (!isBrowser()) {
    return defaultOrientation;
  }
  const raw = localStorage.getItem(key);
  return isBoardOrientation(raw) ? raw : defaultOrientation;
}

export function saveOrientationPreference(
  key: string,
  orientation: BoardOrientation,
): void {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(key, orientation);
}

export function trainingOrientationKey(color: BoardOrientation): string {
  return `${TRAINING_ORIENTATION_KEY}:${color}`;
}

export function toggleOrientation(
  orientation: BoardOrientation,
): BoardOrientation {
  return orientation === "white" ? "black" : "white";
}
