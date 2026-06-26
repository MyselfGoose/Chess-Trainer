import type { StudySessionState } from "./types";
import { studySessionKey } from "./types";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
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
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as StudySessionState).currentNodeId === "string" &&
      typeof (parsed as StudySessionState).selectedGameIndex === "number"
    ) {
      return parsed as StudySessionState;
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
