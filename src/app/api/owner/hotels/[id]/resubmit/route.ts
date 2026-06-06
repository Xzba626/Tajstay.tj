import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { createNotification } from "@/lib/notifications/create";
import { sendHotelPendingAdminEmail } from "@/lib/email/hotelModerationEmails";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const hotel = await prisma.hotel.findFirst({
    where: { id, ownerId: owner.id, status: "REJECTED" }
  });
  if (!hotel) {
    return NextResponse.json({ error: "Объект не найден или не отклонён" }, { status: 400 });
  }

  await prisma.hotel.update({
    where: { id },
    data: {
      status: "PENDING",
      rejectionReason: null
    }
  });

  await createNotification({
    userId: owner.id,
    type: "HOTEL_PENDING_REVIEW",
    message: "Объект снова отправлен на проверку.",
    link: "/dashboard/owner?section=properties"
  });

  await sendHotelPendingAdminEmail({
    ownerName: owner.name,
    ownerEmail: owner.email,
    hotelName: hotel.name,
    hotelAddress: hotel.address,
    hotelId: hotel.id
  });

  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("application/json")) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.redirect(publicUrl(req, "/dashboard/owner?section=properties"));
}
