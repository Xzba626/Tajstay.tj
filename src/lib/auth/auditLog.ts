import { prisma } from "@/lib/prisma";

export type AuthAuditEvent =
  | "otp_request"
  | "otp_verify_fail"
  | "otp_verify_ok"
  | "login_password"
  | "login_phone"
  | "login_firebase"
  | "login_telegram"
  | "register_phone"
  | "register_email"
  | "new_session"
  | "suspicious_attempt";

export async function logAuthEvent(params: {
  event: AuthAuditEvent;
  userId?: number | null;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.authAuditLog.create({
      data: {
        userId: params.userId ?? undefined,
        event: params.event,
        ip: params.ip?.slice(0, 64),
        userAgent: params.userAgent?.slice(0, 512),
        meta: params.meta ? JSON.stringify(params.meta) : undefined
      }
    });
  } catch {
    /* best-effort */
  }
}
