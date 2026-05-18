import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { normalizePhone } from "@/lib/validation/phone";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const id = Number(form.get("id"));
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const emailRaw = String(form.get("email") ?? "").trim();

  const redirectUrl = publicUrl(req, "/dashboard/admin");
  redirectUrl.searchParams.set("section", "owner-access");

  if (!id || !phone) {
    redirectUrl.searchParams.set("error", "owner-access");
    return NextResponse.redirect(redirectUrl);
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "OWNER") {
    return forbiddenJson();
  }

  const email = emailRaw.length ? emailRaw.toLowerCase() : null;

  const data: {
    phone: string;
    email: string | null;
  } = {
    phone,
    email
  };

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data
      }),
      prisma.session.deleteMany({ where: { userId: id } })
    ]);
  } catch {
    redirectUrl.searchParams.set("error", "owner-credentials");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(redirectUrl);
}
