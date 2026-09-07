import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { hashPassword } from "@/lib/auth/password";
import { verifyAdminSecurityResetSecret } from "@/lib/admin-security";
import { normalizePhone } from "@/lib/validation/phone";
import { publicUrl } from "@/lib/http/publicOrigin";
import { clearSessionCookie } from "@/lib/auth/session";
import { writeAdminAudit, maskEmail, maskPhone } from "@/lib/admin/auditLog";
import { clientIp } from "@/lib/security/rateLimit";

/**
 * Emergency admin password reset (production recovery).
 * Requires ADMIN_SECURITY_RESET_SECRET (>=16) + active admin session.
 * Shared secret-word model removed (P0-S1) — fail closed if env secret missing/weak.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const resetSecret = String(form.get("resetSecret") ?? "").trim();
  const newPassword = String(form.get("newPassword") ?? "").trim();
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const emailRaw = String(form.get("email") ?? "").trim();
  const ip = clientIp(req);
  const ua = req.headers.get("user-agent") ?? undefined;

  const redirectUrl = publicUrl(req, "/dashboard/admin?section=content");

  if (!verifyAdminSecurityResetSecret(resetSecret)) {
    await writeAdminAudit({
      actorUserId: admin.id,
      action: "admin_emergency_reset",
      targetType: "user",
      targetId: admin.id,
      result: "fail",
      reason: "reset_secret_denied",
      ip,
      userAgent: ua
    }).catch(() => undefined);
    redirectUrl.searchParams.set("error", "security-reset-denied");
    return NextResponse.redirect(redirectUrl);
  }
  if (!newPassword || newPassword.length < 6) {
    redirectUrl.searchParams.set("error", "security-reset-password");
    return NextResponse.redirect(redirectUrl);
  }

  const nextData: { phone?: string; email?: string | null; password: string } = {
    password: await hashPassword(newPassword)
  };
  if (phone) nextData.phone = phone;
  if (emailRaw) nextData.email = emailRaw.toLowerCase();

  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id: admin.id } });
      await tx.user.update({ where: { id: admin.id }, data: nextData });
      await tx.session.deleteMany({ where: { userId: admin.id } });
      await writeAdminAudit({
        tx,
        actorUserId: admin.id,
        action: "admin_emergency_reset",
        targetType: "user",
        targetId: admin.id,
        beforeState: {
          phone: maskPhone(before?.phone),
          email: maskEmail(before?.email)
        },
        afterState: {
          phone: maskPhone(nextData.phone ?? before?.phone),
          email: maskEmail(nextData.email !== undefined ? nextData.email : before?.email),
          passwordChanged: true,
          sessionsInvalidated: true
        },
        ip,
        userAgent: ua,
        result: "ok"
      });
    });
  } catch {
    redirectUrl.searchParams.set("error", "security-reset-failed");
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("ok", "security-reset");
  const res = NextResponse.redirect(redirectUrl);
  clearSessionCookie(res);
  return res;
}
