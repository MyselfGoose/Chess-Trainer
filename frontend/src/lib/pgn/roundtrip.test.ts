import { describe, expect, it } from "vitest";

import { repertoireToPgn, studyGameToPgn } from "./export";
import { parsePgnDatabase } from "./parse";
import type { StudyGame } from "./types";

const COMMENT_PGN = `[Event "Comments"]
[White "A"]
[Black "B"]

1. e4 { King's pawn } 1... e5 { Symmetrical } 2. Nf3 *
`;

const ESCAPED_COMMENT_PGN = `[Event "Escape"]
1. e4 { Note with escaped brace } 2. Nf3 *
`;

const NAG_PGN = `[Event "NAGs"]
1. e4 $1 1... e5 $2 2. Nf3 $146 *
`;

const ARROW_PGN = `[Event "Arrows"]
1. e4 { [%cal Ge2e4] } 1... e5 2. Nf3 { [%cal Ge1f3,Gf1c4] } *
`;

const SQUARE_PGN = `[Event "Squares"]
1. e4 { [%csl Ye4] } 1... e5 { [%csl Gd5,Rf7] } *
`;

const VARIATION_PGN = `[Event "Repertoire"]
[White "You"]
[Black "Opponent"]

1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5 *
`;

const CUSTOM_FEN_PGN = `[SetUp "1"]
[FEN "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"]
[White "Test"]
[Black "Test"]

1. Nf3 Nc6 *
`;

function countMoveNodes(game: StudyGame): number {
  return Object.values(game.nodes).filter((node) => node.san !== "").length;
}

function collectSanPaths(game: StudyGame): string[] {
  const paths: string[] = [];

  function walk(nodeId: string, sans: string[]): void {
    const node = game.nodes[nodeId];
    if (!node) {
      return;
    }
    const nextSans = node.san ? [...sans, node.san] : sans;
    if (node.childIds.length === 0) {
      if (nextSans.length > 0) {
        paths.push(nextSans.join(" "));
      }
      return;
    }
    for (const childId of node.childIds) {
      walk(childId, nextSans);
    }
  }

  const root = game.nodes[game.rootId];
  if (root) {
    for (const childId of root.childIds) {
      walk(childId, []);
    }
  }

  return paths.sort();
}

function collectComments(game: StudyGame): string[] {
  return Object.values(game.nodes)
    .map((node) => node.comment)
    .filter((comment): comment is string => Boolean(comment));
}

function collectArrows(game: StudyGame): Array<{ from: string; to: string; color: string }> {
  const arrows: Array<{ from: string; to: string; color: string }> = [];
  for (const node of Object.values(game.nodes)) {
    for (const arrow of node.arrows ?? []) {
      arrows.push({
        from: arrow.from,
        to: arrow.to,
        color: arrow.color,
      });
    }
  }
  return arrows;
}

function collectSquares(game: StudyGame): Array<{ square: string; color: string }> {
  const squares: Array<{ square: string; color: string }> = [];
  for (const node of Object.values(game.nodes)) {
    for (const square of node.squares ?? []) {
      squares.push({ square: square.square, color: square.color });
    }
  }
  return squares;
}

function collectNags(game: StudyGame): string[] {
  const nags: string[] = [];
  for (const node of Object.values(game.nodes)) {
    for (const nag of node.annotations ?? []) {
      nags.push(nag.startsWith("$") ? nag : `$${nag}`);
    }
  }
  return nags.sort();
}

function roundTrip(pgn: string): {
  original: StudyGame;
  exported: string;
  reparsed: StudyGame;
} {
  const parsed = parsePgnDatabase(pgn);
  expect(parsed.games.length).toBeGreaterThan(0);
  const original = parsed.games[0]!;
  const exported = studyGameToPgn(original);
  const reparsed = parsePgnDatabase(exported);
  expect(reparsed.games.length).toBeGreaterThan(0);
  return { original, exported, reparsed: reparsed.games[0]! };
}

describe("PGN round-trip", () => {
  it("preserves move count for simple comments", () => {
    const { original, reparsed } = roundTrip(COMMENT_PGN);
    expect(countMoveNodes(reparsed)).toBe(countMoveNodes(original));
    expect(collectComments(reparsed).length).toBeGreaterThan(0);
  });

  it("preserves escaped comments", () => {
    const { original, reparsed } = roundTrip(ESCAPED_COMMENT_PGN);
    expect(collectComments(reparsed).length).toBe(collectComments(original).length);
  });

  it("preserves NAGs", () => {
    const { original, reparsed } = roundTrip(NAG_PGN);
    expect(collectNags(reparsed).sort()).toEqual(collectNags(original).sort());
  });

  it("preserves arrows in comments", () => {
    const { original, reparsed } = roundTrip(ARROW_PGN);
    const originalArrows = collectArrows(original);
    const reparsedArrows = collectArrows(reparsed);
    expect(reparsedArrows.length).toBe(originalArrows.length);
    for (const arrow of originalArrows) {
      expect(reparsedArrows).toContainEqual(arrow);
    }
  });

  it("preserves square highlights", () => {
    const { original, reparsed } = roundTrip(SQUARE_PGN);
    const originalSquares = collectSquares(original);
    const reparsedSquares = collectSquares(reparsed);
    expect(reparsedSquares.length).toBe(originalSquares.length);
    for (const square of originalSquares) {
      expect(reparsedSquares).toContainEqual(square);
    }
  });

  it("preserves variation SAN paths", () => {
    const { original, reparsed } = roundTrip(VARIATION_PGN);
    expect(countMoveNodes(reparsed)).toBe(countMoveNodes(original));
    expect(collectSanPaths(reparsed).sort()).toEqual(
      collectSanPaths(original).sort(),
    );
  });

  it("preserves custom starting FEN", () => {
    const { original, reparsed } = roundTrip(CUSTOM_FEN_PGN);
    expect(reparsed.startFen).toContain("4P3");
    expect(reparsed.startFen).toBe(original.startFen);
    expect(countMoveNodes(reparsed)).toBe(countMoveNodes(original));
  });

  it("exports NAG and annotation tokens in movetext", () => {
    const { exported } = roundTrip(NAG_PGN);
    expect(exported).toMatch(/\$1/);
    expect(exported).toMatch(/\$146/);
  });

  it("exports [%cal] and [%csl] in movetext", () => {
    const arrowTrip = roundTrip(ARROW_PGN);
    expect(arrowTrip.exported).toContain("[%cal");

    const squareTrip = roundTrip(SQUARE_PGN);
    expect(squareTrip.exported).toContain("[%csl");
  });

  it("exports structured arrows persisted on node fields", () => {
    const { original, exported, reparsed } = roundTrip(ARROW_PGN);
    const moveNode = Object.values(original.nodes).find(
      (node) => node.san === "e4",
    );
    expect(moveNode?.arrows?.length).toBeGreaterThan(0);

    const structuredGame: StudyGame = {
      ...original,
      nodes: {
        ...original.nodes,
        [moveNode!.id]: {
          ...moveNode!,
          comment: undefined,
          arrows: [{ color: "G", from: "e2", to: "e4" }],
          squares: [{ color: "Y", square: "e4" }],
        },
      },
    };

    const structuredExport = studyGameToPgn(structuredGame);
    expect(structuredExport).toContain("[%cal Ge2e4]");
    expect(structuredExport).toContain("[%csl Ye4]");

    const structuredReparsed = parsePgnDatabase(structuredExport).games[0]!;
    const reparsedNode = Object.values(structuredReparsed.nodes).find(
      (node) => node.san === "e4",
    );
    expect(reparsedNode?.arrows).toEqual(
      expect.arrayContaining([{ color: "G", from: "e2", to: "e4" }]),
    );
    expect(reparsedNode?.squares).toEqual(
      expect.arrayContaining([{ color: "Y", square: "e4" }]),
    );

    expect(exported).toContain("[%cal");
    expect(countMoveNodes(reparsed)).toBe(countMoveNodes(original));
  });

  it("exports multi-game repertoires", () => {
    const first = parsePgnDatabase(COMMENT_PGN).games[0]!;
    const second = parsePgnDatabase(VARIATION_PGN).games[0]!;
    const exported = repertoireToPgn([first, second]);
    const reparsed = parsePgnDatabase(exported);
    expect(reparsed.games).toHaveLength(2);
    expect(reparsed.games[0]?.meta.Event).toBe("Comments");
    expect(reparsed.games[1]?.meta.Event).toBe("Repertoire");
  });

  it("preserves deeply nested variations", () => {
    const deepPgn = `[Event "Deep"]
1. e4 e5 2. Nf3 Nc6 (2... d6 3. d4 (3... exd4 4. Nxd4 Nf6) exd5) 3. Bb5 *
`;
    const { original, reparsed } = roundTrip(deepPgn);
    expect(collectSanPaths(reparsed).sort()).toEqual(
      collectSanPaths(original).sort(),
    );
  });

  it("exports comment, NAG, and [%cal] together", () => {
    const combinedPgn = `[Event "Combined"]
1. e4 $1 { Idea } { [%cal Ge2e4] } 1... e5 *
`;
    const { exported, reparsed } = roundTrip(combinedPgn);
    expect(exported).toMatch(/\$1/);
    expect(exported).toContain("Idea");
    expect(exported).toContain("[%cal");
    const e4Node = Object.values(reparsed.nodes).find((node) => node.san === "e4");
    expect(e4Node?.comment).toContain("Idea");
    expect(e4Node?.annotations?.length).toBeGreaterThan(0);
    expect(e4Node?.arrows?.length).toBeGreaterThan(0);
  });
});

// Known limitations:
// - Clock tags and eval glyphs are not exported if not stored on StudyNode.
// - Arrow ordering within a comment may differ after round-trip.
