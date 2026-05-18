import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { prisma } from "@/lib/prisma";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const days = Number(form.get("days") || 30);
  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    return NextResponse.json({ error: "Invalid days" }, { status: 400 });
  }

  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  await prisma.notification.deleteMany({
    where: { createdAt: { lt: threshold } }
  });

  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=notifications"));
}
