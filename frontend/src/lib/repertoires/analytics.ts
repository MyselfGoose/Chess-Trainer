import type { EcoEntry } from "@/lib/openings/lookup";
import { lookupOpeningByMoves } from "@/lib/openings/lookup";
import { extractTrainingLines } from "@/lib/training/lines";
import type { LineMastery } from "@/lib/training/mastery";
import {
  aggregateLineStats,
  findWeakLines,
  type LineStatsSummary,
} from "@/lib/training/lineStats";
import { computeReadinessScore } from "@/lib/training/readiness";
import type { TrainingSessionSummary } from "@/lib/training/types";

import { sortedChapters } from "./chapters";
import type { Repertoire } from "./types";

export interface OpeningCount {
  eco: string;
  name: string;
  lineCount: number;
}

export interface DepthBucket {
  minPly: number;
  maxPly: number;
  lineCount: number;
}

export interface ChapterBreakdownRow {
  chapterId: string;
  name: string;
  lineCount: number;
  trainedCount: number;
  weakCount: number;
}

export interface RepertoireAnalytics {
  totalLines: number;
  openingBreakdown: OpeningCount[];
  depthHistogram: DepthBucket[];
  coveragePercent: number;
  readinessPercent: number;
  lastStudiedAt: string | null;
  weakLineCount: number;
  weakLines: LineStatsSummary[];
  chapterBreakdown: ChapterBreakdownRow[];
}

const DEPTH_BUCKETS: Array<{ minPly: number; maxPly: number }> = [
  { minPly: 1, maxPly: 4 },
  { minPly: 5, maxPly: 8 },
  { minPly: 9, maxPly: 12 },
  { minPly: 13, maxPly: Number.POSITIVE_INFINITY },
];

const WEAK_LINES_LIMIT = 10;
const UNCLASSIFIED_OPENING = { eco: "—", name: "Unclassified" };
const UNASSIGNED_CHAPTER_ID = "__unassigned__";

function isLineTrained(
  lineId: string,
  masteryByLine: Map<string, LineMastery>,
): boolean {
  const entry = masteryByLine.get(lineId);
  if (!entry) {
    return false;
  }
  return entry.level !== "new" || entry.attemptCount > 0;
}

function bucketForPly(ply: number): DepthBucket["minPly"] | null {
  for (const bucket of DEPTH_BUCKETS) {
    if (ply >= bucket.minPly && ply <= bucket.maxPly) {
      return bucket.minPly;
    }
  }
  return null;
}

function buildOpeningBreakdown(
  lines: ReturnType<typeof extractTrainingLines>,
  ecoEntries: EcoEntry[],
): OpeningCount[] {
  const counts = new Map<string, OpeningCount>();

  for (const line of lines) {
    const sanMoves = line.moves.map((move) => move.san);
    const opening = lookupOpeningByMoves(sanMoves, ecoEntries);
    const key = opening ? opening.eco : UNCLASSIFIED_OPENING.eco;
    const existing = counts.get(key) ?? {
      eco: opening?.eco ?? UNCLASSIFIED_OPENING.eco,
      name: opening?.name ?? UNCLASSIFIED_OPENING.name,
      lineCount: 0,
    };
    existing.lineCount += 1;
    counts.set(key, existing);
  }

  return [...counts.values()].sort((a, b) => b.lineCount - a.lineCount);
}

function buildDepthHistogram(
  lines: ReturnType<typeof extractTrainingLines>,
): DepthBucket[] {
  const histogram = DEPTH_BUCKETS.map((bucket) => ({
    minPly: bucket.minPly,
    maxPly: Number.isFinite(bucket.maxPly) ? bucket.maxPly : 99,
    lineCount: 0,
  }));

  for (const line of lines) {
    const bucketMin = bucketForPly(line.moves.length);
    if (bucketMin === null) {
      continue;
    }
    const bucket = histogram.find((entry) => entry.minPly === bucketMin);
    if (bucket) {
      bucket.lineCount += 1;
    }
  }

  return histogram;
}

function buildChapterBreakdown(
  repertoire: Repertoire,
  lineIds: string[],
  masteryByLine: Map<string, LineMastery>,
  weakLineIds: Set<string>,
): ChapterBreakdownRow[] {
  const allLineIds = new Set(lineIds);
  const assignedLineIds = new Set<string>();
  const rows: ChapterBreakdownRow[] = [];

  for (const chapter of sortedChapters(repertoire.meta)) {
    const chapterLineIds = chapter.lineIds.filter((lineId) =>
      allLineIds.has(lineId),
    );
    chapterLineIds.forEach((lineId) => assignedLineIds.add(lineId));
    rows.push({
      chapterId: chapter.id,
      name: chapter.name,
      lineCount: chapterLineIds.length,
      trainedCount: chapterLineIds.filter((lineId) =>
        isLineTrained(lineId, masteryByLine),
      ).length,
      weakCount: chapterLineIds.filter((lineId) => weakLineIds.has(lineId))
        .length,
    });
  }

  const unassigned = [...allLineIds].filter((lineId) => !assignedLineIds.has(lineId));
  if (unassigned.length > 0) {
    rows.push({
      chapterId: UNASSIGNED_CHAPTER_ID,
      name: "Unassigned",
      lineCount: unassigned.length,
      trainedCount: unassigned.filter((lineId) =>
        isLineTrained(lineId, masteryByLine),
      ).length,
      weakCount: unassigned.filter((lineId) => weakLineIds.has(lineId)).length,
    });
  }

  return rows;
}

function lastStudiedAtFromHistory(
  repertoireId: string,
  history: TrainingSessionSummary[],
): string | null {
  const sessions = history.filter(
    (session) => session.repertoireId === repertoireId,
  );
  return sessions[0]?.finishedAt ?? null;
}

export function computeRepertoireAnalytics(
  repertoire: Repertoire,
  mastery: LineMastery[],
  history: TrainingSessionSummary[],
  ecoEntries: EcoEntry[],
): RepertoireAnalytics {
  const lines = extractTrainingLines(repertoire);
  const lineIds = lines.map((line) => line.id);
  const repertoireMastery = mastery.filter(
    (entry) => entry.repertoireId === repertoire.id,
  );
  const masteryByLine = new Map(
    repertoireMastery.map((entry) => [entry.lineId, entry]),
  );

  const trainedCount = lineIds.filter((lineId) =>
    isLineTrained(lineId, masteryByLine),
  ).length;
  const coveragePercent =
    lines.length === 0 ? 0 : Math.round((trainedCount / lines.length) * 100);
  const readinessPercent = computeReadinessScore(lines, masteryByLine);

  const lineStats = aggregateLineStats(repertoire.id, history, mastery);
  const weakLines = findWeakLines(lineStats);
  const weakLineIds = new Set(weakLines.map((entry) => entry.lineId));

  return {
    totalLines: lines.length,
    openingBreakdown: buildOpeningBreakdown(lines, ecoEntries),
    depthHistogram: buildDepthHistogram(lines),
    coveragePercent,
    readinessPercent,
    lastStudiedAt: lastStudiedAtFromHistory(repertoire.id, history),
    weakLineCount: weakLines.length,
    weakLines: weakLines.slice(0, WEAK_LINES_LIMIT),
    chapterBreakdown: buildChapterBreakdown(
      repertoire,
      lineIds,
      masteryByLine,
      weakLineIds,
    ),
  };
}
