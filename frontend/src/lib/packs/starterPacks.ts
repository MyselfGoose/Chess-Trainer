import { computeLineStats, parsePgnDatabase } from "@/lib/pgn";

export interface StarterPackEntry {
  id: string;
  fileName: string;
  name: string;
  description: string;
  color: "white" | "black";
  tags: string[];
}

export interface StarterPackManifest {
  packs: StarterPackEntry[];
}

function isStarterPackEntry(value: unknown): value is StarterPackEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.fileName === "string" &&
    typeof record.name === "string" &&
    typeof record.description === "string" &&
    (record.color === "white" || record.color === "black") &&
    Array.isArray(record.tags) &&
    record.tags.every((tag) => typeof tag === "string")
  );
}

export function parsePackManifest(value: unknown): StarterPackManifest | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.packs)) {
    return null;
  }
  const packs = record.packs.filter(isStarterPackEntry);
  if (packs.length === 0) {
    return null;
  }
  return { packs };
}

export async function loadPackManifest(): Promise<StarterPackManifest> {
  const response = await fetch("/packs/manifest.json");
  if (!response.ok) {
    throw new Error("Failed to load starter pack manifest.");
  }
  const parsed: unknown = await response.json();
  const manifest = parsePackManifest(parsed);
  if (!manifest) {
    throw new Error("Invalid starter pack manifest.");
  }
  return manifest;
}

export async function fetchPackPgn(fileName: string): Promise<string> {
  const response = await fetch(`/packs/${fileName}`);
  if (!response.ok) {
    throw new Error(`Failed to load pack ${fileName}.`);
  }
  return response.text();
}

export function previewPackStats(pgn: string): {
  lineCount: number;
  maxDepth: number;
} {
  const parsed = parsePgnDatabase(pgn);
  return parsed.games.reduce(
    (acc, game) => {
      const stats = computeLineStats(game);
      return {
        lineCount: acc.lineCount + stats.lineCount,
        maxDepth: Math.max(acc.maxDepth, stats.maxDepth),
      };
    },
    { lineCount: 0, maxDepth: 0 },
  );
}
