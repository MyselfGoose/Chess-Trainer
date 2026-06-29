import { fenKey } from "@/lib/chess/fen";
import { getMoveChoices } from "@/lib/pgn/navigation";
import type { StudyGame, StudyNode } from "@/lib/pgn";
import { buildPositionIndex } from "@/lib/pgn/positionIndex";
import type { Repertoire } from "@/lib/repertoires/types";
import type { TrainingColor } from "@/lib/training/types";
import { trainingColorToNodeColor } from "@/lib/training/types";

export interface GameMove {
  ply: number;
  san: string;
  fen: string;
  color: "w" | "b";
}

export interface RepertoireDeviation {
  ply: number;
  moveIndex: number;
  playedSan: string;
  positionFen: string;
  repertoireSans: string[];
  expectedSan?: string;
  parentNodeId?: string;
  gameIndex: number;
}

export interface DeviationAnalysisResult {
  inBookPlies: number;
  totalPlies: number;
  deviation: RepertoireDeviation | null;
  gameMoves: GameMove[];
}

export interface DeviationAnalysisError {
  error: string;
}

export type DeviationAnalysisOutcome =
  | DeviationAnalysisResult
  | DeviationAnalysisError;

function isDeviationError(
  outcome: DeviationAnalysisOutcome,
): outcome is DeviationAnalysisError {
  return "error" in outcome;
}

function extractMainlineMoves(game: StudyGame): StudyNode[] {
  const moves: StudyNode[] = [];
  let currentId = game.rootId;

  while (true) {
    const current = game.nodes[currentId];
    if (!current || current.childIds.length === 0) {
      break;
    }
    const childId = current.childIds[0];
    if (!childId) {
      break;
    }
    const child = game.nodes[childId];
    if (!child || child.san === "") {
      break;
    }
    moves.push(child);
    currentId = childId;
  }

  return moves;
}

function toGameMoves(mainline: StudyNode[]): GameMove[] {
  return mainline.map((node) => ({
    ply: node.ply,
    san: node.san,
    fen: node.fen,
    color: node.color === "w" || node.color === "b" ? node.color : "w",
  }));
}

function collectRepertoireSansAtPosition(
  repertoire: Repertoire,
  positionFen: string,
): { sans: string[]; parentNodeId?: string; gameIndex: number } {
  const index = buildPositionIndex(repertoire);
  const key = fenKey(positionFen);
  const entries = index.get(key) ?? [];
  const sans = new Set<string>();
  let parentNodeId: string | undefined;
  let gameIndex = 0;

  for (const entry of entries) {
    for (const ref of entry.nodeIds) {
      const game = repertoire.games[ref.gameIndex];
      if (!game) {
        continue;
      }
      const choices = getMoveChoices(game, ref.nodeId);
      if (choices.length === 0) {
        continue;
      }
      if (!parentNodeId) {
        parentNodeId = ref.nodeId;
        gameIndex = ref.gameIndex;
      }
      for (const choice of choices) {
        sans.add(choice.node.san);
      }
    }
  }

  return {
    sans: [...sans],
    parentNodeId,
    gameIndex,
  };
}

function expectedSanFromChoices(
  repertoire: Repertoire,
  positionFen: string,
): string | undefined {
  const index = buildPositionIndex(repertoire);
  const key = fenKey(positionFen);
  const entries = index.get(key) ?? [];

  for (const entry of entries) {
    for (const ref of entry.nodeIds) {
      const game = repertoire.games[ref.gameIndex];
      if (!game) {
        continue;
      }
      const choices = getMoveChoices(game, ref.nodeId);
      const mainline = choices.find((choice) => choice.isMainLine);
      if (mainline) {
        return mainline.node.san;
      }
      if (choices[0]) {
        return choices[0].node.san;
      }
    }
  }

  return undefined;
}

export function analyzeGameDeviation(
  game: StudyGame,
  repertoire: Repertoire,
  userColor: TrainingColor,
): DeviationAnalysisOutcome {
  const mainline = extractMainlineMoves(game);
  if (mainline.length === 0) {
    return { error: "No moves found in game." };
  }

  const gameMoves = toGameMoves(mainline);
  const userNodeColor = trainingColorToNodeColor(userColor);
  let inBookPlies = 0;

  for (let moveIndex = 0; moveIndex < mainline.length; moveIndex += 1) {
    const node = mainline[moveIndex]!;
    if (node.color !== userNodeColor) {
      continue;
    }

    const parent = node.parentId ? game.nodes[node.parentId] : undefined;
    const positionFen = parent?.fen ?? game.startFen;
    const { sans, parentNodeId, gameIndex } = collectRepertoireSansAtPosition(
      repertoire,
      positionFen,
    );

    if (sans.length === 0) {
      return {
        inBookPlies,
        totalPlies: mainline.length,
        deviation: {
          ply: node.ply,
          moveIndex,
          playedSan: node.san,
          positionFen,
          repertoireSans: [],
          parentNodeId,
          gameIndex,
        },
        gameMoves,
      };
    }

    const normalizedPlayed = node.san.replace(/[+#]$/, "");
    const inBook = sans.some(
      (san) => san.replace(/[+#]$/, "") === normalizedPlayed,
    );

    if (!inBook) {
      return {
        inBookPlies,
        totalPlies: mainline.length,
        deviation: {
          ply: node.ply,
          moveIndex,
          playedSan: node.san,
          positionFen,
          repertoireSans: sans,
          expectedSan: expectedSanFromChoices(repertoire, positionFen),
          parentNodeId,
          gameIndex,
        },
        gameMoves,
      };
    }

    inBookPlies += 1;
  }

  return {
    inBookPlies,
    totalPlies: mainline.length,
    deviation: null,
    gameMoves,
  };
}

export function isGameInBook(result: DeviationAnalysisOutcome): boolean {
  if (isDeviationError(result)) {
    return false;
  }
  return result.deviation === null;
}

export { isDeviationError };
