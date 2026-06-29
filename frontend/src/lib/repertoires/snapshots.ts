import { isValidRepertoire, migrateRepertoire } from "./meta";
import type { Repertoire } from "./types";

export const SNAPSHOT_STORAGE_PREFIX = "chess:repertoire-snapshot:";
export const MAX_SNAPSHOTS_PER_REPERTOIRE = 5;

export interface RepertoireSnapshot {
  snapshotId: string;
  repertoireId: string;
  savedAt: string;
  label: string;
  repertoire: Repertoire;
}

export interface SnapshotSummary {
  snapshotId: string;
  repertoireId: string;
  savedAt: string;
  label: string;
}

export class SnapshotStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnapshotStorageError";
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

let snapshotSaveSequence = 0;

function nextSnapshotSortKey(): string {
  snapshotSaveSequence += 1;
  return `${Date.now().toString().padStart(16, "0")}-${snapshotSaveSequence.toString().padStart(8, "0")}`;
}

function snapshotStorageKey(repertoireId: string, timestamp: string): string {
  return `${SNAPSHOT_STORAGE_PREFIX}${repertoireId}:${timestamp}`;
}

function parseSnapshotId(snapshotId: string): { repertoireId: string; timestamp: string } | null {
  if (!snapshotId.startsWith(SNAPSHOT_STORAGE_PREFIX)) {
    return null;
  }
  const remainder = snapshotId.slice(SNAPSHOT_STORAGE_PREFIX.length);
  const separator = remainder.indexOf(":");
  if (separator === -1) {
    return null;
  }
  return {
    repertoireId: remainder.slice(0, separator),
    timestamp: remainder.slice(separator + 1),
  };
}

export function isValidRepertoireSnapshot(value: unknown): value is RepertoireSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.snapshotId !== "string" ||
    typeof record.repertoireId !== "string" ||
    typeof record.savedAt !== "string" ||
    typeof record.label !== "string"
  ) {
    return false;
  }
  const migrated = migrateRepertoire(record.repertoire);
  return migrated !== null && isValidRepertoire(migrated);
}

function readSnapshot(key: string): RepertoireSnapshot | null {
  if (!isBrowser()) {
    return null;
  }
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidRepertoireSnapshot(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: RepertoireSnapshot): void {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(snapshot.snapshotId, JSON.stringify(snapshot));
}

function listSnapshotKeys(repertoireId: string): string[] {
  if (!isBrowser()) {
    return [];
  }
  const prefix = `${SNAPSHOT_STORAGE_PREFIX}${repertoireId}:`;
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix)) {
      keys.push(key);
    }
  }
  return keys;
}

export function listSnapshots(repertoireId: string): SnapshotSummary[] {
  return listSnapshotKeys(repertoireId)
    .map((key) => readSnapshot(key))
    .filter((snapshot): snapshot is RepertoireSnapshot => snapshot !== null)
    .map((snapshot) => ({
      snapshotId: snapshot.snapshotId,
      repertoireId: snapshot.repertoireId,
      savedAt: snapshot.savedAt,
      label: snapshot.label,
    }))
    .sort((a, b) => {
      const tsA = parseSnapshotId(a.snapshotId)?.timestamp ?? "";
      const tsB = parseSnapshotId(b.snapshotId)?.timestamp ?? "";
      return tsB.localeCompare(tsA);
    });
}

export function loadSnapshot(snapshotId: string): RepertoireSnapshot | null {
  return readSnapshot(snapshotId);
}

export function deleteSnapshot(snapshotId: string): void {
  if (!isBrowser()) {
    return;
  }
  localStorage.removeItem(snapshotId);
}

function enforceSnapshotCap(repertoireId: string): void {
  const summaries = listSnapshots(repertoireId);
  if (summaries.length <= MAX_SNAPSHOTS_PER_REPERTOIRE) {
    return;
  }
  const excess = summaries.slice(MAX_SNAPSHOTS_PER_REPERTOIRE);
  for (const entry of excess) {
    deleteSnapshot(entry.snapshotId);
  }
}

export function saveSnapshot(
  repertoire: Repertoire,
  label?: string,
): RepertoireSnapshot {
  if (!isBrowser()) {
    throw new SnapshotStorageError("Snapshots are only available in the browser.");
  }

  const sortKey = nextSnapshotSortKey();
  const savedAt = new Date().toISOString();
  const snapshotId = snapshotStorageKey(repertoire.id, sortKey);
  const snapshot: RepertoireSnapshot = {
    snapshotId,
    repertoireId: repertoire.id,
    savedAt,
    label: label?.trim() || `Snapshot ${savedAt.slice(0, 10)}`,
    repertoire: structuredClone(repertoire),
  };

  try {
    writeSnapshot(snapshot);
    enforceSnapshotCap(repertoire.id);
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw new SnapshotStorageError(
        "Not enough storage space to save snapshot. Delete older snapshots and try again.",
      );
    }
    throw error;
  }

  return snapshot;
}

export function snapshotIdFromParts(repertoireId: string, timestamp: string): string {
  return snapshotStorageKey(repertoireId, timestamp);
}

export function parseSnapshotStorageId(snapshotId: string): { repertoireId: string; timestamp: string } | null {
  return parseSnapshotId(snapshotId);
}
