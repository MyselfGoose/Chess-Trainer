import type { TrainingColor } from "./types";

export type TrainingMode = "learn" | "drill" | "test" | "survival";
export type OpponentPolicy = "mainline" | "random" | "weighted";

export interface TrainingSessionConfig {
  repertoireId: string;
  userColor: TrainingColor;
  mode: TrainingMode;
  /** Explicit line IDs; empty = all lines for color after filters */
  lineIds: string[];
  /** Max lines this session; 0 = all selected */
  maxLines: number;
  /** Start from this node path (train-from-here) */
  anchorLeafNodeId?: string;
  showCommentsAfterLine: boolean;
  soundEnabled: boolean;
  opponentPolicy: OpponentPolicy;
}

function isTrainingColor(value: unknown): value is TrainingColor {
  return value === "white" || value === "black";
}

function isTrainingMode(value: unknown): value is TrainingMode {
  return (
    value === "learn" ||
    value === "drill" ||
    value === "test" ||
    value === "survival"
  );
}

function isOpponentPolicy(value: unknown): value is OpponentPolicy {
  return value === "mainline" || value === "random" || value === "weighted";
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function validateConfig(value: unknown): TrainingSessionConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.repertoireId !== "string" ||
    !isTrainingColor(record.userColor) ||
    !isTrainingMode(record.mode) ||
    !isStringArray(record.lineIds) ||
    typeof record.maxLines !== "number" ||
    typeof record.showCommentsAfterLine !== "boolean" ||
    typeof record.soundEnabled !== "boolean"
  ) {
    return null;
  }
  if (
    record.opponentPolicy !== undefined &&
    !isOpponentPolicy(record.opponentPolicy)
  ) {
    return null;
  }
  if (
    record.anchorLeafNodeId !== undefined &&
    typeof record.anchorLeafNodeId !== "string"
  ) {
    return null;
  }
  return {
    repertoireId: record.repertoireId,
    userColor: record.userColor,
    mode: record.mode,
    lineIds: record.lineIds,
    maxLines: record.maxLines,
    anchorLeafNodeId: record.anchorLeafNodeId,
    showCommentsAfterLine: record.showCommentsAfterLine,
    soundEnabled: record.soundEnabled,
    opponentPolicy: isOpponentPolicy(record.opponentPolicy)
      ? record.opponentPolicy
      : "mainline",
  };
}

function toBase64Url(json: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function createDefaultTrainingConfig(
  repertoireId: string,
  userColor: TrainingColor,
): TrainingSessionConfig {
  return {
    repertoireId,
    userColor,
    mode: "drill",
    lineIds: [],
    maxLines: 0,
    showCommentsAfterLine: false,
    soundEnabled: true,
    opponentPolicy: "mainline",
  };
}

export function encodeTrainingConfig(config: TrainingSessionConfig): string {
  return toBase64Url(JSON.stringify(config));
}

export function decodeTrainingConfig(
  encoded: string,
): TrainingSessionConfig | null {
  if (!encoded) {
    return null;
  }
  try {
    const json = fromBase64Url(encoded);
    const parsed: unknown = JSON.parse(json);
    return validateConfig(parsed);
  } catch {
    return null;
  }
}

export function buildLegacyTrainingConfig(
  repertoireId: string,
  userColor: TrainingColor,
  lineIds: string[],
): TrainingSessionConfig {
  return {
    ...createDefaultTrainingConfig(repertoireId, userColor),
    lineIds,
  };
}
