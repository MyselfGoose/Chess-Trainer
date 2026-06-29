import { describe, expect, it } from "vitest";
import type { Square } from "chess.js";

import { parsePgnDatabase } from "@/lib/pgn/parse";
import { applyMove, createEmptyStudyGame } from "@/lib/repertoires/treeBuilder";

import {
  advanceFromFeedback,
  createTrainingEngine,
  endTrainingEarly,
  getTrainingPositionContext,
  startLineWalk,
  tryUserMove,
  type CreateTrainingEngineInput,
} from "./engine";
import { extractTrainingLines, filterLinesForColor } from "./lines";

const SIMPLE_PGN = `[Event "Test"]
[White "W"]
[Black "B"]

1. e4 e5 2. Nf3 Nc6 *
`;

function buildBranchingInput(): CreateTrainingEngineInput {
  let game = createEmptyStudyGame("Branch");
  const rootId = game.rootId;
  const e4 = applyMove(game, rootId, "e2" as Square, "e4" as Square)!;
  game = e4.game;
  const e5 = applyMove(game, e4.nodeId, "e7" as Square, "e5" as Square)!;
  game = e5.game;
  const nf3 = applyMove(game, e5.nodeId, "g1" as Square, "f3" as Square)!;
  game = nf3.game;
  applyMove(game, nf3.nodeId, "b8" as Square, "c6" as Square);
  const bc4 = applyMove(game, e5.nodeId, "f1" as Square, "c4" as Square)!;
  game = bc4.game;
  applyMove(game, bc4.nodeId, "b8" as Square, "c6" as Square);

  const repertoire = {
    id: "rep-branch",
    name: "Branching",
    source: "imported" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    games: [game],
    registeredLeafIds: [],
  };

  const nf3Line = filterLinesForColor(
    extractTrainingLines(repertoire),
    "white",
  ).find((line) => line.moves.some((move) => move.san === "Nf3"));

  if (!nf3Line) {
    throw new Error("Expected Nf3 training line");
  }

  return {
    repertoireId: repertoire.id,
    repertoireName: repertoire.name,
    userColor: "white",
    lines: [nf3Line],
    games: repertoire.games,
    startedAt: new Date().toISOString(),
    mode: "drill",
    showCommentsAfterLine: false,
    opponentPolicy: "mainline",
  };
}

function buildInput(userColor: "white" | "black"): {
  input: CreateTrainingEngineInput;
  lines: ReturnType<typeof filterLinesForColor>;
} {
  const parsed = parsePgnDatabase(SIMPLE_PGN);
  const repertoire = {
    id: "rep-1",
    name: "Test",
    source: "imported" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    games: parsed.games,
    registeredLeafIds: [],
  };
  const lines = filterLinesForColor(
    extractTrainingLines(repertoire),
    userColor,
  );
  return {
    lines,
    input: {
      repertoireId: repertoire.id,
      repertoireName: repertoire.name,
      userColor,
      lines,
      games: repertoire.games,
      startedAt: new Date().toISOString(),
      mode: "drill",
      showCommentsAfterLine: false,
      opponentPolicy: "mainline",
    },
  };
}

describe("training engine", () => {
  it("passes a line when all user moves are correct", () => {
    const { input, lines } = buildInput("white");
    const line = lines[0];
    let state = startLineWalk(createTrainingEngine(input), input);

    for (const move of line.moves) {
      if (move.color === "w") {
        expect(state.waitingForUser).toBe(true);
        state = tryUserMove(
          state,
          input,
          move.from as Square,
          move.to as Square,
        );
      }
    }

    expect(state.phase).toBe("lineFeedback");
    expect(state.feedback?.passed).toBe(true);
    expect(state.results[0]?.passed).toBe(true);
  });

  it("fails a line on an incorrect user move", () => {
    const { input, lines } = buildInput("white");
    let state = startLineWalk(createTrainingEngine(input), input);

    const firstWhiteMove = lines[0].moves.find((move) => move.color === "w");
    expect(firstWhiteMove).toBeDefined();

    while (!state.waitingForUser) {
      state = tryUserMove(state, input, "a2" as Square, "a3" as Square);
      break;
    }

    state = tryUserMove(state, input, "d2" as Square, "d4" as Square, undefined, "d4");
    expect(state.phase).toBe("lineFeedback");
    expect(state.feedback?.passed).toBe(false);
    expect(state.results[0]?.expectedSan).toBe(firstWhiteMove?.san);
    expect(state.results[0]?.failedAtPly).toBe(0);
  });

  it("reaches summary after all lines are completed", () => {
    const { input } = buildInput("white");
    let state = startLineWalk(createTrainingEngine(input), input);

    for (let index = 0; index < input.lines.length; index += 1) {
      const line = input.lines[index];
      while (state.phase === "active") {
        if (state.waitingForUser) {
          const expected = line.moves[state.moveIndex];
          state = tryUserMove(
            state,
            input,
            expected.from as Square,
            expected.to as Square,
          );
        } else {
          break;
        }
      }
      if (state.phase === "lineFeedback") {
        state = advanceFromFeedback(state, input);
      }
    }

    expect(state.phase).toBe("summary");
    expect(state.summary?.results.length).toBe(input.lines.length);
  });

  it("ends training early with skipped lines", () => {
    const { input, lines } = buildInput("white");
    const multiLineInput = {
      ...input,
      lines: [...lines, ...lines.map((line) => ({ ...line, id: `${line.id}-copy` }))],
    };
    let state = startLineWalk(createTrainingEngine(multiLineInput), multiLineInput);
    state = endTrainingEarly(state, multiLineInput);

    expect(state.phase).toBe("summary");
    expect(state.summary?.endedEarly).toBe(true);
    expect(state.summary?.skippedLines.length).toBe(multiLineInput.lines.length);
  });

  it("accepts an alternate repertoire move with a hint instead of failing the line", () => {
    const input = buildBranchingInput();

    let state = startLineWalk(createTrainingEngine(input), input);

    state = tryUserMove(state, input, "e2" as Square, "e4" as Square);
    expect(state.waitingForUser).toBe(true);

    const fenAtBranch = state.boardFen;
    const context = getTrainingPositionContext(state, input);
    expect(context?.repertoireChoices.length).toBeGreaterThan(1);

    state = tryUserMove(
      state,
      input,
      "f1" as Square,
      "c4" as Square,
      undefined,
      "Bc4",
    );

    expect(state.phase).toBe("active");
    expect(state.positionHint).toEqual({
      kind: "alternate_repertoire_move",
      playedSan: "Bc4",
      expectedSan: "Nf3",
      otherRepertoireSans: [],
    });
    expect(state.boardFen).toBe(fenAtBranch);
    expect(state.waitingForUser).toBe(true);

    state = tryUserMove(
      state,
      input,
      "g1" as Square,
      "f3" as Square,
      undefined,
      "Nf3",
    );

    expect(state.positionHint).toBeNull();
    expect(state.phase).toBe("lineFeedback");
    expect(state.feedback?.passed).toBe(true);
  });
});
