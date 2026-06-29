import type { EcoEntry } from "@/lib/openings/lookup";
import { lookupOpeningByMoves } from "@/lib/openings/lookup";
import { filterLinesByChapterIds } from "@/lib/repertoires/chapters";
import type { Repertoire } from "@/lib/repertoires/types";
import { computeReadinessScore } from "@/lib/training/readiness";
import { extractTrainingLines } from "@/lib/training/lines";
import type { LineMastery } from "@/lib/training/mastery";
import type { TrainingLine } from "@/lib/training/types";

import type {
  LikelyOpening,
  OpponentProfile,
  PrepPlan,
  PrepPlanGroup,
} from "./opponents";

function linesMatchingEco(
  lines: TrainingLine[],
  eco: string,
  ecoEntries: EcoEntry[],
): TrainingLine[] {
  const normalizedEco = eco.trim().toUpperCase();
  return lines.filter((line) => {
    const opening = lookupOpeningByMoves(
      line.moves.map((move) => move.san),
      ecoEntries,
    );
    return opening?.eco.toUpperCase() === normalizedEco;
  });
}

export function resolveLinesForLikelyOpening(
  repertoire: Repertoire,
  opening: LikelyOpening,
  ecoEntries: EcoEntry[],
): TrainingLine[] {
  const allLines = extractTrainingLines(repertoire);
  if (opening.chapterId) {
    return filterLinesByChapterIds(repertoire, allLines, [opening.chapterId]);
  }
  if (opening.eco) {
    return linesMatchingEco(allLines, opening.eco, ecoEntries);
  }
  return allLines;
}

export function buildPrepPlan(
  opponent: OpponentProfile,
  repertoires: Repertoire[],
  ecoEntries: EcoEntry[],
  masteryRecords: LineMastery[],
): PrepPlan {
  const repertoireById = new Map(repertoires.map((entry) => [entry.id, entry]));
  const masteryByLine = new Map(
    masteryRecords.map((entry) => [entry.lineId, entry]),
  );
  const grouped = new Map<string, Set<string>>();

  for (const opening of opponent.likelyOpenings) {
    const repertoire = repertoireById.get(opening.repertoireId);
    if (!repertoire) {
      continue;
    }
    const lines = resolveLinesForLikelyOpening(repertoire, opening, ecoEntries);
    const existing = grouped.get(opening.repertoireId) ?? new Set<string>();
    for (const line of lines) {
      existing.add(line.id);
    }
    grouped.set(opening.repertoireId, existing);
  }

  const groups: PrepPlanGroup[] = [];
  let totalLines = 0;

  for (const [repertoireId, lineIdSet] of grouped) {
    const repertoire = repertoireById.get(repertoireId);
    if (!repertoire) {
      continue;
    }
    const lineIds = [...lineIdSet];
    const lines = extractTrainingLines(repertoire).filter((line) =>
      lineIdSet.has(line.id),
    );
    totalLines += lineIds.length;
    groups.push({
      repertoireId,
      repertoireName: repertoire.name,
      lineIds,
      lineCount: lineIds.length,
      readinessPercent: computeReadinessScore(lines, masteryByLine),
    });
  }

  groups.sort((a, b) => a.repertoireName.localeCompare(b.repertoireName));

  return {
    opponentId: opponent.id,
    opponentName: opponent.name,
    groups,
    totalLines,
    createdAt: new Date().toISOString(),
  };
}
