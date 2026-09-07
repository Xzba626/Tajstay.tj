import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type AdminAuditAction =
  | "owner_recovery_issued"
  | "owner_recovery_issue_failed"
  | "owner_recovery_completed"
  | "owner_recovery_consume_failed"
  | "owner_credentials_blocked"
  | "admin_self_security_updated"
  | "admin_self_security_failed"
  | "admin_emergency_reset";

type AuditInput = {
  actorUserId?: number | null;
  action: AdminAuditAction | string;
  targetType?: string | null;
  targetId?: string | number | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  correlationId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  result?: "ok" | "fail" | "blocked";
  tx?: Prisma.TransactionClient;
};

const FORBIDDEN_AUDIT_KEYS = new Set([
  "password",
  "passwordHash",
  "newPassword",
  "currentPassword",
  "token",
  "resetToken",
  "secret",
  "secretWord",
  "newSecretWord",
  "otp",
  "code",
  "session",
  "sessionToken",
  "cookie",
  "authorization",
  "ADMIN_SECRET_WORD",
  "ADMIN_SECURITY_RESET_SECRET",
  "body"
]);

function sanitizeState(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> | undefined {
  if (!value) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (FORBIDDEN_AUDIT_KEYS.has(k) || /password|token|secret|otp|cookie|session/i.test(k)) {
      continue;
    }
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function safeJson(value: Record<string, unknown> | null | undefined): string | undefined {
  const cleaned = sanitizeState(value ?? undefined);
  if (!cleaned) return undefined;
  try {
    return JSON.stringify(cleaned);
  } catch {
    return undefined;
  }
}

/** Mask email for audit: a***@domain */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 1) || "*";
  return `${head}***@${domain}`;
}

/** Mask phone keeping country prefix-ish and last 2 digits */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-2)}`;
}

export async function writeAdminAudit(input: AuditInput): Promise<void> {
  const data = {
    actorUserId: input.actorUserId ?? undefined,
    action: input.action,
    targetType: input.targetType ?? undefined,
    targetId: input.targetId != null ? String(input.targetId) : undefined,
    beforeState: safeJson(input.beforeState ?? undefined),
    afterState: safeJson(input.afterState ?? undefined),
    reason: input.reason?.slice(0, 500) ?? undefined,
    metadata: safeJson(input.metadata ?? undefined),
    correlationId: input.correlationId?.slice(0, 64) ?? undefined,
    ip: input.ip?.slice(0, 64) ?? undefined,
    userAgent: input.userAgent?.slice(0, 512) ?? undefined,
    result: input.result ?? "ok"
  };

  const client = input.tx ?? prisma;
  await client.adminAuditLog.create({ data });
}
