import { describe, expect, it, beforeEach, vi } from "vitest";
import type { Square } from "chess.js";

import type { EcoEntry } from "@/lib/openings/lookup";
import { DEFAULT_REPERTOIRE_META } from "@/lib/repertoires/meta";
import {
  addChapter,
  createChapter,
  setChapterLines,
} from "@/lib/repertoires/chapters";
import {
  applyMove,
  createEmptyStudyGame,
  resetNodeCounter,
} from "@/lib/repertoires/treeBuilder";
import type { Repertoire } from "@/lib/repertoires/types";

import { buildPrepPlan } from "./lineFilter";
import {
  createOpponentProfile,
  deleteOpponentProfile,
  listOpponentProfiles,
  saveOpponentProfile,
} from "./opponents";

const ECO_FIXTURE: EcoEntry[] = [
  { eco: "B20", name: "Sicilian Defense", pgn: "1. e4 c5" },
  { eco: "C20", name: "King's Pawn", pgn: "1. e4 e5" },
];

function buildRepertoire(): { repertoire: Repertoire; sicilianLineId: string; e5LineId: string } {
  resetNodeCounter();
  let game = createEmptyStudyGame("Main");
  const e4 = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
  game = e4.game;
  const c5 = applyMove(game, e4.nodeId, "c7" as Square, "c5" as Square)!;
  game = c5.game;
  const sicilianLeaf = c5.nodeId;
  const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
  game = e5.game;
  const e5Leaf = e5.nodeId;

  const sicilianLineId = `0:${sicilianLeaf}`;
  const e5LineId = `0:${e5Leaf}`;
  let meta = DEFAULT_REPERTOIRE_META;
  const chapter = createChapter("Sicilian", 0);
  meta = addChapter(meta, chapter);
  meta = setChapterLines(meta, chapter.id, [sicilianLineId]);

  const repertoire: Repertoire = {
    id: "rep-prep",
    name: "Prep Test",
    source: "imported",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    games: [game],
    registeredLeafIds: [],
    meta,
  };

  return { repertoire, sicilianLineId, e5LineId };
}

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

beforeEach(() => {
  localStorageMock.clear();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("crypto", { randomUUID: () => "opp-1" });
});

describe("opponents storage", () => {
  it("creates and lists opponent profiles", () => {
    const profile = createOpponentProfile({ name: "Rival" });
    saveOpponentProfile(profile);
    expect(listOpponentProfiles()).toHaveLength(1);
    deleteOpponentProfile(profile.id);
    expect(listOpponentProfiles()).toHaveLength(0);
  });
});

describe("buildPrepPlan", () => {
  it("filters by chapter", () => {
    const { repertoire, sicilianLineId } = buildRepertoire();
    const chapterId = repertoire.meta.chapters[0]!.id;
    const opponent = createOpponentProfile({
      name: "Rival",
      likelyOpenings: [
        {
          name: "Sicilian",
          repertoireId: repertoire.id,
          chapterId,
        },
      ],
    });

    const plan = buildPrepPlan(opponent, [repertoire], ECO_FIXTURE, []);
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]?.lineIds).toEqual([sicilianLineId]);
  });

  it("filters by eco code", () => {
    const { repertoire, e5LineId } = buildRepertoire();
    const opponent = createOpponentProfile({
      name: "Rival",
      likelyOpenings: [
        {
          name: "Open game",
          repertoireId: repertoire.id,
          eco: "C20",
        },
      ],
    });

    const plan = buildPrepPlan(opponent, [repertoire], ECO_FIXTURE, []);
    expect(plan.groups[0]?.lineIds).toContain(e5LineId);
  });

  it("deduplicates lines across openings", () => {
    const { repertoire, sicilianLineId } = buildRepertoire();
    const chapterId = repertoire.meta.chapters[0]!.id;
    const opponent = createOpponentProfile({
      name: "Rival",
      likelyOpenings: [
        { name: "A", repertoireId: repertoire.id, chapterId },
        { name: "B", repertoireId: repertoire.id, eco: "B20" },
      ],
    });

    const plan = buildPrepPlan(opponent, [repertoire], ECO_FIXTURE, []);
    expect(plan.totalLines).toBe(1);
    expect(plan.groups[0]?.lineIds).toEqual([sicilianLineId]);
  });
});
