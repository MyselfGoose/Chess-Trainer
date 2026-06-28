export const TRAINING_SOUND_KEY = "chess:training-sound";

export const SOUND_PATHS = {
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  move: "/sounds/move.mp3",
  capture: "/sounds/capture.mp3",
  notification: "/sounds/notification.mp3",
  castle: "/sounds/castle.mp3",
  checkmate: "/sounds/checkmate.webm",
  move_check: "/sounds/move_check.mp3",
  promote: "/sounds/promote.mp3",
} as const;

export type SoundId = keyof typeof SOUND_PATHS;

export type MoveSoundType =
  | "checkmate"
  | "promote"
  | "castle"
  | "capture"
  | "move_check"
  | "move";

/** Target peak level after per-clip normalization (0–1). */
const MASTER_GAIN = 0.42;

export interface ChessMoveSoundOptions {
  san?: string;
  captured?: string | null;
  promotion?: string | null;
  flags?: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function prefersReducedMotion(): boolean {
  if (!isBrowser()) {
    return true;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isSoundEnabled(): boolean {
  if (!isBrowser() || typeof localStorage === "undefined") {
    return false;
  }
  if (prefersReducedMotion()) {
    return false;
  }
  const raw = localStorage.getItem(TRAINING_SOUND_KEY);
  return raw === null ? true : raw === "true";
}

let audioContext: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
const peakCache = new Map<string, number>();

async function getAudioContext(): Promise<AudioContext | null> {
  if (!isBrowser()) {
    return null;
  }
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

function measurePeak(buffer: AudioBuffer): number {
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel);
    for (let index = 0; index < samples.length; index += 1) {
      const sample = Math.abs(samples[index] ?? 0);
      if (sample > peak) {
        peak = sample;
      }
    }
  }
  return peak;
}

function getNormalizedGain(url: string, buffer: AudioBuffer): number {
  const cachedPeak = peakCache.get(url);
  const peak = cachedPeak ?? measurePeak(buffer);
  if (cachedPeak === undefined) {
    peakCache.set(url, peak);
  }
  const normalize = peak > 0 ? 1 / peak : 1;
  return MASTER_GAIN * normalize;
}

async function loadBuffer(
  ctx: AudioContext,
  url: string,
): Promise<AudioBuffer | null> {
  const cached = bufferCache.get(url);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const data = await response.arrayBuffer();
    const buffer = await ctx.decodeAudioData(data);
    bufferCache.set(url, buffer);
    return buffer;
  } catch {
    return null;
  }
}

async function playSound(url: string): Promise<void> {
  if (!isSoundEnabled()) {
    return;
  }
  const ctx = await getAudioContext();
  if (!ctx) {
    return;
  }
  const buffer = await loadBuffer(ctx, url);
  if (!buffer) {
    return;
  }
  try {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = getNormalizedGain(url, buffer);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // Autoplay blocked or audio unavailable
  }
}

export function playCorrectSound(): void {
  void playSound(SOUND_PATHS.correct);
}

export function playWrongSound(): void {
  void playSound(SOUND_PATHS.wrong);
}

export function playMoveSound(): void {
  void playSound(SOUND_PATHS.move);
}

export function playCaptureSound(): void {
  void playSound(SOUND_PATHS.capture);
}

export function playNotificationSound(): void {
  void playSound(SOUND_PATHS.notification);
}

export function playCastleSound(): void {
  void playSound(SOUND_PATHS.castle);
}

export function playCheckmateSound(): void {
  void playSound(SOUND_PATHS.checkmate);
}

export function playMoveCheckSound(): void {
  void playSound(SOUND_PATHS.move_check);
}

export function playPromoteSound(): void {
  void playSound(SOUND_PATHS.promote);
}

export function isCaptureSan(san: string): boolean {
  return san.includes("x");
}

export function isCastleSan(san: string): boolean {
  const normalized = san.replace(/0/g, "O");
  return normalized === "O-O" || normalized === "O-O-O";
}

export function isPromotionSan(san: string): boolean {
  return san.includes("=");
}

export function isCheckmateSan(san: string): boolean {
  return san.includes("#");
}

export function isCheckSan(san: string): boolean {
  return san.includes("+");
}

function isCastleMove(options: ChessMoveSoundOptions): boolean {
  if (options.san && isCastleSan(options.san)) {
    return true;
  }
  if (options.flags) {
    return options.flags.includes("k") || options.flags.includes("q");
  }
  return false;
}

function isPromotionMove(options: ChessMoveSoundOptions): boolean {
  if (options.promotion) {
    return true;
  }
  return options.san != null && isPromotionSan(options.san);
}

function isCaptureMove(options: ChessMoveSoundOptions): boolean {
  if (options.captured) {
    return true;
  }
  return options.san != null && isCaptureSan(options.san);
}

/** Pick the most specific move sound for a chess move. */
export function resolveMoveSoundType(
  options: ChessMoveSoundOptions,
): MoveSoundType {
  const san = options.san ?? "";

  if (isCheckmateSan(san)) {
    return "checkmate";
  }
  if (isPromotionMove(options)) {
    return "promote";
  }
  if (isCastleMove(options)) {
    return "castle";
  }
  if (isCaptureMove(options)) {
    return "capture";
  }
  if (isCheckSan(san)) {
    return "move_check";
  }
  return "move";
}

const MOVE_SOUND_PLAYERS: Record<MoveSoundType, () => void> = {
  checkmate: playCheckmateSound,
  promote: playPromoteSound,
  castle: playCastleSound,
  capture: playCaptureSound,
  move_check: playMoveCheckSound,
  move: playMoveSound,
};

export function playChessMoveSound(options: ChessMoveSoundOptions): void {
  const soundType = resolveMoveSoundType(options);
  MOVE_SOUND_PLAYERS[soundType]();
}

/** Preload all clips after first user interaction. */
export function preloadAllSounds(): void {
  if (!isBrowser() || !isSoundEnabled()) {
    return;
  }
  void (async () => {
    const ctx = await getAudioContext();
    if (!ctx) {
      return;
    }
    await Promise.all(
      Object.values(SOUND_PATHS).map((path) => loadBuffer(ctx, path)),
    );
  })();
}

/** @deprecated Use preloadAllSounds */
export function preloadFeedbackSounds(): void {
  preloadAllSounds();
}

/** @deprecated Use isSoundEnabled */
export const isFeedbackSoundEnabled = isSoundEnabled;
