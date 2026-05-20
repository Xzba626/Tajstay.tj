const SOUND_KEY = "tajstay:notif-sound";
const INTERACTED_KEY = "tajstay:user-interacted";

export function hasUserInteracted(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(INTERACTED_KEY) === "1";
}

export function markUserInteracted(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(INTERACTED_KEY, "1");
}

export function isNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(SOUND_KEY);
  return v !== "0";
}

export function setNotificationSoundEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_KEY, on ? "1" : "0");
}
