import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { scoreHotelRisk } from "@/lib/services/riskScoring";
import { publicUrl } from "@/lib/http/publicOrigin";
import { writeAdminAudit } from "@/lib/admin/auditLog";
import { ensureHotelSubscriptionOnApproval } from "@/lib/services/subscription";

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const id = Number(form.get("id"));
  const status = String(form.get("status"));
  const reason = String(form.get("reason") ?? "").trim();
  if (!id || !["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));
  }
  // A rejection without a reason leaves the owner with nothing to act on - reject is the one
  // transition that must always carry one.
  if (status === "REJECTED" && !reason) {
    const u = publicUrl(req, "/dashboard/admin");
    u.searchParams.set("section", "hotels");
    u.searchParams.set("error", "reject_reason_required");
    return NextResponse.redirect(u);
  }

  const beforeHotel = await prisma.hotel.findUnique({ where: { id }, select: { status: true } });

  await prisma.hotel.update({
    where: { id },
    data: {
      status: status as "APPROVED" | "REJECTED" | "PENDING",
      // currentRejectionReason is CURRENT STATE, not history - AdminAuditLog below is the
      // append-only record of every past transition. Only REJECTED ever sets it; every other
      // transition (including a resubmit back to PENDING, or an APPROVE) clears it, so the Owner
      // UI never has to infer "why rejected" from an audit-log lookup that would break across a
      // reject -> resubmit -> reject cycle.
      currentRejectionReason: status === "REJECTED" ? reason : null
    }
  });

  await writeAdminAudit({
    actorUserId: admin.id,
    action: "hotel_moderated",
    targetType: "Hotel",
    targetId: id,
    beforeState: { status: beforeHotel?.status ?? null },
    afterState: { status },
    reason: reason || null
  });

  // Trial starts exactly once per Hotel, only on a genuine PENDING/REJECTED -> APPROVED
  // transition - never on an already-APPROVED hotel being re-saved with the same status, and
  // ensureHotelSubscriptionOnApproval is itself idempotent as a second layer of protection.
  if (status === "APPROVED" && beforeHotel?.status !== "APPROVED") {
    await ensureHotelSubscriptionOnApproval(id);
  }

  const updatedHotel = await prisma.hotel.findUnique({
    where: { id },
    include: { owner: true }
  });

  if (updatedHotel) {
    const risk = scoreHotelRisk({
      status: updatedHotel.status,
      rating: updatedHotel.rating,
      coverImageUrl: updatedHotel.coverImageUrl,
      ownerVerified: updatedHotel.owner.verified,
      createdAt: updatedHotel.createdAt
    });
    if (risk.level === "HIGH") {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: `RISK_FLAG_HOTEL:${updatedHotel.id}:${risk.score}`,
          isRead: false
        }
      });
    }
  }

  return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));
}
