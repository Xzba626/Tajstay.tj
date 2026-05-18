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
