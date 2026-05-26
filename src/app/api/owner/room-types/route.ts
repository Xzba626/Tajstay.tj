import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { amenitiesToJson } from "@/lib/pms/amenities";

export async function GET(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const hotelId = Number(req.nextUrl.searchParams.get("hotelId") || "") || undefined;
  const types = await prisma.roomType.findMany({
    where: {
      hotel: { ownerId: owner.id },
      ...(hotelId ? { hotelId } : {})
    },
    include: {
      _count: { select: { rooms: true } },
      ratePlans: { where: { isDefault: true }, take: 1 }
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  return NextResponse.json({ ok: true, roomTypes: types });
}

const createSchema = z.object({
  hotelId: z.number().int(),
  name: z.string().min(1),
  description: z.string().optional(),
  basePrice: z.number().nonnegative(),
  weekendPrice: z.number().nonnegative().optional(),
  maxGuests: z.number().int().positive(),
  adults: z.number().int().positive().optional(),
  mealPlan: z.string().optional(),
  amenities: z.array(z.string()).optional()
});

export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

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
      weekendPrice: parsed.data.weekendPrice,
      maxGuests: parsed.data.maxGuests,
      adults: parsed.data.adults ?? 2,
      mealPlan: parsed.data.mealPlan ?? "ROOM_ONLY",
      amenities: amenitiesToJson(parsed.data.amenities ?? [])
    }
  });

  await prisma.ratePlan.create({
    data: { roomTypeId: rt.id, name: "Стандартный тариф", mealPlan: rt.mealPlan, isDefault: true }
  });

  return NextResponse.json({ ok: true, roomType: rt });
}
