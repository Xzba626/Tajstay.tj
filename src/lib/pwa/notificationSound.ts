import { hasUserInteracted, isNotificationSoundEnabled } from "@/lib/pwa/notificationPrefs";

let audio: HTMLAudioElement | null = null;

function webAudioPing() {
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
  void ctx.close();
}

export function playNewNotificationSound(): void {
  if (typeof window === "undefined") return;
  if (!hasUserInteracted() || !isNotificationSoundEnabled()) return;

  try {
    if (!audio) {
      audio = new Audio("/sounds/notification.mp3");
      audio.volume = 0.45;
    }
    audio.currentTime = 0;
    const p = audio.play();
    if (p) {
      p.catch(() => webAudioPing());
    }
  } catch {
    webAudioPing();
  }
}
