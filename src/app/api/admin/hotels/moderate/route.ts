import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { scoreHotelRisk } from "@/lib/services/riskScoring";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const id = Number(form.get("id"));
  const status = String(form.get("status"));
  if (!id || !["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));
  }

  await prisma.hotel.update({
    where: { id },
    data: { status: status as "APPROVED" | "REJECTED" | "PENDING" }
  });

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
