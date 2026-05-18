import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const id = Number(form.get("id"));
  if (!id) return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));

  await prisma.complaint.update({
    where: { id },
    data: { status: "RESOLVED" }
  });

  return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));
}
