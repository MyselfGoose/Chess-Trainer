import type { EcoEntry } from "@/lib/openings/lookup";
import { lookupOpeningByMoves } from "@/lib/openings/lookup";
import type { Repertoire } from "@/lib/repertoires/types";
import { filterLinesByChapterIds } from "@/lib/repertoires/chapters";

import type { TrainingSessionConfig } from "./config";
import { applyFailureDrillToLines } from "./failureDrill";
import {
  collectLinesForRepertoires,
  defaultOpeningKey,
  interleaveLines,
} from "./interleaved";
import type { LineMastery } from "./mastery";
import { getMasteryForRepertoire } from "./mastery";
import {
  applySessionLineLimit,
  extractTrainingLines,
  filterLinesForColor,
  filterLinesFromAnchorForGame,
} from "./lines";
import { applyPlyRangeToLines } from "./microLines";
import { prioritizeLines } from "./scheduler";
import type { TrainingLine } from "./types";

export interface PreparedTrainingSession {
  lines: TrainingLine[];
  games: Repertoire["games"];
  gamesByRepertoire: Map<string, Repertoire["games"]>;
  repertoireId: string;
  repertoireName: string;
  repertoireNames: string[];
  masteryByLine: Map<string, LineMastery>;
}

function openingKeyForLine(
  line: TrainingLine,
  ecoEntries: EcoEntry[],
): string {
  const opening = lookupOpeningByMoves(
    line.moves.map((move) => move.san),
    ecoEntries,
  );
  return opening?.eco ?? defaultOpeningKey(line);
}

function filterLinesForConfig(
  repertoire: Repertoire,
  allLines: TrainingLine[],
  config: TrainingSessionConfig,
): TrainingLine[] {
  let lines = allLines;

  if (config.anchorLeafNodeId) {
    lines = filterLinesFromAnchorForGame(
      lines,
      repertoire.games,
      config.anchorLeafNodeId,
    );
  }

  if (config.chapterIds && config.chapterIds.length > 0) {
    lines = filterLinesByChapterIds(repertoire, lines, config.chapterIds);
  }

  if (config.lineIds.length > 0) {
    const ids = new Set(config.lineIds);
    lines = lines.filter((line) => ids.has(line.id));
  }

  return lines;
}

function buildMasteryMap(repertoireIds: string[]): Map<string, LineMastery> {
  const masteryByLine = new Map<string, LineMastery>();
  for (const repertoireId of repertoireIds) {
    for (const entry of getMasteryForRepertoire(repertoireId)) {
      masteryByLine.set(entry.lineId, entry);
    }
  }
  return masteryByLine;
}

export function prepareTrainingSessionLines(
  repertoires: Repertoire[],
  config: TrainingSessionConfig,
  ecoEntries: EcoEntry[] = [],
): PreparedTrainingSession | null {
  if (repertoires.length === 0) {
    return null;
  }

  const repertoireIds =
    config.repertoireIds && config.repertoireIds.length > 0
      ? config.repertoireIds
      : [config.repertoireId];

  const repertoireById = new Map(repertoires.map((entry) => [entry.id, entry]));
  const orderedRepertoires = repertoireIds
    .map((id) => repertoireById.get(id))
    .filter((entry): entry is Repertoire => entry !== undefined);

  if (orderedRepertoires.length !== repertoireIds.length) {
    return null;
  }

  const isMixed = orderedRepertoires.length > 1;
  const userColor = config.userColor;
  const masteryByLine = buildMasteryMap(repertoireIds);

  let lines: TrainingLine[];

  if (isMixed) {
    lines = collectLinesForRepertoires(
      orderedRepertoires,
      userColor,
      config.lineIds.length > 0 ? config.lineIds : undefined,
    );
    const useInterleaved = config.interleaved !== false;
    if (useInterleaved) {
      lines = interleaveLines(lines, masteryByLine, (line) =>
        openingKeyForLine(line, ecoEntries),
      );
    } else if (masteryByLine.size > 0) {
      lines = prioritizeLines(lines, masteryByLine);
    }
  } else {
    const repertoire = orderedRepertoires[0]!;
    const colorLines = filterLinesForColor(
      extractTrainingLines(repertoire),
      userColor,
    );
    lines = filterLinesForConfig(repertoire, colorLines, config);
    if (masteryByLine.size > 0) {
      lines = prioritizeLines(lines, masteryByLine);
    }
  }

  if (config.drillFromFailure) {
    lines = applyFailureDrillToLines(lines, userColor, masteryByLine);
  }

  if (config.plyRange) {
    lines = applyPlyRangeToLines(lines, config.plyRange, userColor);
  }

  lines = applySessionLineLimit(
    lines,
    config.maxLines,
    masteryByLine.size === 0,
  );

  if (lines.length === 0) {
    return null;
  }

  const gamesByRepertoire = new Map<string, Repertoire["games"]>();
  for (const repertoire of orderedRepertoires) {
    gamesByRepertoire.set(repertoire.id, repertoire.games);
  }

  const primary = orderedRepertoires[0]!;
  const repertoireNames = orderedRepertoires.map((entry) => entry.name);

  return {
    lines,
    games: primary.games,
    gamesByRepertoire,
    repertoireId: primary.id,
    repertoireName: isMixed
      ? `Mixed (${repertoireNames.length} repertoires)`
      : primary.name,
    repertoireNames: isMixed ? repertoireNames : [primary.name],
    masteryByLine,
  };
}
