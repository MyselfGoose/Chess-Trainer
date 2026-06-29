import type { Repertoire } from "@/lib/repertoires/types";

import { prioritizeLines } from "./scheduler";
import type { LineMastery } from "./mastery";
import {
  extractTrainingLines,
  filterLinesForColor,
  shuffleLines,
} from "./lines";
import type { TrainingColor, TrainingLine } from "./types";

export function collectLinesForRepertoires(
  repertoires: Repertoire[],
  userColor: TrainingColor,
  lineIds?: string[],
): TrainingLine[] {
  const lineIdSet =
    lineIds && lineIds.length > 0 ? new Set(lineIds) : null;

  const merged: TrainingLine[] = [];
  for (const repertoire of repertoires) {
    const colorLines = filterLinesForColor(
      extractTrainingLines(repertoire),
      userColor,
    );
    for (const line of colorLines) {
      if (!lineIdSet || lineIdSet.has(line.id)) {
        merged.push({
          ...line,
          id: `${repertoire.id}:${line.id}`,
        });
      }
    }
  }
  return merged;
}

function bucketLines(
  lines: TrainingLine[],
  openingKeyForLine: (line: TrainingLine) => string,
): Map<string, TrainingLine[]> {
  const buckets = new Map<string, TrainingLine[]>();
  for (const line of lines) {
    const key = openingKeyForLine(line);
    const existing = buckets.get(key) ?? [];
    existing.push(line);
    buckets.set(key, existing);
  }
  return buckets;
}

function roundRobinInterleave(buckets: Map<string, TrainingLine[]>): TrainingLine[] {
  const keys = [...buckets.keys()];
  const queues = keys.map((key) => [...(buckets.get(key) ?? [])]);
  const result: TrainingLine[] = [];

  let added = true;
  while (added) {
    added = false;
    for (const queue of queues) {
      const next = queue.shift();
      if (next) {
        result.push(next);
        added = true;
      }
    }
  }

  return result;
}

function reduceAdjacentDuplicates(
  lines: TrainingLine[],
  openingKeyForLine: (line: TrainingLine) => string,
): TrainingLine[] {
  const result = [...lines];
  for (let index = 1; index < result.length; index += 1) {
    const prevKey = openingKeyForLine(result[index - 1]!);
    const currentKey = openingKeyForLine(result[index]!);
    if (prevKey !== currentKey) {
      continue;
    }
    const swapIndex = result.findIndex(
      (line, candidateIndex) =>
        candidateIndex > index &&
        openingKeyForLine(line) !== prevKey,
    );
    if (swapIndex === -1) {
      continue;
    }
    const [candidate] = result.splice(swapIndex, 1);
    if (candidate) {
      result.splice(index, 0, candidate);
    }
  }
  return result;
}

export function interleaveLines(
  lines: TrainingLine[],
  masteryByLine: Map<string, LineMastery>,
  openingKeyForLine: (line: TrainingLine) => string,
): TrainingLine[] {
  if (lines.length <= 1) {
    return lines;
  }

  const buckets = bucketLines(lines, openingKeyForLine);
  const prioritizedBuckets = new Map<string, TrainingLine[]>();

  for (const [key, bucketLinesList] of buckets) {
    const prioritized =
      masteryByLine.size > 0
        ? prioritizeLines(bucketLinesList, masteryByLine)
        : shuffleLines(bucketLinesList);
    prioritizedBuckets.set(key, prioritized);
  }

  const interleaved = roundRobinInterleave(prioritizedBuckets);
  return reduceAdjacentDuplicates(interleaved, openingKeyForLine);
}

export function defaultOpeningKey(line: TrainingLine): string {
  const prefix = line.moves
    .slice(0, 4)
    .map((move) => move.san)
    .join(" ");
  return prefix || line.repertoireId;
}
