import { prisma } from "@/lib/prisma";

export type OfflineSyncInterval = "off" | "15m" | "1h" | "24h";

export type OwnerPmsSettings = {
  offlineCloudSync: boolean;
  offlineSyncInterval: OfflineSyncInterval;
  offlineBackupEmail: boolean;
  offlineBackupTelegram: boolean;
};

const DEFAULT_SETTINGS: OwnerPmsSettings = {
  offlineCloudSync: false,
  offlineSyncInterval: "off",
  offlineBackupEmail: true,
  offlineBackupTelegram: false
};

function parseSettings(raw: unknown): OwnerPmsSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  const o = raw as Record<string, unknown>;
  const interval = o.offlineSyncInterval;
  const validInterval =
    interval === "15m" || interval === "1h" || interval === "24h" || interval === "off"
      ? interval
      : DEFAULT_SETTINGS.offlineSyncInterval;
  return {
    offlineCloudSync: Boolean(o.offlineCloudSync),
    offlineSyncInterval: validInterval,
    offlineBackupEmail: o.offlineBackupEmail !== false,
    offlineBackupTelegram: Boolean(o.offlineBackupTelegram)
  };
}

export async function getOwnerPmsSettings(ownerId: number): Promise<OwnerPmsSettings> {
  const profile = await prisma.hostProfile.findUnique({
    where: { userId: ownerId },
    select: { pmsSettings: true }
  });
  return parseSettings(profile?.pmsSettings);
}

export async function saveOwnerPmsSettings(ownerId: number, input: Partial<OwnerPmsSettings>): Promise<OwnerPmsSettings> {
  const current = await getOwnerPmsSettings(ownerId);
  const next: OwnerPmsSettings = { ...current, ...input };
  await prisma.hostProfile.upsert({
    where: { userId: ownerId },
    create: { userId: ownerId, pmsSettings: next as object },
    update: { pmsSettings: next as object }
  });
  return next;
}
