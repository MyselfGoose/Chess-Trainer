import type { Square } from "chess.js";

import type { PromotionPiece } from "@/lib/chess/types";
import { findChoiceByMove } from "@/lib/pgn";
import type { StudyGame } from "@/lib/pgn";

import { countUserMovesInLine } from "./lines";
import type {
  TrainingColor,
  TrainingFeedback,
  TrainingLine,
  TrainingLineResult,
  TrainingPhase,
  TrainingSessionSummary,
} from "./types";
import { trainingColorToNodeColor } from "./types";

export interface TrainingEngineState {
  phase: TrainingPhase;
  lines: TrainingLine[];
  currentLineIndex: number;
  moveIndex: number;
  boardFen: string;
  boardLastMove: [Square, Square] | null;
  currentParentNodeId: string | null;
  waitingForUser: boolean;
  userMovesPlayedInLine: number;
  results: TrainingLineResult[];
  feedback: TrainingFeedback | null;
  summary: TrainingSessionSummary | null;
  isAnimatingOpponent: boolean;
}

export interface CreateTrainingEngineInput {
  repertoireId: string;
  repertoireName: string;
  userColor: TrainingColor;
  lines: TrainingLine[];
  games: StudyGame[];
  startedAt: string;
}

function getGameForLine(input: CreateTrainingEngineInput, line: TrainingLine): StudyGame {
  return input.games[line.gameIndex];
}

function getRootId(game: StudyGame): string {
  return game.rootId;
}

function buildLineResult(
  line: TrainingLine,
  userColor: TrainingColor,
  passed: boolean,
  userMovesPlayed: number,
  failedAtSan?: string,
  expectedSan?: string,
): TrainingLineResult {
  return {
    lineId: line.id,
    label: line.label,
    passed,
    failedAtSan,
    expectedSan,
    userMovesPlayed,
    totalUserMoves: countUserMovesInLine(line, userColor),
  };
}

function buildSummary(
  input: CreateTrainingEngineInput,
  results: TrainingLineResult[],
  lines: TrainingLine[],
  endedEarly: boolean,
): TrainingSessionSummary {
  const completedIds = new Set(results.map((result) => result.lineId));
  const skippedLines = lines
    .filter((line) => !completedIds.has(line.id))
    .map((line) => ({ lineId: line.id, label: line.label }));

  return {
    repertoireId: input.repertoireId,
    repertoireName: input.repertoireName,
    userColor: input.userColor,
    startedAt: input.startedAt,
    finishedAt: new Date().toISOString(),
    results,
    endedEarly,
    totalLinesPlanned: lines.length,
    skippedLines,
  };
}

function initialLineState(
  input: CreateTrainingEngineInput,
  line: TrainingLine,
): Pick<
  TrainingEngineState,
  | "boardFen"
  | "boardLastMove"
  | "currentParentNodeId"
  | "moveIndex"
  | "waitingForUser"
  | "userMovesPlayedInLine"
  | "isAnimatingOpponent"
> {
  return {
    boardFen: line.startFen,
    boardLastMove: null,
    currentParentNodeId: getRootId(getGameForLine(input, line)),
    moveIndex: 0,
    waitingForUser: false,
    userMovesPlayedInLine: 0,
    isAnimatingOpponent: false,
  };
}

export function createTrainingEngine(
  input: CreateTrainingEngineInput,
): TrainingEngineState {
  const firstLine = input.lines[0];
  return {
    phase: "active",
    lines: input.lines,
    currentLineIndex: 0,
    results: [],
    feedback: null,
    summary: null,
    ...(firstLine
      ? initialLineState(input, firstLine)
      : {
          boardFen: "",
          boardLastMove: null,
          currentParentNodeId: null,
          moveIndex: 0,
          waitingForUser: false,
          userMovesPlayedInLine: 0,
          isAnimatingOpponent: false,
        }),
  };
}

export function getCurrentLine(state: TrainingEngineState): TrainingLine | null {
  return state.lines[state.currentLineIndex] ?? null;
}

export function getExpectedUserMove(
  state: TrainingEngineState,
  input: CreateTrainingEngineInput,
): TrainingLine["moves"][number] | null {
  const line = getCurrentLine(state);
  if (!line || !state.waitingForUser) {
    return null;
  }
  const expected = line.moves[state.moveIndex];
  const userNodeColor = trainingColorToNodeColor(input.userColor);
  if (!expected || expected.color !== userNodeColor) {
    return null;
  }
  return expected;
}

export function applyNextOpponentMove(
  state: TrainingEngineState,
  input: CreateTrainingEngineInput,
): TrainingEngineState {
  const line = getCurrentLine(state);
  if (!line || state.phase !== "active" || state.waitingForUser) {
    return { ...state, isAnimatingOpponent: false };
  }

  const userNodeColor = trainingColorToNodeColor(input.userColor);
  if (state.moveIndex >= line.moves.length) {
    return completeLinePassed({ ...state, isAnimatingOpponent: false }, input);
  }

  const move = line.moves[state.moveIndex];
  if (move.color === userNodeColor) {
    return {
      ...state,
      waitingForUser: true,
      isAnimatingOpponent: false,
    };
  }

  const nextState: TrainingEngineState = {
    ...state,
    boardFen: move.fen,
    boardLastMove:
      move.from && move.to ? [move.from as Square, move.to as Square] : null,
    currentParentNodeId: move.id,
    moveIndex: state.moveIndex + 1,
    waitingForUser: false,
    isAnimatingOpponent: true,
  };

  if (nextState.moveIndex >= line.moves.length) {
    return completeLinePassed({ ...nextState, isAnimatingOpponent: false }, input);
  }

  const followingMove = line.moves[nextState.moveIndex];
  if (followingMove.color === userNodeColor) {
    return {
      ...nextState,
      waitingForUser: true,
      isAnimatingOpponent: false,
    };
  }

  return nextState;
}

export function applyOpponentStep(
  state: TrainingEngineState,
  input: CreateTrainingEngineInput,
): TrainingEngineState {
  let nextState = state;
  let safety = 0;
  while (
    hasPendingOpponentAnimation(nextState, input) &&
    safety < 64
  ) {
    nextState = applyNextOpponentMove(nextState, input);
    safety += 1;
    if (nextState.waitingForUser || nextState.phase === "lineFeedback") {
      break;
    }
  }
  return nextState;
}

export function startLineWalk(
  state: TrainingEngineState,
  input: CreateTrainingEngineInput,
): TrainingEngineState {
  if (!hasPendingOpponentAnimation(state, input)) {
    const line = getCurrentLine(state);
    const userNodeColor = trainingColorToNodeColor(input.userColor);
    const nextMove = line?.moves[state.moveIndex];
    if (nextMove && nextMove.color === userNodeColor) {
      return { ...state, waitingForUser: true, isAnimatingOpponent: false };
    }
    return state;
  }
  return applyNextOpponentMove(state, input);
}

function completeLinePassed(
  state: TrainingEngineState,
  input: CreateTrainingEngineInput,
): TrainingEngineState {
  const line = getCurrentLine(state);
  if (!line) {
    return state;
  }

  const result = buildLineResult(
    line,
    input.userColor,
    true,
    state.userMovesPlayedInLine,
  );

  return {
    ...state,
    waitingForUser: false,
    isAnimatingOpponent: false,
    results: [...state.results, result],
    feedback: {
      passed: true,
      message: "Line complete",
    },
    phase: "lineFeedback",
  };
}

function completeLineFailed(
  state: TrainingEngineState,
  input: CreateTrainingEngineInput,
  playedSan: string,
  expectedSan: string,
): TrainingEngineState {
  const line = getCurrentLine(state);
  if (!line) {
    return state;
  }

  const result = buildLineResult(
    line,
    input.userColor,
    false,
    state.userMovesPlayedInLine,
    playedSan,
    expectedSan,
  );

  return {
    ...state,
    waitingForUser: false,
    isAnimatingOpponent: false,
    results: [...state.results, result],
    feedback: {
      passed: false,
      message: `Incorrect. Expected ${expectedSan}.`,
      expectedSan,
      playedSan,
    },
    phase: "lineFeedback",
  };
}

export function tryUserMove(
  state: TrainingEngineState,
  input: CreateTrainingEngineInput,
  from: Square,
  to: Square,
  promotion?: PromotionPiece,
  playedSan?: string,
): TrainingEngineState {
  if (state.phase !== "active" || !state.waitingForUser) {
    return state;
  }

  const line = getCurrentLine(state);
  const game = line ? getGameForLine(input, line) : null;
  const parentId = state.currentParentNodeId;
  const expected = line?.moves[state.moveIndex];

  if (!line || !game || !parentId || !expected) {
    return state;
  }

  const matched = findChoiceByMove(game, parentId, from, to, promotion);
  const isCorrect =
    matched !== null && matched.id === expected.id;

  if (!isCorrect) {
    return completeLineFailed(
      state,
      input,
      playedSan ?? `${from}-${to}`,
      expected.san,
    );
  }

  const nextState: TrainingEngineState = {
    ...state,
    boardFen: matched.fen,
    boardLastMove:
      matched.from && matched.to
        ? [matched.from as Square, matched.to as Square]
        : null,
    currentParentNodeId: matched.id,
    moveIndex: state.moveIndex + 1,
    waitingForUser: false,
    userMovesPlayedInLine: state.userMovesPlayedInLine + 1,
    isAnimatingOpponent: false,
  };

  if (nextState.moveIndex >= line.moves.length) {
    return completeLinePassed(nextState, input);
  }

  return applyNextOpponentMove(nextState, input);
}

export function advanceFromFeedback(
  state: TrainingEngineState,
  input: CreateTrainingEngineInput,
): TrainingEngineState {
  if (state.phase !== "lineFeedback") {
    return state;
  }

  const nextLineIndex = state.currentLineIndex + 1;
  if (nextLineIndex >= state.lines.length) {
    return {
      ...state,
      phase: "summary",
      feedback: null,
      summary: buildSummary(input, state.results, state.lines, false),
      waitingForUser: false,
      isAnimatingOpponent: false,
    };
  }

  const nextLine = state.lines[nextLineIndex];
  return startLineWalk(
    {
      ...state,
      phase: "active",
      currentLineIndex: nextLineIndex,
      feedback: null,
      results: state.results,
      ...initialLineState(input, nextLine),
    },
    input,
  );
}

export function endTrainingEarly(
  state: TrainingEngineState,
  input: CreateTrainingEngineInput,
): TrainingEngineState {
  if (state.phase === "summary") {
    return state;
  }

  return {
    ...state,
    phase: "summary",
    feedback: null,
    waitingForUser: false,
    isAnimatingOpponent: false,
    summary: buildSummary(input, state.results, state.lines, true),
  };
}

export function hasPendingOpponentAnimation(
  state: TrainingEngineState,
  input: CreateTrainingEngineInput,
): boolean {
  if (state.phase !== "active" || state.waitingForUser) {
    return false;
  }
  const line = getCurrentLine(state);
  if (!line) {
    return false;
  }
  const userNodeColor = trainingColorToNodeColor(input.userColor);
  const nextMove = line.moves[state.moveIndex];
  return nextMove !== undefined && nextMove.color !== userNodeColor;
}
