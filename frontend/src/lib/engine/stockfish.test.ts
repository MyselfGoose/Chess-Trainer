import { describe, expect, it, vi } from "vitest";

import {
  createStockfishEngine,
  resetStockfishEngine,
  setStockfishWorkerFactory,
  type WorkerLike,
} from "./stockfish";
import { EngineLoadError, EnginePositionError } from "./types";

function createMockWorker(): WorkerLike {
  let onmessage: ((event: MessageEvent<string>) => void) | null = null;

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
      if (command.startsWith("go depth")) {
        queueMicrotask(() => {
          emit("info depth 8 score cp 25 pv e2e4 e7e5");
          emit("info depth 12 score cp 34 pv e2e4 e7e5 g1f3");
          emit("bestmove e2e4 ponder e7e5");
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
}

describe("stockfish engine", () => {
  it("initializes through uci and isready", async () => {
    const engine = createStockfishEngine(() => createMockWorker());
    await expect(engine.init()).resolves.toBeUndefined();
  });

  it("yields progressive evaluations and best move", async () => {
    const engine = createStockfishEngine(() => createMockWorker());
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    await engine.setPosition(fen);

    const evaluations = [];
    for await (const evaluation of engine.analyze(12)) {
      evaluations.push(evaluation);
    }

    expect(evaluations.length).toBeGreaterThan(0);
    expect(evaluations.at(-1)?.bestMove).toBe("e2e4");
    expect(evaluations.some((entry) => entry.scoreCp === 34)).toBe(true);
  });

  it("rejects invalid FEN", async () => {
    const engine = createStockfishEngine(() => createMockWorker());
    await expect(engine.setPosition("not-a-fen")).rejects.toBeInstanceOf(
      EnginePositionError,
    );
  });

  it("rejects when mock worker never responds", async () => {
    vi.useFakeTimers();
    const worker: WorkerLike = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    };
    const engine = createStockfishEngine(() => worker);
    const initPromise = engine.init();
    const rejection = expect(initPromise).rejects.toBeInstanceOf(EngineLoadError);
    await vi.advanceTimersByTimeAsync(10_000);
    await rejection;
    vi.useRealTimers();
  });

  it("resets singleton factory override", () => {
    setStockfishWorkerFactory(() => createMockWorker());
    resetStockfishEngine();
    setStockfishWorkerFactory(null);
  });
});
