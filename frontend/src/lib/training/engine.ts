import type { Square } from "chess.js";

import type { PromotionPiece } from "@/lib/chess/types";
import { findChoiceByMove, getMoveChoices } from "@/lib/pgn";
import type { StudyGame, StudyNode } from "@/lib/pgn";

import type { OpponentPolicy, TrainingMode } from "./config";
import { countUserMovesInLine } from "./lines";
import type {
  TrainingColor,
  TrainingFeedback,
  TrainingLine,
  TrainingLineResult,
  TrainingPhase,
  TrainingPositionHint,
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
  positionHint: TrainingPositionHint | null;
  summary: TrainingSessionSummary | null;
  isAnimatingOpponent: boolean;
}

export interface CreateTrainingEngineInput {
  repertoireId: string;
  repertoireName: string;
  repertoireNames?: string[];
  userColor: TrainingColor;
  lines: TrainingLine[];
  games: StudyGame[];
  gamesByRepertoire?: Map<string, StudyGame[]>;
  startedAt: string;
  mode: TrainingMode;
  showCommentsAfterLine: boolean;
  opponentPolicy: OpponentPolicy;
}

function getGameForLine(input: CreateTrainingEngineInput, line: TrainingLine): StudyGame {
  if (input.gamesByRepertoire) {
    const games = input.gamesByRepertoire.get(line.repertoireId);
    const game = games?.[line.gameIndex];
    if (game) {
      return game;
    }
  }
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
  failedAtPly?: number,
): TrainingLineResult {
  return {
    lineId: line.id,
    label: line.label,
    passed,
    failedAtPly: passed ? undefined : failedAtPly,
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
    repertoireNames: input.repertoireNames,
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
  const game = getGameForLine(input, line);
  const parentId = line.startParentNodeId ?? getRootId(game);
  return {
    boardFen: line.startFen,
    boardLastMove: null,
    currentParentNodeId: parentId,
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
    positionHint: null,
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

export interface TrainingPositionContext {
  expectedSan: string | null;
  repertoireChoices: Array<{
    san: string;
    isExpected: boolean;
    isMainLine: boolean;
  }>;
}

export function getTrainingPositionContext(
  state: TrainingEngineState,
  input: CreateTrainingEngineInput,
): TrainingPositionContext | null {
  const line = getCurrentLine(state);
  const parentId = state.currentParentNodeId;
  if (
    !line ||
    !parentId ||
    state.phase !== "active" ||
    !state.waitingForUser
  ) {
    return null;
  }

  const game = getGameForLine(input, line);
  const expected = line.moves[state.moveIndex];
  const choices = getMoveChoices(game, parentId);

  return {
    expectedSan: expected?.san ?? null,
    repertoireChoices: choices.map((choice) => ({
      san: choice.node.san,
      isExpected: choice.node.id === expected?.id,
      isMainLine: choice.isMainLine,
    })),
  };
}

function buildAlternateMoveHint(
  game: StudyGame,
  parentId: string,
  expected: StudyNode,
  matched: StudyNode,
): TrainingPositionHint {
  const choices = getMoveChoices(game, parentId);
  const otherRepertoireSans = choices
    .filter(
      (choice) =>
        choice.node.id !== expected.id && choice.node.id !== matched.id,
    )
    .map((choice) => choice.node.san);

  return {
    kind: "alternate_repertoire_move",
    playedSan: matched.san,
    expectedSan: expected.san,
    otherRepertoireSans,
  };
}

function handleWrongUserMove(
  state: TrainingEngineState,
  input: CreateTrainingEngineInput,
  playedSan: string,
  expectedSan: string,
): TrainingEngineState {
  const failed = completeLineFailed(state, input, playedSan, expectedSan);

  if (input.mode === "survival") {
    return {
      ...failed,
      phase: "summary",
      summary: buildSummary(input, failed.results, state.lines, false),
    };
  }

  if (input.mode === "learn") {
    return {
      ...failed,
      feedback: {
        ...failed.feedback!,
        message: `Hint: expected ${expectedSan}`,
      },
    };
  }

  if (input.mode === "test") {
    return {
      ...failed,
      feedback: {
        passed: false,
        message: "Line recorded",
        expectedSan,
        playedSan,
      },
    };
  }

  return failed;
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
      positionHint: null,
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
    positionHint: null,
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
      return {
        ...state,
        waitingForUser: true,
        isAnimatingOpponent: false,
        positionHint: null,
      };
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

  const game = getGameForLine(input, line);
  const leafNode = game.nodes[line.leafNodeId];
  const comment =
    input.showCommentsAfterLine && input.mode !== "test"
      ? leafNode?.comment?.trim() || undefined
      : undefined;

  return {
    ...state,
    waitingForUser: false,
    isAnimatingOpponent: false,
    positionHint: null,
    results: [...state.results, result],
    feedback: {
      passed: true,
      message: "Line complete",
      comment,
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
    state.moveIndex,
  );

  return {
    ...state,
    waitingForUser: false,
    isAnimatingOpponent: false,
    positionHint: null,
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
    if (matched !== null) {
      return {
        ...state,
        positionHint: buildAlternateMoveHint(game, parentId, expected, matched),
        isAnimatingOpponent: false,
      };
    }

    return handleWrongUserMove(
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
    positionHint: null,
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
      positionHint: null,
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
