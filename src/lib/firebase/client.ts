"use client";

import type { Auth, ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { getFirebasePublicConfig } from "@/lib/firebase/config";

let authPromise: Promise<Auth | null> | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;
let pendingConfirmation: ConfirmationResult | null = null;

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

/** Invisible reCAPTCHA for Firebase Phone Auth. Container must exist in DOM. */
export async function ensureRecaptcha(containerId = "firebase-recaptcha"): Promise<RecaptchaVerifier> {
  const auth = await getFirebaseClientAuth();
  if (!auth) throw new Error("Firebase is not configured");

  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      /* ignore */
    }
    recaptchaVerifier = null;
  }

  const { RecaptchaVerifier } = await import("firebase/auth");
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  return recaptchaVerifier;
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

export function resetFirebasePhoneAuth(): void {
  pendingConfirmation = null;
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      /* ignore */
    }
    recaptchaVerifier = null;
  }
}
