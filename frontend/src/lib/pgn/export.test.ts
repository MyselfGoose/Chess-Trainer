import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import { DEFAULT_REPERTOIRE_META } from "../repertoires/meta";
import type { Repertoire } from "../repertoires/types";
import {
  applyMove,
  createEmptyStudyGame,
  resetNodeCounter,
} from "../repertoires/treeBuilder";
import { createChapter } from "../repertoires/chapters";
import { parsePgnDatabase } from "../pgn/parse";
import {
  buildExportFileName,
  exportRepertoirePgn,
  gamesForChapter,
  studyGameToPgn,
} from "../pgn/export";

const SIMPLE_PGN = `[Event "Test Game"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0
`;

describe("studyGameToPgn", () => {
  it("exports a manually built game", () => {
    resetNodeCounter();
    let game = createEmptyStudyGame("Manual");
    const rootId = game.rootId;

    const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
    game = e4.game;
    const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
    game = e5.game;

    const pgn = studyGameToPgn(game);
    expect(pgn).toContain("1. e4");
    expect(pgn).toContain("e5");
  });

  it("round-trips a simple parsed game", () => {
    const parsed = parsePgnDatabase(SIMPLE_PGN);
    const game = parsed.games[0];
    const exported = studyGameToPgn(game);
    const reparsed = parsePgnDatabase(exported);

    expect(reparsed.games).toHaveLength(1);
    const moves = Object.values(reparsed.games[0].nodes).filter(
      (node) => node.san !== "",
    );
    expect(moves.length).toBeGreaterThanOrEqual(5);
    expect(moves.some((node) => node.san === "e4")).toBe(true);
    expect(moves.some((node) => node.san === "Bb5")).toBe(true);
  });
});

function makeRepertoire(
  games: Repertoire["games"],
  overrides?: Partial<Repertoire>,
): Repertoire {
  return {
    id: "rep-export",
    name: "Export Test",
    source: "imported",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    games,
    registeredLeafIds: [],
    meta: { ...DEFAULT_REPERTOIRE_META },
    ...overrides,
  };
}

function buildSimpleGame(label: string): {
  game: ReturnType<typeof createEmptyStudyGame>;
  leafId: string;
} {
  resetNodeCounter();
  let game = createEmptyStudyGame(label);
  const rootId = game.rootId;
  const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
  game = e4.game;
  const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
  game = e5.game;
  return { game, leafId: e5.nodeId };
}

describe("exportRepertoirePgn", () => {
  it("exports only the selected game", () => {
    const first = buildSimpleGame("Game A");
    const second = buildSimpleGame("Game B");
    const repertoire = makeRepertoire([first.game, second.game]);
    const pgn = exportRepertoirePgn(repertoire, {
      scope: "currentGame",
      gameIndex: 1,
    });
    const reparsed = parsePgnDatabase(pgn);
    expect(reparsed.games).toHaveLength(1);
    expect(reparsed.games[0]?.meta.Event).toBe("Game B");
  });

  it("exports the full repertoire", () => {
    const first = buildSimpleGame("Game A");
    const second = buildSimpleGame("Game B");
    const repertoire = makeRepertoire([first.game, second.game]);
    const pgn = exportRepertoirePgn(repertoire, {
      scope: "fullRepertoire",
    });
    const reparsed = parsePgnDatabase(pgn);
    expect(reparsed.games).toHaveLength(2);
  });

  it("exports games referenced by a chapter", () => {
    const first = buildSimpleGame("Italian");
    const second = buildSimpleGame("Sicilian");
    const chapter = createChapter("Open games", 0);
    const repertoire = makeRepertoire([first.game, second.game], {
      meta: {
        ...DEFAULT_REPERTOIRE_META,
        chapters: [
          {
            ...chapter,
            lineIds: [`0:${first.leafId}`, `1:${second.leafId}`],
          },
        ],
      },
    });

    const chapterGames = gamesForChapter(repertoire, chapter.id);
    expect(chapterGames).toHaveLength(2);

    const pgn = exportRepertoirePgn(repertoire, {
      scope: "chapter",
      chapterId: chapter.id,
    });
    const reparsed = parsePgnDatabase(pgn);
    expect(reparsed.games).toHaveLength(2);
  });

  it("exports one game when chapter lines are in a single game", () => {
    const first = buildSimpleGame("Italian");
    const second = buildSimpleGame("Sicilian");
    const chapter = createChapter("Italian only", 0);
    const repertoire = makeRepertoire([first.game, second.game], {
      meta: {
        ...DEFAULT_REPERTOIRE_META,
        chapters: [
          {
            ...chapter,
            lineIds: [`0:${first.leafId}`],
          },
        ],
      },
    });

    expect(gamesForChapter(repertoire, chapter.id)).toHaveLength(1);
    const pgn = exportRepertoirePgn(repertoire, {
      scope: "chapter",
      chapterId: chapter.id,
    });
    expect(parsePgnDatabase(pgn).games).toHaveLength(1);
  });

  it("builds scoped download names", () => {
    const first = buildSimpleGame("Italian");
    const repertoire = makeRepertoire([first.game], {
      name: "My Repertoire",
      meta: {
        ...DEFAULT_REPERTOIRE_META,
        chapters: [
          {
            ...createChapter("Italian", 0),
            lineIds: [`0:${first.leafId}`],
          },
        ],
      },
    });
    const chapterId = repertoire.meta.chapters[0]!.id;
    expect(
      buildExportFileName(repertoire.name, { scope: "fullRepertoire" }, repertoire),
    ).toBe("My Repertoire");
    expect(
      buildExportFileName(
        repertoire.name,
        { scope: "chapter", chapterId },
        repertoire,
      ),
    ).toBe("My Repertoire - Italian");
  });
});
