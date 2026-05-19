import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { hashPassword } from "@/lib/auth/password";
import { resetAdminSecretWord, verifyAdminSecurityResetSecret } from "@/lib/admin-security";
import { normalizePhone } from "@/lib/validation/phone";
import { publicUrl } from "@/lib/http/publicOrigin";
import { clearSessionCookie } from "@/lib/auth/session";

/**
 * Emergency admin security reset (production recovery).
 * Requires ADMIN_SECURITY_RESET_SECRET in env + active admin session.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const resetSecret = String(form.get("resetSecret") ?? "").trim();
  const newPassword = String(form.get("newPassword") ?? "").trim();
  const newSecretWord = String(form.get("newSecretWord") ?? "").trim();
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const emailRaw = String(form.get("email") ?? "").trim();

  const redirectUrl = publicUrl(req, "/dashboard/admin?section=content");

  if (!verifyAdminSecurityResetSecret(resetSecret)) {
    redirectUrl.searchParams.set("error", "security-reset-denied");
    return NextResponse.redirect(redirectUrl);
  }
  if (!newPassword || newPassword.length < 6) {
    redirectUrl.searchParams.set("error", "security-reset-password");
    return NextResponse.redirect(redirectUrl);
  }
  if (!newSecretWord || newSecretWord.length < 4) {
    redirectUrl.searchParams.set("error", "security-reset-secret");
    return NextResponse.redirect(redirectUrl);
  }

  const nextData: { phone?: string; email?: string | null; password: string } = {
    password: await hashPassword(newPassword)
  };
  if (phone) nextData.phone = phone;
  if (emailRaw) nextData.email = emailRaw.toLowerCase();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: admin.id }, data: nextData });
      await tx.session.deleteMany({ where: { userId: admin.id } });
    });
    await resetAdminSecretWord(newSecretWord);
  } catch {
    redirectUrl.searchParams.set("error", "security-reset-failed");
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("ok", "security-reset");
  const res = NextResponse.redirect(redirectUrl);
  clearSessionCookie(res);
  return res;
}
