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
  const role = String(form.get("role"));
  const isBanned = form.get("isBanned") === "on";
  if (!id || !["GUEST", "OWNER", "ADMIN"].includes(role)) {
    return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isBanned: true }
  });
  if (!target) {
    return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));
  }

  /* Never leave the platform without an active ADMIN */
  const demotingOrBanningAdmin =
    target.role === "ADMIN" && (role !== "ADMIN" || isBanned);
  if (demotingOrBanningAdmin) {
    const activeAdmins = await prisma.user.count({
      where: { role: "ADMIN", isBanned: false }
    });
    if (activeAdmins <= 1) {
      return NextResponse.redirect(
        publicUrl(req, "/dashboard/admin?usersError=last_admin")
      );
    }
  }

  await prisma.user.update({
    where: { id },
    data: {
      role: role as "GUEST" | "OWNER" | "ADMIN",
      isBanned
    }
  });

  return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));
}
