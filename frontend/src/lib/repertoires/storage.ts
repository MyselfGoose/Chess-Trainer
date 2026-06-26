import type { StudyGame } from "@/lib/pgn";

import {
  MAX_CATALOG_BYTES,
  REPERTOIRE_CATALOG_KEY,
  type Repertoire,
  type RepertoireSource,
} from "./types";

export class RepertoireStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepertoireStorageError";
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function parseCatalog(raw: string): Repertoire[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isValidRepertoire);
  } catch {
    return [];
  }
}

function isValidRepertoire(value: unknown): value is Repertoire {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    (record.source === "imported" || record.source === "created") &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    Array.isArray(record.games) &&
    Array.isArray(record.registeredLeafIds)
  );
}

function readCatalog(): Repertoire[] {
  if (!isBrowser()) {
    return [];
  }
  const raw = localStorage.getItem(REPERTOIRE_CATALOG_KEY);
  if (!raw) {
    return [];
  }
  return parseCatalog(raw);
}

function writeCatalog(repertoires: Repertoire[]): void {
  if (!isBrowser()) {
    return;
  }
  const serialized = JSON.stringify(repertoires);
  if (serialized.length > MAX_CATALOG_BYTES) {
    throw new RepertoireStorageError(
      "Repertoire library is full. Delete some repertoires or export them before saving more.",
    );
  }
  localStorage.setItem(REPERTOIRE_CATALOG_KEY, serialized);
}

export function listRepertoires(): Repertoire[] {
  return readCatalog().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getRepertoire(id: string): Repertoire | null {
  return readCatalog().find((repertoire) => repertoire.id === id) ?? null;
}

export interface CreateRepertoireInput {
  name: string;
  source: RepertoireSource;
  games: StudyGame[];
  fileName?: string;
  registeredLeafIds?: string[];
}

export function createRepertoire(input: CreateRepertoireInput): Repertoire {
  const now = new Date().toISOString();
  const repertoire: Repertoire = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    source: input.source,
    createdAt: now,
    updatedAt: now,
    fileName: input.fileName,
    games: input.games,
    registeredLeafIds: input.registeredLeafIds ?? [],
  };
  saveRepertoire(repertoire);
  return repertoire;
}

export function saveRepertoire(repertoire: Repertoire): void {
  const catalog = readCatalog();
  const index = catalog.findIndex((item) => item.id === repertoire.id);
  const updated: Repertoire = {
    ...repertoire,
    updatedAt: new Date().toISOString(),
  };
  if (index >= 0) {
    catalog[index] = updated;
  } else {
    catalog.push(updated);
  }
  writeCatalog(catalog);
}

export function updateRepertoire(
  id: string,
  patch: Partial<Pick<Repertoire, "name" | "games" | "registeredLeafIds" | "fileName">>,
): Repertoire | null {
  const catalog = readCatalog();
  const index = catalog.findIndex((item) => item.id === id);
  if (index < 0) {
    return null;
  }
  const updated: Repertoire = {
    ...catalog[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  catalog[index] = updated;
  writeCatalog(catalog);
  return updated;
}

export function deleteRepertoire(id: string): boolean {
  const catalog = readCatalog();
  const next = catalog.filter((item) => item.id !== id);
  if (next.length === catalog.length) {
    return false;
  }
  writeCatalog(next);
  return true;
}
