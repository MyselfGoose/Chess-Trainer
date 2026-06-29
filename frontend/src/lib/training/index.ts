export {
  buildLegacyTrainingConfig,
  createDefaultTrainingConfig,
  decodeTrainingConfig,
  encodeTrainingConfig,
} from "./config";
export type { TrainingMode, OpponentPolicy, TrainingSessionConfig, PlyRange } from "./config";
export {
  advanceFromFeedback,
  applyNextOpponentMove,
  applyOpponentStep,
  createTrainingEngine,
  endTrainingEarly,
  getCurrentLine,
  getExpectedUserMove,
  getTrainingPositionContext,
  hasPendingOpponentAnimation,
  startLineWalk,
  tryUserMove,
} from "./engine";
export type {
  CreateTrainingEngineInput,
  TrainingEngineState,
  TrainingPositionContext,
} from "./engine";
export {
  formatLastTrained,
  formatPassRate,
  getLastSessionForRepertoire,
  getRepertoireStats,
  getTrainingHistory,
  saveTrainingSession,
} from "./history";
export type { RepertoireTrainingStats } from "./history";
export {
  countTrainableLines,
  countUserMovesInLine,
  extractTrainingLines,
  filterLinesForColor,
  filterLinesFromAnchor,
  filterLinesFromAnchorForGame,
  applySessionLineLimit,
  shuffleLines,
} from "./lines";
export {
  aggregateLineStats,
  computePassRateTrend,
  findWeakLines,
} from "./lineStats";
export type { LineStatsSummary } from "./lineStats";
export { prioritizeLines, qualityFromPass, scheduleAfterReview } from "./scheduler";
export {
  isTrainingSoundEnabled,
  playFailSound,
  playPassSound,
  setTrainingSoundEnabled,
  TRAINING_SOUND_KEY,
} from "./sounds";
export {
  getAllMasteryRecords,
  getDueLines,
  getMastery,
  getMasteryForRepertoire,
  LINE_MASTERY_KEY,
  recordLineResult,
  replaceAllMastery,
  upsertMastery,
  utcDateString,
} from "./mastery";
export type { LineMastery, MasteryLevel } from "./mastery";
export {
  applyFailureDrillToLines,
  buildFailureDrillLine,
  failurePlyFromMastery,
  failurePlyFromResult,
  linesWithFailurePly,
} from "./failureDrill";
export {
  applyPlyRangeToLines,
  countLinesAfterPlyRange,
  sliceLineToPlyRange,
  userMovePlyIndices,
} from "./microLines";
export {
  collectLinesForRepertoires,
  defaultOpeningKey,
  interleaveLines,
} from "./interleaved";
export { prepareTrainingSessionLines } from "./sessionLines";
export {
  computeReadinessBreakdown,
  computeReadinessScore,
  lineReadinessWeight,
  READINESS_WEIGHTS,
} from "./readiness";
export type { ReadinessBreakdown } from "./readiness";
export type {
  TrainingColor,
  TrainingFeedback,
  TrainingLine,
  TrainingLineResult,
  TrainingPhase,
  TrainingPositionHint,
  TrainingSessionSummary,
} from "./types";
export {
  nodeColorToTrainingColor,
  trainingColorToNodeColor,
} from "./types";
