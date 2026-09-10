import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { sendPasswordResetLinkEmail } from "@/lib/email/sendPasswordResetLink";
import { writeAdminAudit, maskEmail } from "@/lib/admin/auditLog";
import { createNotification } from "@/lib/notifications/create";
import { resolveIdentityCapabilities } from "@/lib/auth/identityMethods";

function newToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Admin-initiated owner password recovery.
 * Creates one-time hashed token, invalidates previous tokens, emails link.
 * Never returns plaintext token to the admin UI (P0-S1).
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const id = Number(form.get("id"));
  const ip = clientIp(req);
  const ua = req.headers.get("user-agent") ?? undefined;

  const redirectUrl = publicUrl(req, "/dashboard/admin");
  redirectUrl.searchParams.set("section", "owner-access");

  if (!id) return NextResponse.redirect(redirectUrl);

  const actorRl = rateLimit(`admin:reset-issue:actor:${admin.id}`, 10, 60 * 60_000);
  if (!actorRl.ok) {
    redirectUrl.searchParams.set("error", "recovery_rate_limited");
    return NextResponse.redirect(redirectUrl);
  }
  const targetRl = rateLimit(`admin:reset-issue:target:${id}`, 3, 60 * 60_000);
  if (!targetRl.ok) {
    redirectUrl.searchParams.set("error", "recovery_rate_limited");
    return NextResponse.redirect(redirectUrl);
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { accounts: { select: { provider: true } } }
  });
  if (!user || user.role !== "OWNER") return forbiddenJson();

  // Backend enforcement, not just a hidden client button: User.password always holds a hash
  // (schema-required non-null), but for Google/Telegram-only accounts it's a random placeholder
  // never used to sign in — resetting it would be meaningless and confusing.
  if (!resolveIdentityCapabilities(user).canResetPassword) {
    await writeAdminAudit({
      actorUserId: admin.id,
      action: "owner_recovery_issue_failed",
      targetType: "user",
      targetId: id,
      result: "blocked",
      reason: "no_password_credential",
      ip,
      userAgent: ua
    }).catch(() => undefined);
    redirectUrl.searchParams.set("error", "recovery_no_password_credential");
    return NextResponse.redirect(redirectUrl);
  }

  if (user.isBanned) {
    await writeAdminAudit({
      actorUserId: admin.id,
      action: "owner_recovery_issue_failed",
      targetType: "user",
      targetId: id,
      result: "blocked",
      reason: "user_banned",
      ip,
      userAgent: ua
    }).catch(() => undefined);
    redirectUrl.searchParams.set("error", "recovery_banned");
    return NextResponse.redirect(redirectUrl);
  }

  const email = user.email?.trim().toLowerCase() ?? "";
  if (!email) {
    await writeAdminAudit({
      actorUserId: admin.id,
      action: "owner_recovery_issue_failed",
      targetType: "user",
      targetId: id,
      result: "blocked",
      reason: "no_email",
      ip,
      userAgent: ua
    }).catch(() => undefined);
    redirectUrl.searchParams.set("error", "recovery_no_email");
    return NextResponse.redirect(redirectUrl);
  }

  const token = newToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const origin = publicUrl(req, "/").origin;
  const resetUrl = `${origin}/auth/reset-password#token=${token}`;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId: id } });
      await tx.passwordResetToken.create({
        data: { token: tokenHash, userId: id, expiresAt }
      });
    });
  } catch {
    redirectUrl.searchParams.set("error", "recovery_failed");
    return NextResponse.redirect(redirectUrl);
  }

  const sendResult = await sendPasswordResetLinkEmail({ to: email, resetUrl });
  if (!sendResult.ok) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: id, token: tokenHash } }).catch(() => undefined);
    await writeAdminAudit({
      actorUserId: admin.id,
      action: "owner_recovery_issue_failed",
      targetType: "user",
      targetId: id,
      result: "fail",
      reason: "delivery_unavailable",
      afterState: { email: maskEmail(email) },
      ip,
      userAgent: ua
    }).catch(() => undefined);
    redirectUrl.searchParams.set("error", "recovery_delivery");
    return NextResponse.redirect(redirectUrl);
  }

  await writeAdminAudit({
    actorUserId: admin.id,
    action: "owner_recovery_issued",
    targetType: "user",
    targetId: id,
    afterState: { email: maskEmail(email), expiresAt: expiresAt.toISOString() },
    ip,
    userAgent: ua,
    result: "ok"
  }).catch(() => undefined);

  await createNotification({
    userId: id,
    type: "SECURITY_PASSWORD_RESET_ISSUED",
    title: "Восстановление доступа",
    message: "Администрация TajStay инициировала сброс пароля. Проверьте email.",
    link: "/auth/forgot-password"
  }).catch(() => undefined);

  redirectUrl.searchParams.set("ok", "recovery_sent");
  return NextResponse.redirect(redirectUrl);
}
