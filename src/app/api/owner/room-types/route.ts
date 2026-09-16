import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { amenitiesToJson } from "@/lib/pms/amenities";
import { syncRoomsFromCategory } from "@/lib/pms/createPhysicalRoom";
import { savePublicImageFile } from "@/lib/uploads/savePublicImage";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";

export async function GET(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const hotelId = Number(req.nextUrl.searchParams.get("hotelId") || "") || 0;
  if (!hotelId) return NextResponse.json({ error: "invalid_hotel" }, { status: 400 });

  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId: owner.id }, select: { id: true } });
  if (!hotel) return forbiddenJson();

  const types = await prisma.roomType.findMany({
    where: { hotelId, availability: true },
    include: {
      _count: { select: { rooms: { where: { status: { not: "ARCHIVED" } } } } },
      photos: { orderBy: { sortOrder: "asc" } },
      rooms: {
        where: { status: { not: "ARCHIVED" } },
        select: {
          id: true,
          roomNumber: true,
          title: true,
          availability: true,
          status: true,
          photos: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, kind: true, sceneLabel: true, sortOrder: true } }
        },
        orderBy: [{ roomNumber: "asc" }, { id: "asc" }]
      }
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  return NextResponse.json({ ok: true, roomTypes: types });
}

const createSchema = z.object({
  hotelId: z.number().int(),
  name: z.string().min(1).max(80),
  description: z.string().max(2000).optional(),
  basePrice: z.number().nonnegative(),
  maxGuests: z.number().int().positive().max(30),
  amenities: z.array(z.string()).optional(),
  allowExtraGuest: z.boolean().optional(),
  extraGuestPrice: z.number().nonnegative().nullable().optional()
});

export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return postWithPhotos(req, owner.id);
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const hotel = await prisma.hotel.findFirst({
    where: { id: parsed.data.hotelId, ownerId: owner.id }
  });
  if (!hotel) return forbiddenJson();

  const rt = await prisma.roomType.create({
    data: {
      hotelId: parsed.data.hotelId,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim(),
      basePrice: parsed.data.basePrice,
      maxGuests: parsed.data.maxGuests,
      adults: Math.min(parsed.data.maxGuests, 2),
      amenities: amenitiesToJson(parsed.data.amenities ?? []),
      extraGuestPrice:
        parsed.data.allowExtraGuest && parsed.data.extraGuestPrice != null
          ? parsed.data.extraGuestPrice
          : null
    }
  });

  await prisma.ratePlan.create({
    data: { roomTypeId: rt.id, name: "Standard", mealPlan: rt.mealPlan, isDefault: true }
  });

  return NextResponse.json({ ok: true, roomType: rt });
}

async function postWithPhotos(req: NextRequest, ownerId: number) {
  const form = await req.formData();
  const hotelId = Number(form.get("hotelId"));
  const name = String(form.get("name") ?? "").trim();
  const basePrice = Number(form.get("basePrice"));
  const maxGuests = Number(form.get("maxGuests") || 2);
  let amenities: string[] = [];
  try {
    amenities = JSON.parse(String(form.get("amenities") ?? "[]")) as string[];
  } catch {
    amenities = [];
  }

  if (!hotelId || !name || !(basePrice >= 0) || !(maxGuests >= 1)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId } });
  if (!hotel) return forbiddenJson();

  const rt = await prisma.roomType.create({
    data: {
      hotelId,
      name,
      basePrice,
      maxGuests,
      adults: Math.min(maxGuests, 2),
      amenities: amenitiesToJson(amenities)
    }
  });
  await prisma.ratePlan.create({
    data: { roomTypeId: rt.id, name: "Standard", mealPlan: "ROOM_ONLY", isDefault: true }
  });

  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const panos = form.getAll("panorama").filter((f): f is File => f instanceof File && f.size > 0);
  let order = 0;
  try {
    for (const file of photos) {
      const url = await savePublicImageFile(file, "room-photos");
      await prisma.roomTypePhoto.create({
        data: { roomTypeId: rt.id, url, sortOrder: order++, kind: "PHOTO" }
      });
    }
    for (const file of panos) {
      const url = await savePublicImageFile(file, "room-photos");
      const sceneLabel = String(form.get("sceneLabel") ?? "").trim() || null;
      await prisma.roomTypePhoto.create({
        data: { roomTypeId: rt.id, url, sortOrder: order++, kind: "PANO360", sceneLabel }
      });
    }
  } catch (e) {
    if (e instanceof ImageUploadError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    }
    throw e;
  }

  const full = await prisma.roomType.findUnique({
    where: { id: rt.id },
    include: { photos: true, _count: { select: { rooms: true } } }
  });
  return NextResponse.json({ ok: true, roomType: full });
}

const patchSchema = z.object({
  hotelId: z.number().int(),
  roomTypeId: z.number().int(),
  action: z.enum(["update", "archive"]).default("update"),
  name: z.string().min(1).max(80).optional(),
  basePrice: z.number().nonnegative().optional(),
  maxGuests: z.number().int().positive().max(30).optional(),
  amenities: z.array(z.string()).optional(),
  extraGuestPrice: z.number().nonnegative().nullable().optional()
});

export async function PATCH(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const hotel = await prisma.hotel.findFirst({
    where: { id: parsed.data.hotelId, ownerId: owner.id },
    select: { id: true }
  });
  if (!hotel) return forbiddenJson();

  const existing = await prisma.roomType.findFirst({
    where: { id: parsed.data.roomTypeId, hotelId: parsed.data.hotelId }
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (parsed.data.action === "archive") {
    await prisma.roomType.update({
      where: { id: existing.id },
      data: { availability: false }
    });
    return NextResponse.json({ ok: true, archived: true });
  }

  if (parsed.data.maxGuests != null && parsed.data.maxGuests < existing.maxGuests) {
    const futureConflict = await prisma.booking.count({
      where: {
        roomTypeId: existing.id,
        checkIn: { gte: new Date() },
        status: { in: ["CONFIRMED", "PENDING_OWNER", "CHECKED_IN", "WAIT_PROOF", "ON_REVIEW"] },
        guestCount: { gt: parsed.data.maxGuests }
      }
    });
    if (futureConflict > 0) {
      return NextResponse.json({ error: "capacity_conflict", count: futureConflict }, { status: 409 });
    }
  }

  const updated = await prisma.roomType.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name?.trim() ?? existing.name,
      basePrice: parsed.data.basePrice ?? existing.basePrice,
      maxGuests: parsed.data.maxGuests ?? existing.maxGuests,
      amenities: parsed.data.amenities ? amenitiesToJson(parsed.data.amenities) : existing.amenities,
      extraGuestPrice:
        parsed.data.extraGuestPrice !== undefined ? parsed.data.extraGuestPrice : existing.extraGuestPrice
    }
  });

  await syncRoomsFromCategory(updated.id);
  return NextResponse.json({ ok: true, roomType: updated });
}
