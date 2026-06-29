import { describe, expect, it } from "vitest";

import { parsePgnDatabase } from "@/lib/pgn/parse";

import {
  collectLinesForRepertoires,
  defaultOpeningKey,
  interleaveLines,
} from "./interleaved";
import type { TrainingLine } from "./types";

const PGN_A = `[Event "A"]
[White "W"]
[Black "B"]

1. e4 e5 2. Nf3 *
`;

const PGN_B = `[Event "B"]
[White "W"]
[Black "B"]

1. d4 d5 2. c4 *
`;

function buildRepertoire(id: string, name: string, pgn: string) {
  const parsed = parsePgnDatabase(pgn);
  return {
    id,
    name,
    source: "imported" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    games: parsed.games,
    registeredLeafIds: [],
  };
}

describe("interleaved", () => {
  it("merges lines from two repertoires with distinct ids", () => {
    const repA = buildRepertoire("rep-a", "A", PGN_A);
    const repB = buildRepertoire("rep-b", "B", PGN_B);
    const lines = collectLinesForRepertoires([repA, repB], "white");
    expect(lines.length).toBeGreaterThan(1);
    const repertoireIds = new Set(lines.map((line) => line.repertoireId));
    expect(repertoireIds.has("rep-a")).toBe(true);
    expect(repertoireIds.has("rep-b")).toBe(true);
    const lineIds = new Set(lines.map((line) => line.id));
    expect(lineIds.size).toBe(lines.length);
  });

  it("interleaves to avoid adjacent same opening key when possible", () => {
    const repA = buildRepertoire("rep-a", "A", PGN_A);
    const repB = buildRepertoire("rep-b", "B", PGN_B);
    const lines = collectLinesForRepertoires([repA, repB], "white");
    const interleaved = interleaveLines(
      lines,
      new Map(),
      (line) => defaultOpeningKey(line),
    );
    expect(interleaved.length).toBe(lines.length);
    if (interleaved.length >= 3) {
      const keys = interleaved.map((line) => defaultOpeningKey(line));
      const hasNonAdjacentRepeat = keys.some(
        (key, index) => index > 0 && key === keys[index - 1],
      );
      expect(hasNonAdjacentRepeat).toBe(false);
    }
  });

  it("honors maxLines after interleave via session limit in caller", () => {
    const repA = buildRepertoire("rep-a", "A", PGN_A);
    const repB = buildRepertoire("rep-b", "B", PGN_B);
    const lines = collectLinesForRepertoires([repA, repB], "white");
    const interleaved = interleaveLines(
      lines,
      new Map(),
      (line) => line.repertoireId,
    );
    const capped = interleaved.slice(0, 1);
    expect(capped).toHaveLength(1);
  });

  it("returns single-repertoire lines unchanged when only one bucket", () => {
    const repA = buildRepertoire("rep-a", "A", PGN_A);
    const lines = collectLinesForRepertoires([repA], "white");
    const interleaved = interleaveLines(
      lines,
      new Map(),
      () => "same-key",
    );
    expect(interleaved.map((line) => line.id)).toEqual(lines.map((line) => line.id));
  });

  it("defaultOpeningKey falls back to repertoire id", () => {
    const line: TrainingLine = {
      id: "0:leaf",
      repertoireId: "rep-x",
      gameIndex: 0,
      leafNodeId: "leaf",
      startFen: "start",
      moves: [],
      label: "empty",
    };
    expect(defaultOpeningKey(line)).toBe("rep-x");
  });
});
