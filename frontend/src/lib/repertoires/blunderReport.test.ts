import { describe, expect, it, vi } from "vitest";
import type { Square } from "chess.js";

import {
  createStockfishEngine,
  type WorkerLike,
} from "@/lib/engine/stockfish";
import { DEFAULT_REPERTOIRE_META } from "@/lib/repertoires/meta";
import {
  applyMove,
  createEmptyStudyGame,
  resetNodeCounter,
} from "@/lib/repertoires/treeBuilder";
import type { Repertoire } from "@/lib/repertoires/types";

import {
  BLUNDER_DROP_THRESHOLD_CP,
  collectScanTargets,
  computeEvalDrop,
  countScanNodes,
  isValidBlunderReport,
  scanRepertoireForBlunders,
  shouldFlagBlunder,
} from "./blunderReport";

function buildSimpleRepertoire(): Repertoire {
  resetNodeCounter();
  let game = createEmptyStudyGame("Main");
  const e4 = applyMove(game, game.rootId, "e2" as Square, "e4" as Square)!;
  game = e4.game;
  const c5 = applyMove(game, e4.nodeId, "c7" as Square, "c5" as Square)!;
  game = c5.game;

  return {
    id: "rep-blunder",
    name: "Blunder Test",
    source: "imported",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    games: [game],
    registeredLeafIds: [],
    meta: { ...DEFAULT_REPERTOIRE_META },
  };
}

function createFenScoredMockWorker(
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
            emit(`info depth 14 score cp ${score} pv e2e4`);
            emit("bestmove e2e4");
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

describe("blunderReport helpers", () => {
  it("flags drops above threshold", () => {
    expect(shouldFlagBlunder(250, BLUNDER_DROP_THRESHOLD_CP)).toBe(true);
    expect(shouldFlagBlunder(200, BLUNDER_DROP_THRESHOLD_CP)).toBe(false);
    expect(computeEvalDrop(400, 100)).toBe(300);
  });

  it("collects non-root nodes with valid parents", () => {
    const repertoire = buildSimpleRepertoire();
    const targets = collectScanTargets(repertoire);
    expect(targets.length).toBe(2);
    expect(countScanNodes(repertoire)).toBe(2);
  });

  it("validates report shape", () => {
    expect(
      isValidBlunderReport({
        repertoireId: "rep-blunder",
        scannedAt: "2026-01-01T00:00:00.000Z",
        depth: 14,
        thresholdCp: 200,
        nodesScanned: 2,
        flags: [],
      }),
    ).toBe(true);
    expect(isValidBlunderReport({})).toBe(false);
  });
});

describe("scanRepertoireForBlunders", () => {
  it("flags nodes with large eval drops", async () => {
    const repertoire = buildSimpleRepertoire();
    const e4Node = repertoire.games[0]!.nodes[
      repertoire.games[0]!.nodes[repertoire.games[0]!.rootId]!.childIds[0]!
    ]!;
    const c5Node = repertoire.games[0]!.nodes[e4Node.childIds[0]!]!;

    const engine = createStockfishEngine(
      createFenScoredMockWorker({
        [e4Node.fen]: 300,
        [c5Node.fen]: 0,
      }),
    );

    const progress: number[] = [];
    const report = await scanRepertoireForBlunders(engine, {
      repertoire,
      onProgress: (entry) => progress.push(entry.done),
    });

    expect(report.flags.length).toBeGreaterThan(0);
    expect(report.flags[0]?.dropCp).toBeGreaterThan(BLUNDER_DROP_THRESHOLD_CP);
    expect(progress).toEqual([1, 2]);
  });

  it("returns empty flags when drops are small", async () => {
    const repertoire = buildSimpleRepertoire();
    const engine = createStockfishEngine(createFenScoredMockWorker({}));

    const report = await scanRepertoireForBlunders(engine, { repertoire });
    expect(report.flags).toHaveLength(0);
  });

  it("honours cancel callback", async () => {
    const repertoire = buildSimpleRepertoire();
    const engine = createStockfishEngine(createFenScoredMockWorker({}));
    let cancelled = false;

    const report = await scanRepertoireForBlunders(engine, {
      repertoire,
      shouldCancel: () => cancelled,
      onProgress: () => {
        cancelled = true;
      },
    });

    expect(report.nodesScanned).toBe(2);
    expect(report.flags).toHaveLength(0);
  });
});
