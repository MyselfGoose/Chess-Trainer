import { describe, expect, it } from "vitest";

import { parsePgnDatabase } from "@/lib/pgn/parse";

import {
  buildExtensionBook,
  isExtensionBookExport,
} from "./extensionExport";

const PGN = `[Event "T"]
1. e4 e5 2. Nf3 Nc6 *
`;

describe("extensionExport", () => {
  it("builds extension book positions for white", () => {
    const parsed = parsePgnDatabase(PGN);
    const repertoire = {
      id: "rep-1",
      name: "Test",
      source: "imported" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      games: parsed.games,
      registeredLeafIds: [],
      meta: { tags: [], chapters: [], version: 1 },
    };
    const book = buildExtensionBook(repertoire, "white");
    expect(book.version).toBe(1);
    expect(book.positions.length).toBeGreaterThan(0);
    expect(book.positions[0]?.allowedSans.length).toBeGreaterThan(0);
    expect(isExtensionBookExport(book)).toBe(true);
  });

  it("produces different books per color", () => {
    const parsed = parsePgnDatabase(PGN);
    const repertoire = {
      id: "rep-1",
      name: "Test",
      source: "imported" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      games: parsed.games,
      registeredLeafIds: [],
      meta: { tags: [], chapters: [], version: 1 },
    };
    const white = buildExtensionBook(repertoire, "white");
    const black = buildExtensionBook(repertoire, "black");
    expect(white.userColor).toBe("white");
    expect(black.userColor).toBe("black");
    const whiteKeys = white.positions.map((position) => position.fenKey).sort();
    const blackKeys = black.positions.map((position) => position.fenKey).sort();
    expect(whiteKeys).not.toEqual(blackKeys);
  });
});
