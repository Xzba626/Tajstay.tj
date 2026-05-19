import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const LEGACY_FILE = path.join(process.cwd(), "data", "admin-security.json");

function defaultSecretWord(): string {
  return (process.env.ADMIN_SECRET_WORD ?? "tajstay-secret").trim();
}

async function readLegacyFileHash(): Promise<string | null> {
  try {
    const raw = await readFile(LEGACY_FILE, "utf8");
    const parsed = JSON.parse(raw) as { secretWordHash?: string };
    return parsed.secretWordHash?.trim() || null;
  } catch {
    return null;
  }
}

async function getStoredHash(): Promise<string | null> {
  const row = await prisma.adminSecurityState.findUnique({ where: { id: 1 } });
  if (row?.secretWordHash) return row.secretWordHash;

  const legacy = await readLegacyFileHash();
  if (legacy) {
    await prisma.adminSecurityState.upsert({
      where: { id: 1 },
      create: { id: 1, secretWordHash: legacy },
      update: { secretWordHash: legacy }
    });
    return legacy;
  }
  return null;
}

export async function verifyAdminSecretWord(input: string): Promise<boolean> {
  const candidate = input.trim();
  if (!candidate) return false;

  const storedHash = await getStoredHash();
  if (storedHash) {
    return verifyPassword(candidate, storedHash);
  }

  return candidate === defaultSecretWord();
}

export async function setAdminSecretWord(secretWord: string): Promise<void> {
  const secretWordHash = await hashPassword(secretWord.trim());
  await prisma.adminSecurityState.upsert({
    where: { id: 1 },
    create: { id: 1, secretWordHash },
    update: { secretWordHash }
  });
}

/** One-time recovery when current password / secret word are unknown (requires env secret). */
export async function resetAdminSecretWord(secretWord: string): Promise<void> {
  await setAdminSecretWord(secretWord);
}

export function isAdminSecurityResetConfigured(): boolean {
  return Boolean(process.env.ADMIN_SECURITY_RESET_SECRET?.trim());
}

export function verifyAdminSecurityResetSecret(provided: string): boolean {
  const expected = (process.env.ADMIN_SECURITY_RESET_SECRET ?? "").trim();
  if (!expected || expected.length < 16) return false;
  return provided.trim() === expected;
}
