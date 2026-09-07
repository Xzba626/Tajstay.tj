import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { Prisma } from "@prisma/client";
import { normalizePhone } from "@/lib/validation/phone";
import { publicUrl } from "@/lib/http/publicOrigin";
import { clearSessionCookie } from "@/lib/auth/session";
import { writeAdminAudit, maskEmail, maskPhone } from "@/lib/admin/auditLog";
import { clientIp } from "@/lib/security/rateLimit";
import { createNotification } from "@/lib/notifications/create";

/**
 * Admin self-security update.
 * Step-up: current password only (shared secret-word removed — P0-S1).
 * Phone/email/password may change in one form; sessions invalidated when credentials change.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const emailRaw = String(form.get("email") ?? "").trim();
  const currentPassword = String(form.get("currentPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "").trim();
  const ip = clientIp(req);
  const ua = req.headers.get("user-agent") ?? undefined;

  const redirectUrl = publicUrl(req, "/dashboard/admin?section=content");
  if (!currentPassword) {
    redirectUrl.searchParams.set("error", "security-required");
    return NextResponse.redirect(redirectUrl);
  }

  const dbAdmin = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!dbAdmin) return forbiddenJson();

  const currentPasswordOk = await verifyPassword(currentPassword, dbAdmin.password);
  if (!currentPasswordOk) {
    await writeAdminAudit({
      actorUserId: admin.id,
      action: "admin_self_security_failed",
      targetType: "user",
      targetId: admin.id,
      result: "fail",
      reason: "bad_current_password",
      ip,
      userAgent: ua
    }).catch(() => undefined);
    redirectUrl.searchParams.set("error", "security-password");
    return NextResponse.redirect(redirectUrl);
  }

  const nextData: { phone?: string; email?: string | null; password?: string } = {};
  if (phone) nextData.phone = phone;
  if (emailRaw) nextData.email = emailRaw.toLowerCase();
  if (newPassword) nextData.password = await hashPassword(newPassword);
  const shouldInvalidateSessions = !!nextData.password || !!nextData.phone || nextData.email != null;

  if (Object.keys(nextData).length === 0) {
    redirectUrl.searchParams.set("ok", "security-updated");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: admin.id },
        data: nextData
      });
      if (shouldInvalidateSessions) {
        await tx.session.deleteMany({ where: { userId: admin.id } });
      }
      await writeAdminAudit({
        tx,
        actorUserId: admin.id,
        action: "admin_self_security_updated",
        targetType: "user",
        targetId: admin.id,
        beforeState: {
          phone: maskPhone(dbAdmin.phone),
          email: maskEmail(dbAdmin.email),
          passwordChanged: false
        },
        afterState: {
          phone: maskPhone(nextData.phone ?? dbAdmin.phone),
          email: maskEmail(nextData.email !== undefined ? nextData.email : dbAdmin.email),
          passwordChanged: Boolean(newPassword),
          sessionsInvalidated: shouldInvalidateSessions
        },
        ip,
        userAgent: ua,
        result: "ok"
      });
    });

    if (newPassword) {
      await createNotification({
        userId: admin.id,
        type: "SECURITY_PASSWORD_CHANGED",
        title: "Пароль изменён",
        message: "Пароль вашего аккаунта был изменён.",
        link: "/profile/security"
      }).catch(() => undefined);
    }
  } catch (err) {
    const e = err as unknown;
    let code = "security-update";
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") code = "security-update-unique";
      if (e.code === "P2025") code = "security-update-notfound";
    }
    redirectUrl.searchParams.set("error", code);
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("ok", "security-updated");
  const res = NextResponse.redirect(redirectUrl);
  if (shouldInvalidateSessions) clearSessionCookie(res);
  return res;
}
