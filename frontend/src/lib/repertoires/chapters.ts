import { extractTrainingLines } from "@/lib/training/lines";
import type { TrainingLine } from "@/lib/training/types";

import type {
  Repertoire,
  RepertoireChapter,
  RepertoireMeta,
} from "./types";

/** Training line IDs use the format `${gameIndex}:${leafNodeId}`. */
export const TRAINING_LINE_ID_PATTERN = /^\d+:[^:]+$/;

export interface SuggestedChapter {
  name: string;
  lineIds: string[];
  color?: RepertoireChapter["color"];
}

const MAX_SUGGESTED_CHAPTERS = 20;

function isValidTrainingLineId(lineId: string): boolean {
  return TRAINING_LINE_ID_PATTERN.test(lineId);
}

function filterValidLineIds(lineIds: string[]): string[] {
  return [...new Set(lineIds.filter(isValidTrainingLineId))];
}

function cloneMeta(meta: RepertoireMeta): RepertoireMeta {
  return {
    ...meta,
    tags: [...meta.tags],
    chapters: meta.chapters.map((chapter) => ({
      ...chapter,
      lineIds: [...chapter.lineIds],
      tags: [...chapter.tags],
    })),
  };
}

function updateChapterInMeta(
  meta: RepertoireMeta,
  chapterId: string,
  updater: (chapter: RepertoireChapter) => RepertoireChapter,
): RepertoireMeta {
  const next = cloneMeta(meta);
  const index = next.chapters.findIndex((chapter) => chapter.id === chapterId);
  if (index === -1) {
    return meta;
  }
  next.chapters[index] = updater(next.chapters[index]!);
  return next;
}

export function createChapter(
  name: string,
  sortOrder: number,
): RepertoireChapter {
  const trimmed = name.trim();
  return {
    id: crypto.randomUUID(),
    name: trimmed,
    lineIds: [],
    tags: [],
    sortOrder,
  };
}

export function updateChapter(
  chapter: RepertoireChapter,
  patch: Partial<
    Pick<RepertoireChapter, "name" | "color" | "tags" | "sortOrder" | "lineIds">
  >,
): RepertoireChapter {
  return {
    ...chapter,
    ...patch,
    name: patch.name !== undefined ? patch.name.trim() : chapter.name,
    lineIds:
      patch.lineIds !== undefined
        ? filterValidLineIds(patch.lineIds)
        : chapter.lineIds,
    tags: patch.tags !== undefined ? [...patch.tags] : chapter.tags,
  };
}

export function addChapter(
  meta: RepertoireMeta,
  chapter: RepertoireChapter,
): RepertoireMeta {
  const next = cloneMeta(meta);
  next.chapters.push(chapter);
  return next;
}

export function deleteChapter(
  meta: RepertoireMeta,
  chapterId: string,
): RepertoireMeta {
  const next = cloneMeta(meta);
  next.chapters = next.chapters.filter((chapter) => chapter.id !== chapterId);
  return next;
}

export function reorderChapters(
  meta: RepertoireMeta,
  orderedIds: string[],
): RepertoireMeta {
  const byId = new Map(meta.chapters.map((chapter) => [chapter.id, chapter]));
  const reordered: RepertoireChapter[] = [];
  orderedIds.forEach((id, index) => {
    const chapter = byId.get(id);
    if (chapter) {
      reordered.push({ ...chapter, sortOrder: index });
      byId.delete(id);
    }
  });
  for (const chapter of byId.values()) {
    reordered.push({ ...chapter, sortOrder: reordered.length });
  }
  return { ...cloneMeta(meta), chapters: reordered };
}

export function moveChapter(
  meta: RepertoireMeta,
  chapterId: string,
  direction: "up" | "down",
): RepertoireMeta {
  const sorted = [...meta.chapters].sort((a, b) => a.sortOrder - b.sortOrder);
  const index = sorted.findIndex((chapter) => chapter.id === chapterId);
  if (index === -1) {
    return meta;
  }
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= sorted.length) {
    return meta;
  }
  const orderedIds = sorted.map((chapter) => chapter.id);
  [orderedIds[index], orderedIds[swapIndex]] = [
    orderedIds[swapIndex]!,
    orderedIds[index]!,
  ];
  return reorderChapters(meta, orderedIds);
}

export function assignLinesToChapter(
  meta: RepertoireMeta,
  chapterId: string,
  lineIds: string[],
): RepertoireMeta {
  const valid = filterValidLineIds(lineIds);
  return updateChapterInMeta(meta, chapterId, (chapter) => ({
    ...chapter,
    lineIds: [...new Set([...chapter.lineIds, ...valid])],
  }));
}

export function setChapterLines(
  meta: RepertoireMeta,
  chapterId: string,
  lineIds: string[],
): RepertoireMeta {
  const valid = filterValidLineIds(lineIds);
  return updateChapterInMeta(meta, chapterId, (chapter) => ({
    ...chapter,
    lineIds: valid,
  }));
}

export function removeLinesFromChapter(
  meta: RepertoireMeta,
  chapterId: string,
  lineIds: string[],
): RepertoireMeta {
  const removeSet = new Set(lineIds);
  return updateChapterInMeta(meta, chapterId, (chapter) => ({
    ...chapter,
    lineIds: chapter.lineIds.filter((id) => !removeSet.has(id)),
  }));
}

export function getChaptersForLine(
  meta: RepertoireMeta,
  lineId: string,
): RepertoireChapter[] {
  return meta.chapters.filter((chapter) => chapter.lineIds.includes(lineId));
}

export function collectLineIdsForChapters(
  meta: RepertoireMeta,
  chapterIds: string[],
): Set<string> {
  const idSet = new Set(chapterIds);
  const lineIds = new Set<string>();
  for (const chapter of meta.chapters) {
    if (idSet.has(chapter.id)) {
      for (const lineId of chapter.lineIds) {
        lineIds.add(lineId);
      }
    }
  }
  return lineIds;
}

export function filterLinesByChapters(
  lines: TrainingLine[],
  meta: RepertoireMeta,
  chapterIds: string[],
): TrainingLine[] {
  if (chapterIds.length === 0) {
    return lines;
  }
  const allowed = collectLineIdsForChapters(meta, chapterIds);
  return lines.filter((line) => allowed.has(line.id));
}

export function filterLinesByChapterIds(
  repertoire: Repertoire,
  lines: TrainingLine[],
  chapterIds: string[] | undefined,
): TrainingLine[] {
  if (!chapterIds || chapterIds.length === 0) {
    return lines;
  }
  return filterLinesByChapters(lines, repertoire.meta, chapterIds);
}

export function addRepertoireTag(meta: RepertoireMeta, tag: string): RepertoireMeta {
  const trimmed = tag.trim();
  if (!trimmed || meta.tags.includes(trimmed)) {
    return meta;
  }
  return { ...cloneMeta(meta), tags: [...meta.tags, trimmed] };
}

export function removeRepertoireTag(
  meta: RepertoireMeta,
  tag: string,
): RepertoireMeta {
  return {
    ...cloneMeta(meta),
    tags: meta.tags.filter((existing) => existing !== tag),
  };
}

export function applySuggestedChapters(
  meta: RepertoireMeta,
  suggestions: SuggestedChapter[],
): RepertoireMeta {
  let next = cloneMeta(meta);
  const baseOrder = next.chapters.length;
  suggestions.forEach((suggestion, index) => {
    const chapter = createChapter(suggestion.name, baseOrder + index);
    next = addChapter(next, {
      ...chapter,
      lineIds: filterValidLineIds(suggestion.lineIds),
      color: suggestion.color,
    });
  });
  return next;
}

function formatMoveToken(move: TrainingLine["moves"][number]): string {
  if (move.color === "w" && move.moveNumber !== undefined) {
    return `${move.moveNumber}.${move.san}`;
  }
  if (move.color === "b" && move.moveNumber !== undefined) {
    return `${move.moveNumber}...${move.san}`;
  }
  return move.san;
}

function openingSignature(line: TrainingLine): string | null {
  if (line.moves.length < 4) {
    return null;
  }
  const slice = line.moves.slice(0, 4);
  return slice.map(formatMoveToken).join(" ");
}

function displayNameFromSignature(signature: string): string {
  const tokens = signature.split(" ");
  const whiteFirst = tokens[1];
  const blackFirst = tokens[2];
  const whiteSecond = tokens[4];
  const blackSecond = tokens[5];
  if (whiteFirst && blackFirst && whiteSecond && blackSecond) {
    return `${whiteFirst} ${blackFirst} / ${whiteSecond} ${blackSecond}`;
  }
  return signature;
}

function inferLineColor(line: TrainingLine): "white" | "black" {
  const first = line.moves[0];
  if (!first) {
    return "white";
  }
  return first.color === "b" ? "black" : "white";
}

function inferChapterColor(lines: TrainingLine[]): RepertoireChapter["color"] {
  const colors = new Set(lines.map(inferLineColor));
  if (colors.size > 1) {
    return "both";
  }
  return colors.has("black") ? "black" : "white";
}

export function suggestChaptersFromLines(
  repertoire: Repertoire,
): SuggestedChapter[] {
  const lines = extractTrainingLines(repertoire);
  const groups = new Map<string, TrainingLine[]>();

  for (const line of lines) {
    const signature = openingSignature(line);
    if (!signature) {
      continue;
    }
    const bucket = groups.get(signature) ?? [];
    bucket.push(line);
    groups.set(signature, bucket);
  }

  const suggestions: SuggestedChapter[] = [];
  for (const [signature, groupedLines] of groups) {
    suggestions.push({
      name: displayNameFromSignature(signature) || signature,
      lineIds: groupedLines.map((line) => line.id),
      color: inferChapterColor(groupedLines),
    });
  }

  return suggestions
    .sort((a, b) => b.lineIds.length - a.lineIds.length)
    .slice(0, MAX_SUGGESTED_CHAPTERS);
}

export function sortedChapters(meta: RepertoireMeta): RepertoireChapter[] {
  return [...meta.chapters].sort((a, b) => a.sortOrder - b.sortOrder);
}
