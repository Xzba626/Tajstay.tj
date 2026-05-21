import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";

let adminApp: App | null = null;

function loadServiceAccount(): Record<string, string> {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    const parsed = JSON.parse(rawJson) as Record<string, string>;
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim()?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured");
  }
  return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
}

async function initAdminApp(): Promise<App> {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin is not configured");
  }
  if (adminApp) return adminApp;

  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return adminApp;
  }
  adminApp = initializeApp({ credential: cert(loadServiceAccount() as Parameters<typeof cert>[0]) });
  return adminApp;
}

export async function getFirebaseAdminAuth(): Promise<Auth> {
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(await initAdminApp());
}
