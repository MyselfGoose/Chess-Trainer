export {
  createRepertoire,
  deleteRepertoire,
  getRepertoire,
  listRepertoires,
  RepertoireStorageError,
  saveRepertoire,
  updateRepertoire,
} from "./storage";
export type { CreateRepertoireInput } from "./storage";
export {
  clearStudySession,
  createDefaultStudySession,
  loadStudySession,
  saveStudySession,
} from "./session";
export {
  applyMove,
  buildPath,
  canUndoMove,
  createEmptyStudyGame,
  getRegisteredLines,
  isLeaf,
  registerLine,
  syncNodeCounterFromGame,
  undoLastMove,
  unregisterLine,
} from "./treeBuilder";
export type { RegisteredLine } from "./treeBuilder";
export {
  cloneStudyGame,
  forkRepertoire,
} from "./fork";
export type {
  CloneGameResult,
  ForkRegisterStrategy,
  ForkRepertoireOptions,
} from "./fork";
export {
  removeRegisteredLeaves,
  updateNodeAnnotations,
  updateNodeComment,
} from "./nodeEditor";
export {
  computePruneImpact,
  pruneSubtree,
} from "./pruneImpact";
export type { PruneImpact } from "./pruneImpact";
export {
  canRedo,
  canUndo,
  createEmptyUndoStack,
  createSnapshot,
  MAX_UNDO_SNAPSHOTS,
  popRedo,
  popUndo,
  pushSnapshot,
} from "./undoStack";
export type { BuilderSnapshot, UndoStackState } from "./undoStack";
export {
  cloneSubtree,
  collapseEmptyBranches,
  deleteSubtree,
  findEmptyBranches,
  graftSubtree,
} from "./treeMutations";
export type { TreeMutationResult } from "./treeMutations";
export {
  addChapter,
  addRepertoireTag,
  applySuggestedChapters,
  assignLinesToChapter,
  createChapter,
  deleteChapter,
  filterLinesByChapterIds,
  filterLinesByChapters,
  getChaptersForLine,
  moveChapter,
  removeLinesFromChapter,
  removeRepertoireTag,
  reorderChapters,
  setChapterLines,
  sortedChapters,
  suggestChaptersFromLines,
  updateChapter,
} from "./chapters";
export type { SuggestedChapter } from "./chapters";
export { mergeRepertoires } from "./merge";
export type { MergeRepertoiresOptions, MergeRepertoiresResult } from "./merge";
export {
  applyBulkRegister,
  findLeavesAtMaxDepth,
  mergeRegisteredLeaves,
  previewBulkRegister,
} from "./bulkRegister";
export type { BulkRegisterPreview } from "./bulkRegister";
export {
  checkGraftFenMatch,
  copyLineToGame,
  CopyLineError,
  previewCopyLineSan,
  resolveSourceRootChildId,
} from "./copyLine";
export type { CopyLineRequest, GraftFenCheck } from "./copyLine";
export { gameHasMoves, setGameStartFen } from "./setStartFen";
export {
  computeRepertoireAnalytics,
  type ChapterBreakdownRow,
  type DepthBucket,
  type OpeningCount,
  type RepertoireAnalytics,
} from "./analytics";
export {
  bumpRepertoireVersion,
  DEFAULT_REPERTOIRE_META,
  isValidRepertoire,
  isValidRepertoireMeta,
  migrateRepertoire,
} from "./meta";
export {
  BLUNDER_DROP_THRESHOLD_CP,
  BLUNDER_SCAN_DEPTH,
  blunderReportStorageKey,
  clearBlunderReport,
  collectScanTargets,
  countScanNodes,
  formatDropCp,
  isValidBlunderReport,
  loadBlunderReport,
  saveBlunderReport,
  scanRepertoireForBlunders,
  type BlunderFlag,
  type BlunderReport,
  type BlunderScanProgress,
} from "./blunderReport";
export type {
  Repertoire,
  RepertoireChapter,
  RepertoireMeta,
  RepertoireSource,
  BoardOrientation,
  StudySessionState,
} from "./types";
export {
  MAX_CATALOG_BYTES,
  REPERTOIRE_CATALOG_KEY,
  REPERTOIRE_NAME_MAX_LENGTH,
  studySessionKey,
} from "./types";
