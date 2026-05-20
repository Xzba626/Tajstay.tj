import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { savePublicImageFile } from "@/lib/uploads/savePublicImage";

function amenitiesToJson(raw: string): string {
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return JSON.stringify(parts.length ? parts : ["wifi"]);
}

export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const form = await req.formData();
  const hotelId = Number(form.get("hotelId"));
  const title = String(form.get("title") ?? "").trim();
  const price = Number(form.get("price"));
  const weekendPriceRaw = form.get("weekendPrice");
  const weekendPrice =
    weekendPriceRaw != null && String(weekendPriceRaw).trim() !== "" ? Number(weekendPriceRaw) : null;
  const minNights = Math.max(1, Number(form.get("minNights") ?? 1) || 1);
  const extraGuestRaw = form.get("extraGuestPrice");
  const extraGuestPrice =
    extraGuestRaw != null && String(extraGuestRaw).trim() !== "" ? Number(extraGuestRaw) : null;
  const capacity = Number(form.get("capacity"));
  const amenitiesRaw = String(form.get("amenities") ?? "");

  if (!hotelId || !title || Number.isNaN(price) || price < 0 || Number.isNaN(capacity) || capacity < 1) {
    return NextResponse.redirect(publicUrl(req, "/dashboard/owner?section=rooms&error=room"));
  }

  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId: owner.id } });
  if (!hotel) return forbiddenJson();

  const room = await prisma.room.create({
    data: {
      hotelId,
      title,
      price,
      weekendPrice: weekendPrice != null && !Number.isNaN(weekendPrice) ? weekendPrice : null,
      minNights,
      extraGuestPrice: extraGuestPrice != null && !Number.isNaN(extraGuestPrice) ? extraGuestPrice : null,
      capacity,
      amenities: amenitiesToJson(amenitiesRaw),
      availability: true
    }
  });

  const uploads = form.getAll("roomPhotos").filter((f): f is File => f instanceof File && f.size > 0);
  let order = 0;
  for (const file of uploads) {
    const url = await savePublicImageFile(file, "room-photos");
    if (url) {
      await prisma.roomPhoto.create({
        data: { roomId: room.id, url, sortOrder: order++ }
      });
    }
  }

  return NextResponse.redirect(publicUrl(req, "/dashboard/owner?section=rooms"));
}
