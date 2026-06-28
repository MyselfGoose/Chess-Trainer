import {
  isSoundEnabled,
  playCaptureSound,
  playCastleSound,
  playCheckmateSound,
  playChessMoveSound,
  playCorrectSound,
  playMoveCheckSound,
  playMoveSound,
  playNotificationSound,
  playPromoteSound,
  playWrongSound,
  preloadAllSounds,
  TRAINING_SOUND_KEY,
} from "@/lib/sounds/feedbackSounds";

export { TRAINING_SOUND_KEY };

export {
  playCaptureSound,
  playCastleSound,
  playCheckmateSound,
  playChessMoveSound,
  playMoveCheckSound,
  playMoveSound,
  playNotificationSound,
  playPromoteSound,
  preloadAllSounds,
};

/** @deprecated Use preloadAllSounds */
export function preloadFeedbackSounds(): void {
  preloadAllSounds();
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function isTrainingSoundEnabled(): boolean {
  return isSoundEnabled();
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
