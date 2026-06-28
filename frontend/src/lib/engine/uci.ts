import { Chess } from "chess.js";
import type { PieceSymbol } from "chess.js";

import type { EngineEvaluation } from "./types";

export interface ParsedInfoLine {
  depth: number;
  scoreCp?: number;
  scoreMate?: number;
  pv: string[];
}

export function parseInfoLine(line: string): ParsedInfoLine | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("info ")) {
    return null;
  }

  const depthMatch = /\bdepth (\d+)\b/.exec(trimmed);
  if (!depthMatch) {
    return null;
  }

  const depth = Number.parseInt(depthMatch[1] ?? "", 10);
  if (!Number.isFinite(depth)) {
    return null;
  }

  let scoreCp: number | undefined;
  let scoreMate: number | undefined;

  const cpMatch = /\bscore cp (-?\d+)\b/.exec(trimmed);
  if (cpMatch) {
    scoreCp = Number.parseInt(cpMatch[1] ?? "", 10);
  }

  const mateMatch = /\bscore mate (-?\d+)\b/.exec(trimmed);
  if (mateMatch) {
    scoreMate = Number.parseInt(mateMatch[1] ?? "", 10);
  }

  const pvIndex = trimmed.indexOf(" pv ");
  const pv =
    pvIndex === -1
      ? []
      : trimmed
          .slice(pvIndex + 4)
          .trim()
          .split(/\s+/)
          .filter(Boolean);

  return { depth, scoreCp, scoreMate, pv };
}

export function parseBestMoveLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("bestmove ")) {
    return null;
  }
  const parts = trimmed.split(/\s+/);
  const move = parts[1];
  if (!move || move === "(none)") {
    return null;
  }
  return move;
}

export function infoLineToEvaluation(parsed: ParsedInfoLine): EngineEvaluation {
  return {
    depth: parsed.depth,
    scoreCp: parsed.scoreCp,
    scoreMate: parsed.scoreMate,
    pv: parsed.pv,
  };
}

export function formatEvalScore(
  evaluation: Pick<EngineEvaluation, "scoreCp" | "scoreMate">,
  orientation: "white" | "black" = "white",
): string {
  if (evaluation.scoreMate !== undefined) {
    const mate = evaluation.scoreMate;
    const orientedMate = orientation === "white" ? mate : -mate;
    if (orientedMate > 0) {
      return `M${orientedMate}`;
    }
    return `#${Math.abs(orientedMate)}`;
  }

  if (evaluation.scoreCp === undefined) {
    return "—";
  }

  const orientedCp = orientation === "white" ? evaluation.scoreCp : -evaluation.scoreCp;
  const pawns = orientedCp / 100;
  const sign = pawns > 0 ? "+" : "";
  return `${sign}${pawns.toFixed(2)}`;
}

export function evalBarPercent(
  evaluation: Pick<EngineEvaluation, "scoreCp" | "scoreMate">,
  orientation: "white" | "black" = "white",
): number {
  if (evaluation.scoreMate !== undefined) {
    const mate = orientation === "white" ? evaluation.scoreMate : -evaluation.scoreMate;
    return mate > 0 ? 100 : 0;
  }

  if (evaluation.scoreCp === undefined) {
    return 50;
  }

  const orientedCp = orientation === "white" ? evaluation.scoreCp : -evaluation.scoreCp;
  const clamped = Math.max(-800, Math.min(800, orientedCp));
  return 50 + (clamped / 800) * 50;
}

export function uciToSan(fen: string, uciMove: string): string | null {
  if (!uciMove || uciMove.length < 4) {
    return null;
  }
  try {
    const chess = new Chess(fen);
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
    const result = chess.move({
      from,
      to,
      promotion: promotion as PieceSymbol | undefined,
    });
    return result?.san ?? null;
  } catch {
    return null;
  }
}
