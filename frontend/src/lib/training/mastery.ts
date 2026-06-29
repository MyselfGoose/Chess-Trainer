export type MasteryLevel = "new" | "learning" | "review" | "mastered";

export interface LineMastery {
  lineId: string;
  repertoireId: string;
  level: MasteryLevel;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueAt: string;
  lastResult: "pass" | "fail" | null;
  lastTrainedAt: string | null;
  passCount: number;
  failCount: number;
  attemptCount: number;
  failedAtPly?: number;
  failedAtSan?: string;
}

export interface LineResultMetadata {
  failedAtPly?: number;
  failedAtSan?: string;
}

import {
  readStorageItem,
  writeStorageItem,
} from "@/lib/storage/migrate";

import { qualityFromPass, scheduleAfterReview } from "./scheduler";

export const LINE_MASTERY_KEY = "chess:line-mastery";

const DEFAULT_EASE_FACTOR = 2.5;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function utcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysToUtcDate(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateString(date);
}

function isMasteryLevel(value: unknown): value is MasteryLevel {
  return (
    value === "new" ||
    value === "learning" ||
    value === "review" ||
    value === "mastered"
  );
}

function isLineMastery(value: unknown): value is LineMastery {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.lineId === "string" &&
    typeof record.repertoireId === "string" &&
    isMasteryLevel(record.level) &&
    typeof record.easeFactor === "number" &&
    typeof record.intervalDays === "number" &&
    typeof record.repetitions === "number" &&
    typeof record.dueAt === "string" &&
    (record.lastResult === "pass" ||
      record.lastResult === "fail" ||
      record.lastResult === null) &&
    (record.lastTrainedAt === null ||
      typeof record.lastTrainedAt === "string") &&
    typeof record.passCount === "number" &&
    typeof record.failCount === "number" &&
    typeof record.attemptCount === "number" &&
    (record.failedAtPly === undefined ||
      typeof record.failedAtPly === "number") &&
    (record.failedAtSan === undefined ||
      typeof record.failedAtSan === "string")
  );
}

function readAllMastery(): Record<string, LineMastery> {
  if (!isBrowser()) {
    return {};
  }
  const raw = readStorageItem(LINE_MASTERY_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const result: Record<string, LineMastery> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isLineMastery(value)) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function writeAllMastery(data: Record<string, LineMastery>): void {
  if (!isBrowser()) {
    return;
  }
  writeStorageItem(LINE_MASTERY_KEY, JSON.stringify(data));
}

export function createDefaultMastery(
  lineId: string,
  repertoireId: string,
): LineMastery {
  const today = utcDateString();
  return {
    lineId,
    repertoireId,
    level: "new",
    easeFactor: DEFAULT_EASE_FACTOR,
    intervalDays: 0,
    repetitions: 0,
    dueAt: today,
    lastResult: null,
    lastTrainedAt: null,
    passCount: 0,
    failCount: 0,
    attemptCount: 0,
  };
}

export function getMastery(lineId: string): LineMastery | null {
  return readAllMastery()[lineId] ?? null;
}

export function upsertMastery(mastery: LineMastery): void {
  const all = readAllMastery();
  all[mastery.lineId] = mastery;
  writeAllMastery(all);
}

export function getMasteryForRepertoire(
  repertoireId: string,
): LineMastery[] {
  return Object.values(readAllMastery()).filter(
    (entry) => entry.repertoireId === repertoireId,
  );
}

export function getDueLines(
  repertoireId: string,
  today: string = utcDateString(),
): LineMastery[] {
  return getMasteryForRepertoire(repertoireId).filter(
    (entry) => entry.dueAt <= today,
  );
}

export function recordLineResult(
  repertoireId: string,
  lineId: string,
  passed: boolean,
  trainedAt: string = new Date().toISOString(),
  metadata?: LineResultMetadata,
): LineMastery {
  const existing = getMastery(lineId) ?? createDefaultMastery(lineId, repertoireId);

  const withCounts: LineMastery = {
    ...existing,
    attemptCount: existing.attemptCount + 1,
    lastTrainedAt: trainedAt,
    lastResult: passed ? "pass" : "fail",
    passCount: passed ? existing.passCount + 1 : existing.passCount,
    failCount: passed ? existing.failCount : existing.failCount + 1,
    failedAtPly: passed
      ? undefined
      : metadata?.failedAtPly ?? existing.failedAtPly,
    failedAtSan: passed
      ? undefined
      : metadata?.failedAtSan ?? existing.failedAtSan,
  };

  const scheduled = scheduleAfterReview(
    withCounts,
    qualityFromPass(passed),
    utcDateString(new Date(trainedAt)),
  );
  upsertMastery(scheduled);
  return scheduled;
}

export function getAllMasteryRecords(): Record<string, LineMastery> {
  return readAllMastery();
}

export function replaceAllMastery(data: Record<string, LineMastery>): void {
  writeAllMastery(data);
}
