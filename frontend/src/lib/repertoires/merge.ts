import type { StudyGame } from "@/lib/pgn";

import { cloneStudyGame } from "./fork";
import { DEFAULT_REPERTOIRE_META } from "./meta";
import type { Repertoire } from "./types";

export interface MergeRepertoiresOptions {
  name: string;
  /** Remap secondary registered leaves into merged repertoire */
  includeSecondaryRegistered: boolean;
}

export interface MergeRepertoiresResult {
  repertoire: Repertoire;
  /** Maps secondary game index → new game index in merged */
  gameIndexMap: Map<number, number>;
}

function dedupeEventHeader(existingEvents: Set<string>, event: string): string {
  if (!existingEvents.has(event)) {
    existingEvents.add(event);
    return event;
  }
  let suffix = 2;
  while (existingEvents.has(`${event} (${suffix})`)) {
    suffix += 1;
  }
  const next = `${event} (${suffix})`;
  existingEvents.add(next);
  return next;
}

function remapRegisteredLeavesForGames(
  repertoire: Repertoire,
  idMapsByGameIndex: Map<number, Map<string, string>>,
): string[] {
  if (repertoire.source !== "created") {
    return [];
  }

  const remapped: string[] = [];
  for (const leafId of repertoire.registeredLeafIds) {
    for (let gameIndex = 0; gameIndex < repertoire.games.length; gameIndex += 1) {
      const game = repertoire.games[gameIndex];
      if (!game?.nodes[leafId]) {
        continue;
      }
      const idMap = idMapsByGameIndex.get(gameIndex);
      const mapped = idMap?.get(leafId);
      if (mapped) {
        remapped.push(mapped);
      }
      break;
    }
  }
  return remapped;
}

export function mergeRepertoires(
  primary: Repertoire,
  secondary: Repertoire,
  options: MergeRepertoiresOptions,
): MergeRepertoiresResult {
  if (primary.id === secondary.id) {
    throw new Error("Cannot merge a repertoire with itself.");
  }

  const trimmedName = options.name.trim();
  if (!trimmedName) {
    throw new Error("Merged repertoire name cannot be empty.");
  }

  const mergedGames: StudyGame[] = [];
  const existingEvents = new Set<string>();
  const primaryIdMaps = new Map<number, Map<string, string>>();
  const secondaryIdMaps = new Map<number, Map<string, string>>();
  const gameIndexMap = new Map<number, number>();

  primary.games.forEach((game, gameIndex) => {
    const { game: cloned, idMap } = cloneStudyGame(game);
    const event = cloned.meta.Event ?? `Game ${gameIndex + 1}`;
    const deduped = dedupeEventHeader(existingEvents, event);
    mergedGames.push({
      ...cloned,
      meta: { ...cloned.meta, Event: deduped },
    });
    primaryIdMaps.set(gameIndex, idMap);
  });

  let registeredLeafIds = remapRegisteredLeavesForGames(primary, primaryIdMaps);

  secondary.games.forEach((game, secondaryIndex) => {
    const { game: cloned, idMap } = cloneStudyGame(game);
    const newGameIndex = mergedGames.length;
    gameIndexMap.set(secondaryIndex, newGameIndex);

    const event = cloned.meta.Event ?? `Game ${newGameIndex + 1}`;
    const deduped = dedupeEventHeader(existingEvents, event);
    mergedGames.push({
      ...cloned,
      meta: { ...cloned.meta, Event: deduped },
    });
    secondaryIdMaps.set(secondaryIndex, idMap);
  });

  if (options.includeSecondaryRegistered && secondary.source === "created") {
    const secondaryLeaves = remapRegisteredLeavesForGames(secondary, secondaryIdMaps);
    registeredLeafIds = [...registeredLeafIds, ...secondaryLeaves];
  }

  const now = new Date().toISOString();

  return {
    repertoire: {
      id: crypto.randomUUID(),
      name: trimmedName,
      source: "created",
      createdAt: now,
      updatedAt: now,
      games: mergedGames,
      registeredLeafIds: [...new Set(registeredLeafIds)],
      meta: { ...DEFAULT_REPERTOIRE_META },
    },
    gameIndexMap,
  };
}
