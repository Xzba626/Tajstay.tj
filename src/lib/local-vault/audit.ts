import { prisma } from "@/lib/prisma";

export const LV_AUDIT = {
  ACTIVATION_CODE_CREATED: "ACTIVATION_CODE_CREATED",
  DEVICE_ACTIVATED: "DEVICE_ACTIVATED",
  DEVICE_REACTIVATED: "DEVICE_REACTIVATED",
  DEVICE_REVOKED: "DEVICE_REVOKED",
  ACTIVATION_FAILED: "ACTIVATION_FAILED",
} as const;

export async function writeLvAudit(input: {
  action: string;
  hotelId?: number | null;
  deviceId?: string | null;
  actorUserId?: number | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const meta = input.metadata ? sanitizeMeta(input.metadata) : null;
  await prisma.localVaultAuditEvent.create({
    data: {
      action: input.action,
      hotelId: input.hotelId ?? null,
      deviceId: input.deviceId ?? null,
      actorUserId: input.actorUserId ?? null,
      metadata: meta ? JSON.stringify(meta) : null,
    },
  });
}

const FORBIDDEN_META_KEYS = new Set([
  "activationCode",
  "code",
  "plaintext",
  "signature",
  "privateKey",
  "pepper",
  "passport",
  "password",
]);

function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN_META_KEYS.has(k)) continue;
    if (typeof v === "string" && v.length > 200) {
      out[k] = v.slice(0, 200);
    } else {
      out[k] = v;
    }
  }
  return out;
}
