import { Chess } from "chess.js";

import { fenKey, normalizeFen } from "@/lib/chess/fen";

export interface EcoEntry {
  eco: string;
  name: string;
  uci?: string;
  pgn?: string;
}

export interface OpeningInfo {
  eco: string;
  name: string;
  moves?: string;
}

interface EcoDatabase {
  openings: EcoEntry[];
}

let cache: EcoEntry[] | null = null;
let fenIndex: Map<string, EcoEntry> | null = null;

function isEcoDatabase(value: unknown): value is EcoDatabase {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.openings)) {
    return false;
  }
  return record.openings.every((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const item = entry as Record<string, unknown>;
    return typeof item.eco === "string" && typeof item.name === "string";
  });
}

function normalizePgnPrefix(pgn: string): string {
  return pgn
    .replace(/\d+\.\.\./g, " ")
    .replace(/\d+\./g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanMovesToPgnPrefix(sanMoves: string[]): string {
  const parts: string[] = [];
  let moveNumber = 1;
  for (const san of sanMoves) {
    const isWhite = parts.length % 2 === 0;
    if (isWhite) {
      parts.push(`${moveNumber}.`, san);
    } else {
      parts.push(san);
      moveNumber += 1;
    }
  }
  return parts.join(" ");
}

function buildFenIndex(entries: EcoEntry[]): Map<string, EcoEntry> {
  const index = new Map<string, EcoEntry>();
  for (const entry of entries) {
    if (!entry.pgn) {
      continue;
    }
    try {
      const chess = new Chess();
      const tokens = normalizePgnPrefix(entry.pgn).split(" ").filter(Boolean);
      for (const token of tokens) {
        if (/^\d+\.$/.test(token)) {
          continue;
        }
        chess.move(token);
      }
      index.set(fenKey(chess.fen()), entry);
    } catch {
      // Skip invalid PGN prefixes in data.
    }
  }
  return index;
}

export function parseEcoDatabase(value: unknown): EcoEntry[] {
  if (!isEcoDatabase(value)) {
    throw new Error("Invalid ECO database format.");
  }
  return value.openings;
}

export async function loadEcoData(): Promise<EcoEntry[]> {
  if (cache) {
    return cache;
  }
  const response = await fetch("/data/openings/eco.json");
  if (!response.ok) {
    throw new Error("Failed to load opening data.");
  }
  const parsed: unknown = await response.json();
  cache = parseEcoDatabase(parsed);
  fenIndex = buildFenIndex(cache);
  return cache;
}

export function primeEcoData(entries: EcoEntry[]): void {
  cache = entries;
  fenIndex = buildFenIndex(entries);
}

export function resetEcoCache(): void {
  cache = null;
  fenIndex = null;
}

export function lookupOpeningByMoves(
  sanMoves: string[],
  entries: EcoEntry[],
): OpeningInfo | null {
  if (sanMoves.length === 0) {
    return null;
  }

  const prefix = normalizePgnPrefix(sanMovesToPgnPrefix(sanMoves));
  let best: EcoEntry | null = null;

  for (const entry of entries) {
    if (!entry.pgn) {
      continue;
    }
    const entryPrefix = normalizePgnPrefix(entry.pgn);
    if (!entryPrefix) {
      continue;
    }
    if (
      prefix === entryPrefix ||
      prefix.startsWith(`${entryPrefix} `)
    ) {
      if (!best || entryPrefix.length > normalizePgnPrefix(best.pgn ?? "").length) {
        best = entry;
      }
    }
  }

  if (!best) {
    return null;
  }

  return { eco: best.eco, name: best.name, moves: best.pgn };
}

export function lookupOpeningByFen(
  fen: string,
  entries: EcoEntry[],
): OpeningInfo | null {
  const index = fenIndex ?? buildFenIndex(entries);
  const key = fenKey(fen);
  const match = index.get(key);
  if (!match) {
    return null;
  }
  return { eco: match.eco, name: match.name, moves: match.pgn };
}

export async function resolveOpeningForPosition(
  fen: string,
  sanMoves: string[],
): Promise<OpeningInfo | null> {
  const entries = await loadEcoData();
  const byMoves = lookupOpeningByMoves(sanMoves, entries);
  if (byMoves) {
    return byMoves;
  }
  return lookupOpeningByFen(fen, entries);
}

export function isStartingPosition(fen: string): boolean {
  return normalizeFen(fen) === normalizeFen(new Chess().fen());
}
