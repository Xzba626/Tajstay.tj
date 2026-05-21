"use client";

import type { Auth, ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { getFirebasePublicConfig } from "@/lib/firebase/config";

const RECAPTCHA_CONTAINER_ID = "firebase-recaptcha";

let authPromise: Promise<Auth | null> | null = null;
let pendingConfirmation: ConfirmationResult | null = null;
let recaptchaInitPromise: Promise<RecaptchaVerifier> | null = null;

declare global {
  interface Window {
    __tajstayRecaptchaVerifier?: RecaptchaVerifier;
  }
}

async function loadAuth(): Promise<Auth | null> {
  const config = getFirebasePublicConfig();
  if (!config) return null;

  const { initializeApp, getApps } = await import("firebase/app");
  const { getAuth } = await import("firebase/auth");

  const app = getApps()[0] ?? initializeApp(config);
  return getAuth(app);
}

export async function getFirebaseClientAuth(): Promise<Auth | null> {
  if (typeof window === "undefined") return null;
  if (!authPromise) {
    authPromise = loadAuth();
  }
  return authPromise;
}

export function isFirebaseClientConfigured(): boolean {
  return getFirebasePublicConfig() !== null;
}

function getRecaptchaContainer(containerId: string): HTMLElement {
  const el = document.getElementById(containerId);
  if (!el) throw new Error("reCAPTCHA container not found");
  return el;
}

/** Create invisible reCAPTCHA once per page; reuse across login/register and tab switches. */
export async function ensureRecaptcha(containerId = RECAPTCHA_CONTAINER_ID): Promise<RecaptchaVerifier> {
  if (typeof window === "undefined") throw new Error("reCAPTCHA is only available in the browser");

  const auth = await getFirebaseClientAuth();
  if (!auth) throw new Error("Firebase is not configured");

  getRecaptchaContainer(containerId);

  if (window.__tajstayRecaptchaVerifier) {
    return window.__tajstayRecaptchaVerifier;
  }

  if (!recaptchaInitPromise) {
    recaptchaInitPromise = (async () => {
      const { RecaptchaVerifier } = await import("firebase/auth");
      const verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
      await verifier.render();
      window.__tajstayRecaptchaVerifier = verifier;
      return verifier;
    })().finally(() => {
      recaptchaInitPromise = null;
    });
  }

  return recaptchaInitPromise;
}

/** Warm up reCAPTCHA after the container is mounted (SignIn page). */
export function initFirebaseRecaptcha(containerId = RECAPTCHA_CONTAINER_ID): void {
  if (typeof window === "undefined") return;
  if (!isFirebaseClientConfigured()) return;
  void ensureRecaptcha(containerId).catch(() => undefined);
}

export async function sendFirebasePhoneOtp(phoneE164: string): Promise<void> {
  const auth = await getFirebaseClientAuth();
  if (!auth) throw new Error("Firebase is not configured");

  const { signInWithPhoneNumber } = await import("firebase/auth");
  const verifier = await ensureRecaptcha();
  pendingConfirmation = await signInWithPhoneNumber(auth, phoneE164, verifier);
}

export async function confirmFirebasePhoneOtp(code: string): Promise<string> {
  if (!pendingConfirmation) throw new Error("No pending phone verification");
  const credential = await pendingConfirmation.confirm(code);
  const idToken = await credential.user.getIdToken(true);
  pendingConfirmation = null;
  return idToken;
}

/** Clears pending SMS confirmation only — keeps reCAPTCHA for resend / tab switch. */
export function resetFirebasePhoneConfirmation(): void {
  pendingConfirmation = null;
}

export function resetFirebasePhoneAuth(): void {
  resetFirebasePhoneConfirmation();
}

/** Full teardown when leaving the auth page. */
export function destroyRecaptchaVerifier(): void {
  resetFirebasePhoneConfirmation();
  recaptchaInitPromise = null;
  if (window.__tajstayRecaptchaVerifier) {
    try {
      window.__tajstayRecaptchaVerifier.clear();
    } catch {
      /* ignore */
    }
    window.__tajstayRecaptchaVerifier = undefined;
  }
}
