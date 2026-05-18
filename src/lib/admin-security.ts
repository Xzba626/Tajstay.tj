import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

type AdminSecurityStore = {
  secretWordHash?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "admin-security.json");
const DEFAULT_SECRET_WORD = process.env.ADMIN_SECRET_WORD || "tajstay-secret";

async function readStore(): Promise<AdminSecurityStore> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as AdminSecurityStore;
    return parsed ?? {};
  } catch {
    return {};
  }
}

async function writeStore(store: AdminSecurityStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function verifyAdminSecretWord(input: string): Promise<boolean> {
  const candidate = input.trim();
  if (!candidate) return false;
  const store = await readStore();
  if (store.secretWordHash) {
    return verifyPassword(candidate, store.secretWordHash);
  }
  return candidate === DEFAULT_SECRET_WORD;
}

export async function setAdminSecretWord(secretWord: string): Promise<void> {
  const secretWordHash = await hashPassword(secretWord.trim());
  await writeStore({ secretWordHash });
}
