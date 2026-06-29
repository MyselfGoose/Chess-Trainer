import { extractTrainingLines } from "@/lib/training/lines";
import type { TrainingLine } from "@/lib/training/types";

import type { Repertoire } from "./types";

export interface ChangedComment {
  pathKey: string;
  label: string;
  before: string;
  after: string;
}

export interface SanPathChange {
  pathKey: string;
  label: string;
  before: string;
  after: string;
}

export interface RepertoireDiff {
  addedLines: string[];
  removedLines: string[];
  changedComments: ChangedComment[];
  sanPathChanges: SanPathChange[];
}

const MIN_PREFIX_PLIES_FOR_SAN_CHANGE = 4;

export function linePathKey(line: TrainingLine): string {
  return line.moves.map((move) => move.san).join(" ");
}

function leafComment(line: TrainingLine, repertoire: Repertoire): string {
  const game = repertoire.games[line.gameIndex];
  if (!game) {
    return "";
  }
  const leaf = game.nodes[line.leafNodeId];
  return leaf?.comment?.trim() ?? "";
}

function lineMap(repertoire: Repertoire): Map<string, TrainingLine> {
  const map = new Map<string, TrainingLine>();
  for (const line of extractTrainingLines(repertoire)) {
    map.set(linePathKey(line), line);
  }
  return map;
}

function prefixKey(moves: TrainingLine["moves"], plyCount: number): string {
  return moves
    .slice(0, plyCount)
    .map((move) => move.san)
    .join(" ");
}

function findSanPathChanges(
  linesA: TrainingLine[],
  linesB: TrainingLine[],
): SanPathChange[] {
  const changes: SanPathChange[] = [];
  const seen = new Set<string>();

  for (const lineA of linesA) {
    if (lineA.moves.length < MIN_PREFIX_PLIES_FOR_SAN_CHANGE) {
      continue;
    }
    const prefix = prefixKey(lineA.moves, MIN_PREFIX_PLIES_FOR_SAN_CHANGE);
    const leafA = lineA.moves[lineA.moves.length - 1]?.san ?? "";

    for (const lineB of linesB) {
      if (lineB.moves.length < MIN_PREFIX_PLIES_FOR_SAN_CHANGE) {
        continue;
      }
      if (prefixKey(lineB.moves, MIN_PREFIX_PLIES_FOR_SAN_CHANGE) !== prefix) {
        continue;
      }
      const leafB = lineB.moves[lineB.moves.length - 1]?.san ?? "";
      if (leafA === leafB) {
        continue;
      }
      const key = `${prefix}|${leafA}|${leafB}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      changes.push({
        pathKey: prefix,
        label: lineA.label,
        before: leafA,
        after: leafB,
      });
    }
  }

  return changes;
}

export function diffRepertoires(a: Repertoire, b: Repertoire): RepertoireDiff {
  const mapA = lineMap(a);
  const mapB = lineMap(b);
  const keysA = new Set(mapA.keys());
  const keysB = new Set(mapB.keys());

  const addedLines: string[] = [];
  const removedLines: string[] = [];
  const changedComments: ChangedComment[] = [];

  for (const key of keysB) {
    if (!keysA.has(key)) {
      addedLines.push(mapB.get(key)?.label ?? key);
    }
  }

  for (const key of keysA) {
    if (!keysB.has(key)) {
      removedLines.push(mapA.get(key)?.label ?? key);
    }
  }

  for (const key of keysA) {
    if (!keysB.has(key)) {
      continue;
    }
    const lineA = mapA.get(key)!;
    const lineB = mapB.get(key)!;
    const before = leafComment(lineA, a);
    const after = leafComment(lineB, b);
    if (before !== after) {
      changedComments.push({
        pathKey: key,
        label: lineA.label,
        before,
        after,
      });
    }
  }

  addedLines.sort();
  removedLines.sort();
  changedComments.sort((left, right) => left.label.localeCompare(right.label));

  const sanPathChanges = findSanPathChanges(
    [...mapA.values()],
    [...mapB.values()],
  ).sort((left, right) => left.label.localeCompare(right.label));

  return {
    addedLines,
    removedLines,
    changedComments,
    sanPathChanges,
  };
}

export function hasRepertoireDiff(diff: RepertoireDiff): boolean {
  return (
    diff.addedLines.length > 0 ||
    diff.removedLines.length > 0 ||
    diff.changedComments.length > 0 ||
    diff.sanPathChanges.length > 0
  );
}
