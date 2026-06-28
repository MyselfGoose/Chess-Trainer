export interface EngineEvaluation {
  depth: number;
  scoreCp?: number;
  scoreMate?: number;
  pv: string[];
  bestMove?: string;
}

export type EngineStatus =
  | "idle"
  | "loading"
  | "ready"
  | "analyzing"
  | "error"
  | "unavailable";

export interface StockfishEngine {
  init(): Promise<void>;
  setPosition(fen: string, moves?: string[]): Promise<void>;
  analyze(depth: number): AsyncIterable<EngineEvaluation>;
  stop(): void;
  destroy(): void;
}

export class EngineLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineLoadError";
  }
}

export class EnginePositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnginePositionError";
  }
}

export const ENGINE_WORKER_PATH = "/engine/stockfish-18-lite-single.js";

export const ENGINE_DEPTH = {
  desktopDefault: 18,
  desktopMax: 22,
  mobileDefault: 14,
  mobileMax: 18,
} as const;
