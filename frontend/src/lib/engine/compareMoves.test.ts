import { describe, expect, it, vi } from "vitest";

import {
  compareMoves,
  COMPARE_MOVES_MAX_ALTERNATIVES,
  evaluationToComparableCp,
  formatCompareDelta,
  runWithConcurrency,
  scoreForMoverFromEvaluation,
} from "./compareMoves";
import {
  createStockfishEngine,
  type WorkerLike,
} from "./stockfish";

const START_FEN =
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
const AFTER_E5 =
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2";
const AFTER_C5 =
  "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2";

function createScoredMockWorker(
  scoresByFen: Record<string, number>,
): () => WorkerLike {
  return () => {
    let onmessage: ((event: MessageEvent<string>) => void) | null = null;
    let currentFen = "";

    const emit = (line: string): void => {
      onmessage?.({ data: line } as MessageEvent<string>);
    };

    return {
      postMessage(command: string) {
        if (command === "uci") {
          queueMicrotask(() => emit("uciok"));
          return;
        }
        if (command === "isready") {
          queueMicrotask(() => emit("readyok"));
          return;
        }
        if (command.startsWith("position fen ")) {
          currentFen = command.slice("position fen ".length).trim();
          return;
        }
        if (command.startsWith("go depth")) {
          queueMicrotask(() => {
            const score = scoresByFen[currentFen] ?? 0;
            emit(`info depth 16 score cp ${score} pv e7e5`);
            emit("bestmove e7e5");
          });
        }
      },
      terminate: vi.fn(),
      get onmessage() {
        return onmessage;
      },
      set onmessage(handler) {
        onmessage = handler;
      },
      onerror: null,
    };
  };
}

describe("scoreForMoverFromEvaluation", () => {
  it("flips eval when opponent is to move after the move", () => {
    const result = scoreForMoverFromEvaluation(
      { scoreCp: 30, scoreMate: undefined, depth: 16, pv: [] },
      "b",
      AFTER_E5,
    );
    expect(result.scoreCp).toBe(-30);
    expect(result.scoreForMover).toBe(-30);
  });

  it("keeps eval when mover is to move after the move", () => {
    const result = scoreForMoverFromEvaluation(
      { scoreCp: 30, scoreMate: undefined, depth: 16, pv: [] },
      "w",
      AFTER_E5,
    );
    expect(result.scoreCp).toBe(30);
    expect(result.scoreForMover).toBe(30);
  });

  it("handles mate scores from mover perspective", () => {
    const result = scoreForMoverFromEvaluation(
      { scoreMate: 3, depth: 16, pv: [] },
      "b",
      AFTER_E5,
    );
    expect(result.scoreMate).toBe(-3);
    expect(result.scoreForMover).toBeLessThan(-9_000);
  });
});

describe("evaluationToComparableCp", () => {
  it("orders mate ahead of centipawns", () => {
    expect(evaluationToComparableCp({ scoreMate: 2 })).toBeGreaterThan(
      evaluationToComparableCp({ scoreCp: 500 }),
    );
  });
});

describe("runWithConcurrency", () => {
  it("runs tasks with limited concurrency", async () => {
    let active = 0;
    let maxActive = 0;
    const tasks = Array.from({ length: 4 }, (_, index) => async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return index;
    });

    const results = await runWithConcurrency(tasks, 2);
    expect(results).toEqual([0, 1, 2, 3]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});

describe("compareMoves", () => {
  it("ranks alternatives and computes delta from best", async () => {
    const engine = createStockfishEngine(
      createScoredMockWorker({
        [AFTER_E5]: -20,
        [AFTER_C5]: 40,
      }),
    );

    const results = await compareMoves(engine, {
      parentFen: START_FEN,
      moverColor: "b",
      alternatives: [
        { nodeId: "e5", san: "e5", fenAfter: AFTER_E5 },
        { nodeId: "c5", san: "c5", fenAfter: AFTER_C5 },
      ],
      concurrency: 2,
    });

    expect(results).toHaveLength(2);
    expect(results[0]?.rank).toBe(1);
    expect(results[0]?.deltaFromBestCp).toBe(0);
    expect(results[1]?.deltaFromBestCp).toBeLessThan(0);
    expect(results[0]?.nodeId).toBe("e5");
  });

  it("analyzes at most three alternatives", async () => {
    const engine = createStockfishEngine(createScoredMockWorker({}));
    const alternatives = Array.from({ length: 5 }, (_, index) => ({
      nodeId: `n${index}`,
      san: `m${index}`,
      fenAfter: AFTER_E5,
    }));

    const results = await compareMoves(engine, {
      parentFen: START_FEN,
      moverColor: "b",
      alternatives,
    });

    expect(results).toHaveLength(COMPARE_MOVES_MAX_ALTERNATIVES);
  });

  it("rejects invalid parent FEN", async () => {
    const engine = createStockfishEngine(createScoredMockWorker({}));
    await expect(
      compareMoves(engine, {
        parentFen: "invalid",
        moverColor: "w",
        alternatives: [],
      }),
    ).rejects.toThrow("Invalid parent FEN");
  });

  it("propagates engine failures", async () => {
    vi.useFakeTimers();
    const worker: WorkerLike = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    };
    const engine = createStockfishEngine(() => worker);
    const promise = compareMoves(engine, {
      parentFen: START_FEN,
      moverColor: "b",
      alternatives: [{ nodeId: "e5", san: "e5", fenAfter: AFTER_E5 }],
    });
    const rejection = expect(promise).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(10_000);
    await rejection;
    vi.useRealTimers();
  });
});

describe("formatCompareDelta", () => {
  it("formats zero and negative deltas", () => {
    expect(formatCompareDelta(0)).toBe("0.00");
    expect(formatCompareDelta(-21)).toBe("-0.21");
  });
});
