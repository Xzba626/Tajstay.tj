import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { setAdminSecretWord, verifyAdminSecretWord } from "@/lib/admin-security";
import { Prisma } from "@prisma/client";
import { normalizePhone } from "@/lib/validation/phone";
import { publicUrl } from "@/lib/http/publicOrigin";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const emailRaw = String(form.get("email") ?? "").trim();
  const currentPassword = String(form.get("currentPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "").trim();
  const secretWordInput = String(form.get("secretWord") ?? "").trim();
  const newSecretWord = String(form.get("newSecretWord") ?? "").trim();
  const isDev = process.env.NODE_ENV !== "production";
  const secretWord = secretWordInput || (isDev ? "tajstay-secret" : "");

  const redirectUrl = publicUrl(req, "/dashboard/admin?section=content");
  if (!currentPassword || (!secretWordInput && !isDev)) {
    redirectUrl.searchParams.set("error", "security-required");
    return NextResponse.redirect(redirectUrl);
  }

  const dbAdmin = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!dbAdmin) return forbiddenJson();

  const currentPasswordOk = await verifyPassword(currentPassword, dbAdmin.password);
  const secretOk = await verifyAdminSecretWord(secretWord);
  if (!currentPasswordOk) {
    redirectUrl.searchParams.set("error", "security-password");
    return NextResponse.redirect(redirectUrl);
  }
  if (!secretOk) {
    redirectUrl.searchParams.set("error", "security-secret");
    return NextResponse.redirect(redirectUrl);
  }

  const nextData: { phone?: string; email?: string | null; password?: string } = {};
  if (phone) nextData.phone = phone;
  if (emailRaw) nextData.email = emailRaw.toLowerCase();
  if (newPassword) nextData.password = await hashPassword(newPassword);
  const shouldInvalidateSessions = !!nextData.password || !!nextData.phone || nextData.email != null;

  try {
    if (Object.keys(nextData).length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: admin.id },
          data: nextData
        });
        if (shouldInvalidateSessions) {
          await tx.session.deleteMany({ where: { userId: admin.id } });
        }
      });
    }

    if (newSecretWord) {
      await setAdminSecretWord(newSecretWord);
    }
  } catch (err) {
    const e = err as unknown;
    let code = "security-update";
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint failed (e.g. phone/email already used by another user)
      if (e.code === "P2002") code = "security-update-unique";
      // Record not found (shouldn't happen because we have admin from session)
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
