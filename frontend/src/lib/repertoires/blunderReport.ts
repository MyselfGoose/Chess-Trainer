import { isValidFen } from "@/lib/chess/fen";
import {
  evaluationToComparableCp,
  scoreForMoverFromEvaluation,
  sideToMoveFromFen,
} from "@/lib/engine/compareMoves";
import type { EngineEvaluation, StockfishEngine } from "@/lib/engine/types";
import type { StudyNode } from "@/lib/pgn/types";
import type { Repertoire } from "@/lib/repertoires/types";

export const BLUNDER_DROP_THRESHOLD_CP = 200;
export const BLUNDER_SCAN_DEPTH = 14;
export const BLUNDER_REPORT_STORAGE_PREFIX = "chess:blunder-report:";

export interface BlunderFlag {
  gameIndex: number;
  nodeId: string;
  parentNodeId: string;
  san: string;
  pathLabel: string;
  dropCp: number;
  evalBeforeCp: number;
  evalAfterCp: number;
}

export interface BlunderReport {
  repertoireId: string;
  scannedAt: string;
  depth: number;
  thresholdCp: number;
  flags: BlunderFlag[];
  nodesScanned: number;
}

export interface BlunderScanProgress {
  done: number;
  total: number;
  currentLabel?: string;
}

export interface ScanNodeTarget {
  gameIndex: number;
  node: StudyNode;
  parent: StudyNode;
}

export function collectScanTargets(repertoire: Repertoire): ScanNodeTarget[] {
  const targets: ScanNodeTarget[] = [];

  repertoire.games.forEach((game, gameIndex) => {
    for (const node of Object.values(game.nodes)) {
      if (node.id === game.rootId || !node.parentId) {
        continue;
      }
      const parent = game.nodes[node.parentId];
      if (!parent || !isValidFen(parent.fen) || !isValidFen(node.fen)) {
        continue;
      }
      targets.push({ gameIndex, node, parent });
    }
  });

  return targets;
}

async function analyzeToComparableCp(
  engine: StockfishEngine,
  fen: string,
  moverColor: "w" | "b",
  depth: number,
): Promise<number> {
  await engine.init();
  await engine.setPosition(fen);
  let lastEvaluation: EngineEvaluation | null = null;
  for await (const evaluation of engine.analyze(depth)) {
    lastEvaluation = evaluation;
  }
  if (!lastEvaluation) {
    throw new Error("Engine returned no evaluation.");
  }
  const moverScore = scoreForMoverFromEvaluation(
    lastEvaluation,
    moverColor,
    fen,
  );
  return moverScore.scoreForMover;
}

export function computeEvalDrop(evalBeforeCp: number, evalAfterCp: number): number {
  return evalBeforeCp - evalAfterCp;
}

export function shouldFlagBlunder(dropCp: number, thresholdCp: number): boolean {
  return dropCp > thresholdCp;
}

export interface ScanRepertoireOptions {
  repertoire: Repertoire;
  depth?: number;
  thresholdCp?: number;
  shouldCancel?: () => boolean;
  onProgress?: (progress: BlunderScanProgress) => void;
}

export async function scanRepertoireForBlunders(
  engine: StockfishEngine,
  options: ScanRepertoireOptions,
): Promise<BlunderReport> {
  const {
    repertoire,
    depth = BLUNDER_SCAN_DEPTH,
    thresholdCp = BLUNDER_DROP_THRESHOLD_CP,
    shouldCancel,
    onProgress,
  } = options;

  const targets = collectScanTargets(repertoire);
  const flags: BlunderFlag[] = [];

  engine.stop();
  await engine.init();

  for (let index = 0; index < targets.length; index += 1) {
    if (shouldCancel?.()) {
      break;
    }

    const target = targets[index]!;
    const moverColor = sideToMoveFromFen(target.parent.fen);
    if (!moverColor) {
      onProgress?.({
        done: index + 1,
        total: targets.length,
        currentLabel: target.node.pathLabel,
      });
      continue;
    }

    const evalBeforeCp = await analyzeToComparableCp(
      engine,
      target.parent.fen,
      moverColor,
      depth,
    );

    if (shouldCancel?.()) {
      break;
    }

    const evalAfterCp = await analyzeToComparableCp(
      engine,
      target.node.fen,
      moverColor,
      depth,
    );

    const dropCp = computeEvalDrop(evalBeforeCp, evalAfterCp);
    if (shouldFlagBlunder(dropCp, thresholdCp)) {
      flags.push({
        gameIndex: target.gameIndex,
        nodeId: target.node.id,
        parentNodeId: target.parent.id,
        san: target.node.san,
        pathLabel: target.node.pathLabel,
        dropCp,
        evalBeforeCp,
        evalAfterCp,
      });
    }

    onProgress?.({
      done: index + 1,
      total: targets.length,
      currentLabel: target.node.pathLabel,
    });

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  return {
    repertoireId: repertoire.id,
    scannedAt: new Date().toISOString(),
    depth,
    thresholdCp,
    flags,
    nodesScanned: targets.length,
  };
}

export function isValidBlunderFlag(value: unknown): value is BlunderFlag {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.gameIndex === "number" &&
    typeof record.nodeId === "string" &&
    typeof record.parentNodeId === "string" &&
    typeof record.san === "string" &&
    typeof record.pathLabel === "string" &&
    typeof record.dropCp === "number" &&
    typeof record.evalBeforeCp === "number" &&
    typeof record.evalAfterCp === "number"
  );
}

export function isValidBlunderReport(value: unknown): value is BlunderReport {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.repertoireId === "string" &&
    typeof record.scannedAt === "string" &&
    typeof record.depth === "number" &&
    typeof record.thresholdCp === "number" &&
    typeof record.nodesScanned === "number" &&
    Array.isArray(record.flags) &&
    record.flags.every(isValidBlunderFlag)
  );
}

export function blunderReportStorageKey(repertoireId: string): string {
  return `${BLUNDER_REPORT_STORAGE_PREFIX}${repertoireId}`;
}

export function loadBlunderReport(repertoireId: string): BlunderReport | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(blunderReportStorageKey(repertoireId));
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isValidBlunderReport(parsed) || parsed.repertoireId !== repertoireId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveBlunderReport(report: BlunderReport): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    blunderReportStorageKey(report.repertoireId),
    JSON.stringify(report),
  );
}

export function clearBlunderReport(repertoireId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(blunderReportStorageKey(repertoireId));
}

export function formatDropCp(dropCp: number): string {
  const pawns = dropCp / 100;
  return `−${pawns.toFixed(1)}`;
}

export function countScanNodes(repertoire: Repertoire): number {
  return collectScanTargets(repertoire).length;
}

export { evaluationToComparableCp };
