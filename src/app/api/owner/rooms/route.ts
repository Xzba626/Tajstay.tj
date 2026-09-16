import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { publicUrl } from "@/lib/http/publicOrigin";
import { savePublicImageFile } from "@/lib/uploads/savePublicImage";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";
import { createPhysicalRoomFromCategory } from "@/lib/pms/createPhysicalRoom";

const slimCreateSchema = z.object({
  hotelId: z.number().int(),
  roomTypeId: z.number().int(),
  roomNumber: z.string().min(1).max(32)
});

export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const contentType = req.headers.get("content-type") ?? "";

  // BLOCK 4 canonical path: JSON slim create from category (no price/capacity/amenities/hotel form).
  if (contentType.includes("application/json")) {
    const parsed = slimCreateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    try {
      const room = await createPhysicalRoomFromCategory({
        hotelId: parsed.data.hotelId,
        ownerId: owner.id,
        roomTypeId: parsed.data.roomTypeId,
        roomNumber: parsed.data.roomNumber
      });
      return NextResponse.json({ ok: true, room });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      if (msg === "FORBIDDEN") return forbiddenJson();
      if (msg === "DUPLICATE_ROOM_NUMBER") {
        return NextResponse.json({ error: "duplicate_room" }, { status: 409 });
      }
      if (msg === "CATEGORY_NOT_FOUND" || msg === "INVALID_ROOM_NUMBER") {
        return NextResponse.json({ error: msg.toLowerCase() }, { status: 400 });
      }
      throw e;
    }
  }

  // Legacy multipart create (kept for older clients) — still requires ownership check.
  const form = await req.formData();
  const hotelId = Number(form.get("hotelId"));
  const roomTypeId = Number(form.get("roomTypeId") || 0) || null;
  const roomNumber = String(form.get("roomNumber") ?? form.get("title") ?? "").trim();

  if (!hotelId || !roomNumber) {
    return NextResponse.redirect(publicUrl(req, "/dashboard/owner?section=rooms&error=room"));
  }

  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId: owner.id } });
  if (!hotel) return forbiddenJson();

  if (roomTypeId) {
    try {
      await createPhysicalRoomFromCategory({
        hotelId,
        ownerId: owner.id,
        roomTypeId,
        roomNumber
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "DUPLICATE_ROOM_NUMBER") {
        return NextResponse.redirect(publicUrl(req, `/dashboard/owner?section=rooms&hotelId=${hotelId}&error=duplicate_room`));
      }
      return NextResponse.redirect(publicUrl(req, `/dashboard/owner?section=rooms&hotelId=${hotelId}&error=room`));
    }
    return NextResponse.redirect(publicUrl(req, `/dashboard/owner?section=rooms&hotelId=${hotelId}`));
  }

  return NextResponse.redirect(publicUrl(req, `/dashboard/owner?section=rooms&hotelId=${hotelId}&error=need_category`));
}

/** Attach photos / 360 to an existing physical room — JSON body not used; multipart. */
export async function PUT(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const form = await req.formData();
  const roomId = Number(form.get("roomId"));
  if (!roomId) return NextResponse.json({ error: "invalid_room" }, { status: 400 });

  const room = await prisma.room.findFirst({
    where: { id: roomId, hotel: { ownerId: owner.id } },
    select: { id: true, photos: { select: { sortOrder: true }, orderBy: { sortOrder: "desc" }, take: 1 } }
  });
  if (!room) return forbiddenJson();

  const kind = String(form.get("kind") ?? "PHOTO").toUpperCase() === "PANO360" ? "PANO360" : "PHOTO";
  const sceneLabel = String(form.get("sceneLabel") ?? "").trim() || null;
  const uploads = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  let order = (room.photos[0]?.sortOrder ?? -1) + 1;
  const created: { id: number; url: string }[] = [];
  try {
    for (const file of uploads) {
      const url = await savePublicImageFile(file, "room-photos");
      const row = await prisma.roomPhoto.create({
        data: { roomId: room.id, url, sortOrder: order++, kind, sceneLabel }
      });
      created.push({ id: row.id, url: row.url });
    }
  } catch (e) {
    if (e instanceof ImageUploadError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    }
    throw e;
  }
  return NextResponse.json({ ok: true, photos: created });
}
