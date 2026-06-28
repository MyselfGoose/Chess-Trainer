import {
  isFeedbackSoundEnabled,
  playCorrectSound,
  playWrongSound,
  preloadFeedbackSounds,
} from "@/lib/sounds/feedbackSounds";

export const TRAINING_SOUND_KEY = "chess:training-sound";

export { preloadFeedbackSounds };

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function isTrainingSoundEnabled(): boolean {
  return isFeedbackSoundEnabled();
}

export function setTrainingSoundEnabled(enabled: boolean): void {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(TRAINING_SOUND_KEY, String(enabled));
}

export function playPassSound(): void {
  playCorrectSound();
}

export function playFailSound(): void {
  playWrongSound();
}
