import { parse } from "@echecs/pgn";
import type { ParseError, ParseWarning } from "@echecs/pgn";

import { buildStudyGame } from "./buildTree";
import type { PgnParseIssue, PgnParseResult } from "./types";
import { validatePgnSize } from "./storage";

function toIssue(error: ParseError | ParseWarning): PgnParseIssue {
  return {
    message: error.message,
    line: error.line,
    column: error.column,
  };
}

export function parsePgnDatabase(
  content: string,
  fileName?: string,
): PgnParseResult {
  const sizeError = validatePgnSize(new TextEncoder().encode(content).length);
  if (sizeError) {
    return { games: [], errors: [{ message: sizeError }], warnings: [] };
  }

  const errors: PgnParseIssue[] = [];
  const warnings: PgnParseIssue[] = [];
  const buildErrors: PgnParseIssue[] = [];

  const parsed = parse(content, {
    onError(error) {
      errors.push(toIssue(error));
    },
    onWarning(warning) {
      warnings.push(toIssue(warning));
    },
  });

  if (parsed.length === 0 && errors.length === 0) {
    return {
      games: [],
      errors: [{ message: "No games found in PGN." }],
      warnings,
    };
  }

  const games = parsed.map((game) => {
    const gameErrors: PgnParseIssue[] = [];
    const studyGame = buildStudyGame(game, gameErrors);
    buildErrors.push(...gameErrors);
    return studyGame;
  });

  if (fileName) {
    void fileName;
  }

  return {
    games,
    errors: [...errors, ...buildErrors],
    warnings,
  };
}
