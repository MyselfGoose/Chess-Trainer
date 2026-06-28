import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import type { EcoEntry } from "@/lib/openings/lookup";
import type { LineMastery } from "@/lib/training/mastery";
import type { TrainingSessionSummary } from "@/lib/training/types";
import { DEFAULT_REPERTOIRE_META } from "@/lib/repertoires/meta";
import {
  applyMove,
  createEmptyStudyGame,
  resetNodeCounter,
} from "@/lib/repertoires/treeBuilder";
import type { Repertoire } from "@/lib/repertoires/types";

import { computeRepertoireAnalytics } from "./analytics";

const ECO_FIXTURE: EcoEntry[] = [
  {
    eco: "B20",
    name: "Sicilian Defense",
    pgn: "1. e4 c5",
  },
  {
    eco: "D00",
    name: "Queen's Pawn Game",
    pgn: "1. d4",
  },
];

function buildRepertoireWithLines(): {
  repertoire: Repertoire;
  lineIds: string[];
} {
  resetNodeCounter();
  let game = createEmptyStudyGame("Main");
  const e4 = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
  game = e4.game;
  const c5 = applyMove(game, e4.nodeId, "c7" as Square, "c5" as Square)!;
  game = c5.game;
  const sicilianLeaf = c5.nodeId;

  resetNodeCounter();
  let game2 = createEmptyStudyGame("Alt");
  const d4 = applyMove(game2, game2.rootId, "d2" as Square, "d4" as Square)!;
  game2 = d4.game;
  const d4Leaf = d4.nodeId;

  resetNodeCounter();
  let game3 = createEmptyStudyGame("Deep");
  const e4b = applyMove(game3, game3.rootId, "e2" as Square, "e4" as Square)!;
  game3 = e4b.game;
  const c5b = applyMove(game3, e4b.nodeId, "c7" as Square, "c5" as Square)!;
  game3 = c5b.game;
  const nf3 = applyMove(game3, c5b.nodeId, "g1" as Square, "f3" as Square)!;
  game3 = nf3.game;
  const deepLeaf = nf3.nodeId;

  const sicilianLineId = `0:${sicilianLeaf}`;
  const d4LineId = `1:${d4Leaf}`;
  const deepLineId = `2:${deepLeaf}`;

  const repertoire: Repertoire = {
    id: "rep-analytics",
    name: "Analytics Test",
    source: "imported",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    games: [game, game2, game3],
    registeredLeafIds: [],
    meta: {
      ...DEFAULT_REPERTOIRE_META,
      chapters: [
        {
          id: "ch-sicilian",
          name: "Sicilian",
          lineIds: [sicilianLineId],
          tags: [],
          sortOrder: 0,
        },
        {
          id: "ch-deep",
          name: "Deep lines",
          lineIds: [deepLineId],
          tags: [],
          sortOrder: 1,
        },
      ],
    },
  };

  return {
    repertoire,
    lineIds: [sicilianLineId, d4LineId, deepLineId],
  };
}

function masteryEntry(
  lineId: string,
  level: LineMastery["level"],
  attempts: number,
  passCount: number,
): LineMastery {
  return {
    lineId,
    repertoireId: "rep-analytics",
    level,
    easeFactor: 2.5,
    intervalDays: 1,
    repetitions: attempts,
    dueAt: "2026-01-01",
    lastResult: passCount > 0 ? "pass" : "fail",
    lastTrainedAt: "2026-01-02T00:00:00.000Z",
    passCount,
    failCount: attempts - passCount,
    attemptCount: attempts,
  };
}

describe("computeRepertoireAnalytics", () => {
  it("builds depth histogram buckets from line plies", () => {
    const { repertoire } = buildRepertoireWithLines();
    const analytics = computeRepertoireAnalytics(
      repertoire,
      [],
      [],
      ECO_FIXTURE,
    );

    const totalInHistogram = analytics.depthHistogram.reduce(
      (sum, bucket) => sum + bucket.lineCount,
      0,
    );
    expect(totalInHistogram).toBe(analytics.totalLines);
    expect(analytics.depthHistogram.some((bucket) => bucket.lineCount > 0)).toBe(
      true,
    );
  });

  it("computes coverage from non-new mastery levels", () => {
    const { repertoire, lineIds } = buildRepertoireWithLines();
    const mastery = [
      masteryEntry(lineIds[0]!, "learning", 1, 1),
      masteryEntry(lineIds[1]!, "learning", 1, 1),
    ];

    const analytics = computeRepertoireAnalytics(
      repertoire,
      mastery,
      [],
      ECO_FIXTURE,
    );

    expect(analytics.coveragePercent).toBe(67);
  });

  it("counts weak lines consistently with line stats helpers", () => {
    const { repertoire, lineIds } = buildRepertoireWithLines();
    const mastery = [
      masteryEntry(lineIds[0]!, "learning", 3, 1),
      masteryEntry(lineIds[1]!, "mastered", 5, 5),
    ];
    const history: TrainingSessionSummary[] = [
      {
        repertoireId: repertoire.id,
        repertoireName: repertoire.name,
        userColor: "white",
        startedAt: "2026-01-02T00:00:00.000Z",
        finishedAt: "2026-01-02T00:05:00.000Z",
        results: [
          { lineId: lineIds[0]!, label: "A", passed: false, userMovesPlayed: 1, totalUserMoves: 2 },
          { lineId: lineIds[0]!, label: "A", passed: false, userMovesPlayed: 1, totalUserMoves: 2 },
        ],
        endedEarly: false,
        totalLinesPlanned: 1,
        skippedLines: [],
      },
    ];

    const analytics = computeRepertoireAnalytics(
      repertoire,
      mastery,
      history,
      ECO_FIXTURE,
    );

    expect(analytics.weakLineCount).toBeGreaterThan(0);
    expect(analytics.lastStudiedAt).toBe("2026-01-02T00:05:00.000Z");
  });

  it("groups openings by ECO", () => {
    const { repertoire } = buildRepertoireWithLines();
    const analytics = computeRepertoireAnalytics(
      repertoire,
      [],
      [],
      ECO_FIXTURE,
    );

    const sicilian = analytics.openingBreakdown.find(
      (entry) => entry.eco === "B20",
    );
    const queenPawn = analytics.openingBreakdown.find(
      (entry) => entry.eco === "D00",
    );

    expect(sicilian?.lineCount).toBe(2);
    expect(queenPawn?.lineCount).toBe(1);
  });

  it("breaks down chapters including unassigned lines", () => {
    const { repertoire } = buildRepertoireWithLines();
    const analytics = computeRepertoireAnalytics(
      repertoire,
      [],
      [],
      ECO_FIXTURE,
    );

    expect(analytics.chapterBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Sicilian", lineCount: 1 }),
        expect.objectContaining({ name: "Deep lines", lineCount: 1 }),
        expect.objectContaining({ name: "Unassigned", lineCount: 1 }),
      ]),
    );
  });
});
