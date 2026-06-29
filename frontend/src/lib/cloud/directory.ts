import type { RepertoireDirectory, RepertoireDirectoryEntry } from "./types";

function isDirectoryEntry(value: unknown): value is RepertoireDirectoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.author === "string" &&
    typeof record.downloadUrl === "string" &&
    Array.isArray(record.tags) &&
    record.tags.every((tag) => typeof tag === "string") &&
    (record.description === undefined ||
      typeof record.description === "string") &&
    (record.color === undefined ||
      record.color === "white" ||
      record.color === "black")
  );
}

export function isRepertoireDirectory(value: unknown): value is RepertoireDirectory {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    typeof record.updatedAt === "string" &&
    Array.isArray(record.entries) &&
    record.entries.every(isDirectoryEntry)
  );
}

export function getDirectoryUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_REPERTOIRE_DIRECTORY_URL;
  if (!url || url.trim() === "") {
    return null;
  }
  return url.trim();
}

function resolveFetchUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const base =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost";
  return new URL(url, base).href;
}

export async function fetchDirectory(): Promise<RepertoireDirectory> {
  const url = getDirectoryUrl();
  if (!url) {
    throw new Error("Community directory URL is not configured.");
  }
  const response = await fetch(resolveFetchUrl(url));
  if (!response.ok) {
    throw new Error(`Failed to load directory (${response.status}).`);
  }
  const parsed: unknown = await response.json();
  if (!isRepertoireDirectory(parsed)) {
    throw new Error("Invalid community directory format.");
  }
  return parsed;
}

export async function downloadEntryPgn(
  entry: RepertoireDirectoryEntry,
): Promise<string> {
  const response = await fetch(entry.downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${entry.name} (${response.status}).`);
  }
  return response.text();
}
