import { TRAINING_SOUND_KEY } from "@/lib/training/sounds";

export const FEEDBACK_SOUND_PATHS = {
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
} as const;

/** Normalized playback gain — both clips play at the same perceived loudness. */
export const FEEDBACK_SOUND_GAIN = 0.38;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function prefersReducedMotion(): boolean {
  if (!isBrowser()) {
    return true;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isFeedbackSoundEnabled(): boolean {
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

async function loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
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

async function playBuffer(url: string): Promise<void> {
  if (!isFeedbackSoundEnabled()) {
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
    gain.gain.value = FEEDBACK_SOUND_GAIN;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // Autoplay blocked or audio unavailable
  }
}

export function playCorrectSound(): void {
  void playBuffer(FEEDBACK_SOUND_PATHS.correct);
}

export function playWrongSound(): void {
  void playBuffer(FEEDBACK_SOUND_PATHS.wrong);
}

/** Preload feedback clips after first user interaction. */
export function preloadFeedbackSounds(): void {
  if (!isBrowser() || !isFeedbackSoundEnabled()) {
    return;
  }
  void (async () => {
    const ctx = await getAudioContext();
    if (!ctx) {
      return;
    }
    await Promise.all(
      Object.values(FEEDBACK_SOUND_PATHS).map((path) => loadBuffer(ctx, path)),
    );
  })();
}
