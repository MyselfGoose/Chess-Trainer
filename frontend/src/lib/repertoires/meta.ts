import type {
  Repertoire,
  RepertoireChapter,
  RepertoireMeta,
  RepertoireSource,
} from "./types";

export const DEFAULT_REPERTOIRE_META: RepertoireMeta = {
  tags: [],
  chapters: [],
  version: 1,
};

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isChapterColor(
  value: unknown,
): value is NonNullable<RepertoireChapter["color"]> {
  return value === "white" || value === "black" || value === "both";
}

export function isValidRepertoireChapter(
  value: unknown,
): value is RepertoireChapter {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    isStringArray(record.lineIds) &&
    (record.color === undefined || isChapterColor(record.color)) &&
    isStringArray(record.tags) &&
    typeof record.sortOrder === "number"
  );
}

export function isValidRepertoireMeta(value: unknown): value is RepertoireMeta {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    (record.description === undefined ||
      typeof record.description === "string") &&
    isStringArray(record.tags) &&
    Array.isArray(record.chapters) &&
    record.chapters.every(isValidRepertoireChapter) &&
    (record.forkedFromId === undefined ||
      typeof record.forkedFromId === "string") &&
    typeof record.version === "number" &&
    Number.isInteger(record.version) &&
    record.version >= 1 &&
    (record.lastStudiedAt === undefined ||
      typeof record.lastStudiedAt === "string") &&
    (record.coverOpening === undefined ||
      typeof record.coverOpening === "string")
  );
}

function isRepertoireSource(value: unknown): value is RepertoireSource {
  return value === "imported" || value === "created";
}

export function isValidRepertoire(value: unknown): value is Repertoire {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    isRepertoireSource(record.source) &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    Array.isArray(record.games) &&
    isStringArray(record.registeredLeafIds) &&
    isValidRepertoireMeta(record.meta)
  );
}

export function migrateRepertoire(raw: unknown): Repertoire | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.name !== "string" ||
    !isRepertoireSource(record.source) ||
    typeof record.createdAt !== "string" ||
    typeof record.updatedAt !== "string" ||
    !Array.isArray(record.games) ||
    !isStringArray(record.registeredLeafIds)
  ) {
    return null;
  }

  let meta: RepertoireMeta;
  if (record.meta === undefined) {
    meta = { ...DEFAULT_REPERTOIRE_META };
  } else if (!isValidRepertoireMeta(record.meta)) {
    return null;
  } else {
    meta = record.meta;
  }

  const repertoire: Repertoire = {
    id: record.id,
    name: record.name,
    source: record.source,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    games: record.games as Repertoire["games"],
    registeredLeafIds: record.registeredLeafIds,
    meta,
  };

  if (typeof record.fileName === "string") {
    repertoire.fileName = record.fileName;
  }

  return repertoire;
}

export function bumpRepertoireVersion(repertoire: Repertoire): Repertoire {
  return {
    ...repertoire,
    meta: {
      ...repertoire.meta,
      version: repertoire.meta.version + 1,
    },
  };
}
