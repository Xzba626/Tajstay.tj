import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type OwnerPaymentsStore = Record<string, string[]>;

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "owner-payment-methods.json");

async function readStore(): Promise<OwnerPaymentsStore> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as OwnerPaymentsStore;
    return parsed ?? {};
  } catch {
    return {};
  }
}

async function writeStore(store: OwnerPaymentsStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function getOwnerPaymentMethods(ownerId: number): Promise<string[]> {
  const store = await readStore();
  return store[String(ownerId)] ?? [];
}

export async function saveOwnerPaymentMethods(ownerId: number, methods: string[]): Promise<void> {
  const store = await readStore();
  store[String(ownerId)] = methods.map((m) => m.trim()).filter(Boolean);
  await writeStore(store);
}
