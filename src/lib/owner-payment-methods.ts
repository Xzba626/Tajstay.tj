import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

type OwnerPaymentsStore = Record<string, string[]>;

const LEGACY_FILE = path.join(process.cwd(), "data", "owner-payment-methods.json");

async function readLegacyStore(): Promise<OwnerPaymentsStore> {
  try {
    const raw = await readFile(LEGACY_FILE, "utf8");
    const parsed = JSON.parse(raw) as OwnerPaymentsStore;
    return parsed ?? {};
  } catch {
    return {};
  }
}

async function migrateOwnerFromLegacy(ownerId: number): Promise<string[]> {
  const store = await readLegacyStore();
  const methods = (store[String(ownerId)] ?? []).map((m) => m.trim()).filter(Boolean);
  if (!methods.length) return [];

  await prisma.ownerPaymentMethod.upsert({
    where: { ownerId },
    create: { ownerId, methods },
    update: { methods }
  });
  return methods;
}

export async function getOwnerPaymentMethods(ownerId: number): Promise<string[]> {
  try {
    const row = await prisma.ownerPaymentMethod.findUnique({ where: { ownerId } });
    if (row) return row.methods;
    return await migrateOwnerFromLegacy(ownerId);
  } catch {
    const store = await readLegacyStore();
    return store[String(ownerId)] ?? [];
  }
}

export async function saveOwnerPaymentMethods(ownerId: number, methods: string[]): Promise<void> {
  const cleaned = methods.map((m) => m.trim()).filter(Boolean);
  await prisma.ownerPaymentMethod.upsert({
    where: { ownerId },
    create: { ownerId, methods: cleaned },
    update: { methods: cleaned }
  });
}
