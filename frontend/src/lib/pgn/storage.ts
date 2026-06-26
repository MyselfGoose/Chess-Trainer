import type { StoredPgnStudy } from "./types";
import { MAX_PGN_BYTES, PGN_STORAGE_KEY } from "./types";

export function saveStudy(study: StoredPgnStudy): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(PGN_STORAGE_KEY, JSON.stringify(study));
}

export function loadStudy(): StoredPgnStudy | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(PGN_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredPgnStudy;
  } catch {
    return null;
  }
}

export function clearStudy(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(PGN_STORAGE_KEY);
}

export function validatePgnSize(bytes: number): string | null {
  if (bytes > MAX_PGN_BYTES) {
    return `PGN file is too large (${Math.round(bytes / 1024)}KB). Maximum size is ${MAX_PGN_BYTES / 1024 / 1024}MB.`;
  }
  return null;
}
