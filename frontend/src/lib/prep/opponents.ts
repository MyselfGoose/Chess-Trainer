import type { Repertoire } from "@/lib/repertoires/types";

export interface LikelyOpening {
  name: string;
  repertoireId: string;
  chapterId?: string;
  eco?: string;
}

export interface OpponentProfile {
  id: string;
  name: string;
  notes?: string;
  likelyOpenings: LikelyOpening[];
  matchDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrepPlanGroup {
  repertoireId: string;
  repertoireName: string;
  lineIds: string[];
  lineCount: number;
  readinessPercent: number;
}

export interface PrepPlan {
  opponentId: string;
  opponentName: string;
  groups: PrepPlanGroup[];
  totalLines: number;
  createdAt: string;
}

export const OPPONENT_PROFILES_KEY = "chess:opponent-profiles";

export class OpponentStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpponentStorageError";
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function isLikelyOpening(value: unknown): value is LikelyOpening {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.name === "string" &&
    typeof record.repertoireId === "string" &&
    (record.chapterId === undefined || typeof record.chapterId === "string") &&
    (record.eco === undefined || typeof record.eco === "string")
  );
}

export function isValidOpponentProfile(value: unknown): value is OpponentProfile {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    (record.notes === undefined || typeof record.notes === "string") &&
    Array.isArray(record.likelyOpenings) &&
    record.likelyOpenings.every(isLikelyOpening) &&
    (record.matchDate === undefined || typeof record.matchDate === "string") &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

function readAllProfiles(): OpponentProfile[] {
  if (!isBrowser()) {
    return [];
  }
  const raw = localStorage.getItem(OPPONENT_PROFILES_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isValidOpponentProfile);
  } catch {
    return [];
  }
}

function writeAllProfiles(profiles: OpponentProfile[]): void {
  if (!isBrowser()) {
    return;
  }
  try {
    localStorage.setItem(OPPONENT_PROFILES_KEY, JSON.stringify(profiles));
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw new OpponentStorageError(
        "Not enough storage space to save opponent profiles.",
      );
    }
    throw error;
  }
}

export function listOpponentProfiles(): OpponentProfile[] {
  return readAllProfiles().sort((a, b) => a.name.localeCompare(b.name));
}

export function getOpponentProfile(id: string): OpponentProfile | null {
  return readAllProfiles().find((profile) => profile.id === id) ?? null;
}

export interface CreateOpponentInput {
  name: string;
  notes?: string;
  likelyOpenings?: LikelyOpening[];
  matchDate?: string;
}

export function createOpponentProfile(input: CreateOpponentInput): OpponentProfile {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    notes: input.notes?.trim() || undefined,
    likelyOpenings: input.likelyOpenings ?? [],
    matchDate: input.matchDate,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateOpponentProfile(
  profile: OpponentProfile,
  patch: Partial<CreateOpponentInput> & { likelyOpenings?: LikelyOpening[] },
): OpponentProfile {
  return {
    ...profile,
    name: patch.name !== undefined ? patch.name.trim() : profile.name,
    notes:
      patch.notes !== undefined
        ? patch.notes.trim() || undefined
        : profile.notes,
    likelyOpenings: patch.likelyOpenings ?? profile.likelyOpenings,
    matchDate: patch.matchDate ?? profile.matchDate,
    updatedAt: new Date().toISOString(),
  };
}

export function saveOpponentProfile(profile: OpponentProfile): OpponentProfile {
  const profiles = readAllProfiles();
  const index = profiles.findIndex((entry) => entry.id === profile.id);
  if (index === -1) {
    profiles.push(profile);
  } else {
    profiles[index] = profile;
  }
  writeAllProfiles(profiles);
  return profile;
}

export function deleteOpponentProfile(id: string): void {
  writeAllProfiles(readAllProfiles().filter((profile) => profile.id !== id));
}

export function repertoireMap(repertoires: Repertoire[]): Map<string, Repertoire> {
  return new Map(repertoires.map((entry) => [entry.id, entry]));
}
