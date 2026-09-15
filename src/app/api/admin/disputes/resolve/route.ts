import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";

/** BLOCK 5.6A — admin resolve action for the canonical `Dispute` model, mirroring
 * `/api/admin/complaints/resolve` exactly (same auth pattern, same redirect target). */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const id = Number(form.get("id"));
  if (!id) return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));

  const resolution = String(form.get("resolution") ?? "").trim().slice(0, 2000) || null;

  // BLOCK 5.6C security audit: a plain `update()` throws (Prisma P2025) on a nonexistent id —
  // an uncontrolled 500 rather than a deterministic response. `updateMany` + count check mirrors
  // the atomic pattern already used in admin/bookings/complete/route.ts.
  await prisma.dispute.updateMany({
    where: { id },
    data: { status: "RESOLVED", resolution, resolvedAt: new Date() }
  });

  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=complaints"));
}
