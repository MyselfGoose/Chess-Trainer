export const TRAINING_SOUND_KEY = "chess:training-sound";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function isTrainingSoundEnabled(): boolean {
  if (!isBrowser()) {
    return false;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  const raw = localStorage.getItem(TRAINING_SOUND_KEY);
  return raw === null ? true : raw === "true";
}

export function setTrainingSoundEnabled(enabled: boolean): void {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(TRAINING_SOUND_KEY, String(enabled));
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (!isBrowser()) {
    return null;
  }
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    return audioContext;
  } catch {
    return null;
  }
}

function playTone(frequency: number, durationMs: number, type: OscillatorType): void {
  if (!isTrainingSoundEnabled()) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  try {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Audio blocked or unavailable
  }
}

export function playPassSound(): void {
  playTone(523, 120, "sine");
  setTimeout(() => playTone(659, 120, "sine"), 80);
}

export function playFailSound(): void {
  playTone(180, 200, "sawtooth");
}
