import type { BoardOrientation, StudySessionState, StudySessionStateV1 } from "./types";
import { studySessionKey } from "./types";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function isBoardOrientation(value: unknown): value is BoardOrientation {
  return value === "white" || value === "black";
}

function isStudySessionStateV1(value: unknown): value is StudySessionStateV1 {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.currentNodeId === "string" &&
    typeof record.selectedGameIndex === "number" &&
    record.version === undefined
  );
}

function isStudySessionStateV2(value: unknown): value is StudySessionState {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.version === 2 &&
    typeof record.currentNodeId === "string" &&
    typeof record.selectedGameIndex === "number" &&
    typeof record.tipNodeId === "string" &&
    isBoardOrientation(record.orientation)
  );
}

function migrateV1ToV2(v1: StudySessionStateV1): StudySessionState {
  return {
    version: 2,
    currentNodeId: v1.currentNodeId,
    selectedGameIndex: v1.selectedGameIndex,
    tipNodeId: v1.currentNodeId,
    orientation: "white",
  };
}

export function loadStudySession(
  repertoireId: string,
): StudySessionState | null {
  if (!isBrowser()) {
    return null;
  }
  const raw = sessionStorage.getItem(studySessionKey(repertoireId));
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isStudySessionStateV2(parsed)) {
      return parsed;
    }
    if (isStudySessionStateV1(parsed)) {
      return migrateV1ToV2(parsed);
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStudySession(
  repertoireId: string,
  state: StudySessionState,
): void {
  if (!isBrowser()) {
    return;
  }
  sessionStorage.setItem(studySessionKey(repertoireId), JSON.stringify(state));
}

export function clearStudySession(repertoireId: string): void {
  if (!isBrowser()) {
    return;
  }
  sessionStorage.removeItem(studySessionKey(repertoireId));
}

export function createDefaultStudySession(
  currentNodeId: string,
  selectedGameIndex: number,
): StudySessionState {
  return {
    version: 2,
    currentNodeId,
    selectedGameIndex,
    tipNodeId: currentNodeId,
    orientation: "white",
  };
}
