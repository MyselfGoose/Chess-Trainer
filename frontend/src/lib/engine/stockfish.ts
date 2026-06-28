import { isValidFen } from "@/lib/chess/fen";

import {
  infoLineToEvaluation,
  parseBestMoveLine,
  parseInfoLine,
} from "./uci";
import {
  ENGINE_WORKER_PATH,
  EngineLoadError,
  EnginePositionError,
  type EngineEvaluation,
  type StockfishEngine,
} from "./types";

const INIT_TIMEOUT_MS = 10_000;

export interface WorkerLike {
  postMessage(message: string): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export type WorkerFactory = () => WorkerLike;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

function defaultWorkerFactory(): WorkerLike {
  if (!isBrowser()) {
    throw new EngineLoadError("Stockfish worker is only available in the browser.");
  }
  return new window.Worker(ENGINE_WORKER_PATH);
}

function createStockfishEngine(workerFactory: WorkerFactory): StockfishEngine {
  let worker: WorkerLike | null = null;
  let initialized = false;
  let currentFen: string | null = null;
  let analyzing = false;
  let activeListeners: Array<(line: string) => void> = [];
  let pendingWait:
    | {
        predicate: (line: string) => boolean;
        resolve: (line: string) => void;
        reject: (error: Error) => void;
        timeout: ReturnType<typeof setTimeout>;
      }
    | null = null;

  const dispatchLine = (line: string): void => {
    for (const listener of activeListeners) {
      listener(line);
    }
  };

  const handleWorkerMessage = (line: string): void => {
    if (pendingWait?.predicate(line)) {
      const wait = pendingWait;
      pendingWait = null;
      clearTimeout(wait.timeout);
      wait.resolve(line);
      return;
    }
    dispatchLine(line);
  };

  const attachWorkerHandlers = (): void => {
    if (!worker) {
      return;
    }
    worker.onmessage = (event: MessageEvent<string>) => {
      handleWorkerMessage(String(event.data));
    };
    worker.onerror = () => {
      analyzing = false;
      pendingWait?.reject(new EngineLoadError("Stockfish worker failed to load."));
      pendingWait = null;
      dispatchLine("error worker crashed");
    };
  };

  const ensureWorker = (): WorkerLike => {
    if (!worker) {
      worker = workerFactory();
      attachWorkerHandlers();
    }
    return worker;
  };

  const send = (command: string): void => {
    ensureWorker().postMessage(command);
  };

  const waitForLine = (
    predicate: (line: string) => boolean,
    timeoutMs: number,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (pendingWait) {
        clearTimeout(pendingWait.timeout);
      }
      const timeout = setTimeout(() => {
        pendingWait = null;
        reject(new EngineLoadError("Stockfish engine timed out."));
      }, timeoutMs);
      pendingWait = {
        predicate,
        resolve,
        reject,
        timeout,
      };
    });
  };

  return {
    async init(): Promise<void> {
      if (initialized) {
        return;
      }
      ensureWorker();
      send("uci");
      await waitForLine((line) => line.trim() === "uciok", INIT_TIMEOUT_MS);
      send("isready");
      await waitForLine((line) => line.trim() === "readyok", INIT_TIMEOUT_MS);
      send("setoption name UCI_AnalyseMode value true");
      initialized = true;
    },

    async setPosition(fen: string, moves: string[] = []): Promise<void> {
      if (!isValidFen(fen)) {
        throw new EnginePositionError("Invalid FEN for engine analysis.");
      }
      if (analyzing) {
        this.stop();
      }
      await this.init();
      currentFen = fen;
      const moveSuffix = moves.length > 0 ? ` moves ${moves.join(" ")}` : "";
      send(`position fen ${fen}${moveSuffix}`);
    },

    async *analyze(depth: number): AsyncIterable<EngineEvaluation> {
      if (!currentFen) {
        throw new EnginePositionError("Engine position not set.");
      }
      await this.init();

      const queue: EngineEvaluation[] = [];
      let resolveNext: ((value: IteratorResult<EngineEvaluation>) => void) | null =
        null;
      let finished = false;
      let lastEvaluation: EngineEvaluation | null = null;

      const pushEvaluation = (evaluation: EngineEvaluation): void => {
        lastEvaluation = evaluation;
        if (resolveNext) {
          const resolve = resolveNext;
          resolveNext = null;
          resolve({ value: evaluation, done: false });
        } else {
          queue.push(evaluation);
        }
      };

      const finish = (bestMove: string | null): void => {
        if (finished) {
          return;
        }
        finished = true;
        analyzing = false;
        if (bestMove && lastEvaluation) {
          pushEvaluation({ ...lastEvaluation, bestMove });
        } else if (bestMove) {
          pushEvaluation({ depth: 0, pv: [], bestMove });
        } else if (resolveNext) {
          const resolve = resolveNext;
          resolveNext = null;
          resolve({ value: undefined as unknown as EngineEvaluation, done: true });
        }
      };

      const listener = (line: string): void => {
        const info = parseInfoLine(line);
        if (info) {
          pushEvaluation(infoLineToEvaluation(info));
          return;
        }
        const bestMove = parseBestMoveLine(line);
        if (bestMove) {
          finish(bestMove);
        }
      };

      activeListeners.push(listener);
      analyzing = true;
      send(`go depth ${depth}`);

      try {
        while (!finished || queue.length > 0) {
          if (queue.length > 0) {
            yield queue.shift()!;
            continue;
          }
          const next = await new Promise<IteratorResult<EngineEvaluation>>(
            (resolve) => {
              resolveNext = resolve;
            },
          );
          if (next.done) {
            break;
          }
          yield next.value;
        }
      } finally {
        activeListeners = activeListeners.filter((entry) => entry !== listener);
      }
    },

    stop(): void {
      if (!worker || !analyzing) {
        return;
      }
      send("stop");
      analyzing = false;
    },

    destroy(): void {
      if (!worker) {
        return;
      }
      try {
        send("quit");
      } catch {
        // Worker may already be terminated.
      }
      worker.terminate();
      worker = null;
      initialized = false;
      analyzing = false;
      currentFen = null;
      activeListeners = [];
    },
  };
}

let engineInstance: StockfishEngine | null = null;
let workerFactoryOverride: WorkerFactory | null = null;

export function setStockfishWorkerFactory(factory: WorkerFactory | null): void {
  workerFactoryOverride = factory;
  if (engineInstance) {
    engineInstance.destroy();
    engineInstance = null;
  }
}

export function getStockfishEngine(): StockfishEngine {
  if (!engineInstance) {
    const factory = workerFactoryOverride ?? defaultWorkerFactory;
    engineInstance = createStockfishEngine(factory);
  }
  return engineInstance;
}

export function resetStockfishEngine(): void {
  if (engineInstance) {
    engineInstance.destroy();
    engineInstance = null;
  }
}

export { createStockfishEngine };
