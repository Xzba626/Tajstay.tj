import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";

function newToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const id = Number(form.get("id"));

  const redirectUrl = publicUrl(req, "/dashboard/admin");
  redirectUrl.searchParams.set("section", "owner-access");

  if (!id) return NextResponse.redirect(redirectUrl);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "OWNER") return forbiddenJson();

  const token = newToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      token: tokenHash,
      userId: id,
      expiresAt
    }
  });

  // Avoid leaking reset token via URL (logs, Referer, analytics).
  const res = NextResponse.redirect(redirectUrl);
  res.cookies.set("tajstay_admin_reset_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/dashboard/admin",
    maxAge: 5 * 60 // 5 minutes
  });
  res.cookies.set("tajstay_admin_reset_user", String(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/dashboard/admin",
    maxAge: 5 * 60
  });
  return res;
}

