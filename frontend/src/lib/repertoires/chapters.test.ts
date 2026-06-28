import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import {
  addChapter,
  addRepertoireTag,
  applySuggestedChapters,
  assignLinesToChapter,
  createChapter,
  deleteChapter,
  filterLinesByChapters,
  moveChapter,
  removeLinesFromChapter,
  removeRepertoireTag,
  reorderChapters,
  setChapterLines,
  suggestChaptersFromLines,
} from "./chapters";
import { DEFAULT_REPERTOIRE_META } from "./meta";
import {
  applyMove,
  createEmptyStudyGame,
  resetNodeCounter,
} from "./treeBuilder";
import type { Repertoire } from "./types";

function makeRepertoire(games: Repertoire["games"], overrides?: Partial<Repertoire>): Repertoire {
  return {
    id: "rep-1",
    name: "Test",
    source: "imported",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    games,
    registeredLeafIds: [],
    meta: { ...DEFAULT_REPERTOIRE_META },
    ...overrides,
  };
}

describe("chapters", () => {
  it("creates and assigns lines to a chapter", () => {
    let meta = DEFAULT_REPERTOIRE_META;
    const chapter = createChapter("Italian", 0);
    meta = addChapter(meta, chapter);
    meta = assignLinesToChapter(meta, chapter.id, ["0:leaf-a", "invalid", "0:leaf-b"]);

    const updated = meta.chapters.find((entry) => entry.id === chapter.id);
    expect(updated?.lineIds).toEqual(["0:leaf-a", "0:leaf-b"]);
  });

  it("filters lines by chapter ids", () => {
    const chapter = createChapter("Sicilian", 0);
    const meta = {
      ...DEFAULT_REPERTOIRE_META,
      chapters: [{ ...chapter, lineIds: ["0:a", "0:b"] }],
    };
    const lines = [
      { id: "0:a", gameIndex: 0, leafNodeId: "a", startFen: "", moves: [], label: "a" },
      { id: "0:b", gameIndex: 0, leafNodeId: "b", startFen: "", moves: [], label: "b" },
      { id: "0:c", gameIndex: 0, leafNodeId: "c", startFen: "", moves: [], label: "c" },
    ];
    const filtered = filterLinesByChapters(lines, meta, [chapter.id]);
    expect(filtered.map((line) => line.id)).toEqual(["0:a", "0:b"]);
    expect(filterLinesByChapters(lines, meta, [])).toEqual(lines);
  });

  it("reorders and deletes chapters", () => {
    const a = createChapter("A", 0);
    const b = createChapter("B", 1);
    let meta = addChapter(addChapter(DEFAULT_REPERTOIRE_META, a), b);
    meta = reorderChapters(meta, [b.id, a.id]);
    expect(meta.chapters.find((c) => c.id === b.id)?.sortOrder).toBe(0);
    meta = moveChapter(meta, a.id, "up");
    expect(meta.chapters.find((c) => c.id === a.id)?.sortOrder).toBe(0);
    meta = deleteChapter(meta, b.id);
    expect(meta.chapters).toHaveLength(1);
  });

  it("manages repertoire tags", () => {
    let meta = addRepertoireTag(DEFAULT_REPERTOIRE_META, "prep");
    meta = addRepertoireTag(meta, "prep");
    expect(meta.tags).toEqual(["prep"]);
    meta = removeRepertoireTag(meta, "prep");
    expect(meta.tags).toEqual([]);
  });

  it("sets and removes chapter lines", () => {
    const chapter = createChapter("Test", 0);
    let meta = addChapter(DEFAULT_REPERTOIRE_META, chapter);
    meta = setChapterLines(meta, chapter.id, ["0:x", "0:y"]);
    meta = removeLinesFromChapter(meta, chapter.id, ["0:x"]);
    expect(meta.chapters[0]?.lineIds).toEqual(["0:y"]);
  });

  it("suggests chapters from opening signatures", () => {
    resetNodeCounter();
    let italian = createEmptyStudyGame("Italian");
    let game = italian;
    let move = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
    game = move.game;
    move = applyMove(game, move.nodeId, "e7" as Square, "e5" as Square)!;
    game = move.game;
    move = applyMove(game, move.nodeId, "g1" as Square, "f3" as Square)!;
    game = move.game;
    move = applyMove(game, move.nodeId, "b8" as Square, "c6" as Square)!;
    italian = move.game;

    resetNodeCounter();
    let sicilian = createEmptyStudyGame("Sicilian");
    game = sicilian;
    move = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
    game = move.game;
    move = applyMove(game, move.nodeId, "c7" as Square, "c5" as Square)!;
    game = move.game;
    move = applyMove(game, move.nodeId, "g1" as Square, "f3" as Square)!;
    game = move.game;
    move = applyMove(game, move.nodeId, "d7" as Square, "d6" as Square)!;
    sicilian = move.game;

    const repertoire = makeRepertoire([italian, sicilian]);
    const suggestions = suggestChaptersFromLines(repertoire);
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
  });

  it("applies suggested chapters", () => {
    const suggestions = [
      { name: "Italian", lineIds: ["0:a"], color: "white" as const },
    ];
    const meta = applySuggestedChapters(DEFAULT_REPERTOIRE_META, suggestions);
    expect(meta.chapters).toHaveLength(1);
    expect(meta.chapters[0]?.name).toBe("Italian");
    expect(meta.chapters[0]?.lineIds).toEqual(["0:a"]);
  });
});
