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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const room = await prisma.room.findFirst({
    where: { id, hotel: { ownerId: owner.id } }
  });
  if (!room) return forbiddenJson();

  const form = await req.formData();
  const intent = String(form.get("intent") ?? "update");

  if (intent === "archive") {
    await prisma.room.update({
      where: { id },
      data: { availability: false }
    });
    return NextResponse.redirect(publicUrl(req, "/dashboard/owner?section=rooms"));
  }

  if (intent === "delete_photo") {
    const photoId = Number(form.get("photoId"));
    if (photoId) {
      await prisma.roomPhoto.deleteMany({
        where: { id: photoId, roomId: id }
      });
    }
    return NextResponse.redirect(publicUrl(req, "/dashboard/owner?section=rooms"));
  }

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
  const availability = form.get("availability") === "1";

  if (!title || Number.isNaN(price) || price < 0 || Number.isNaN(capacity) || capacity < 1) {
    return NextResponse.redirect(publicUrl(req, "/dashboard/owner?section=rooms&error=room"));
  }

  await prisma.room.update({
    where: { id },
    data: {
      title,
      price,
      weekendPrice: weekendPrice != null && !Number.isNaN(weekendPrice) ? weekendPrice : null,
      minNights,
      extraGuestPrice: extraGuestPrice != null && !Number.isNaN(extraGuestPrice) ? extraGuestPrice : null,
      capacity,
      amenities: amenitiesToJson(amenitiesRaw),
      availability
    }
  });

  const uploads = form.getAll("roomPhotos").filter((f): f is File => f instanceof File && f.size > 0);
  if (uploads.length) {
    const maxOrder = await prisma.roomPhoto.aggregate({
      where: { roomId: id },
      _max: { sortOrder: true }
    });
    let order = (maxOrder._max.sortOrder ?? -1) + 1;
    for (const file of uploads) {
      const url = await savePublicImageFile(file, "room-photos");
      if (url) {
        await prisma.roomPhoto.create({
          data: { roomId: id, url, sortOrder: order++ }
        });
      }
    }
  }

  return NextResponse.redirect(publicUrl(req, "/dashboard/owner?section=rooms"));
}
