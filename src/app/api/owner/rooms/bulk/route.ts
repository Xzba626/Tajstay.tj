import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { bulkCreatePhysicalRooms, expandRoomNumbers } from "@/lib/pms/bulkRooms";

const schema = z.object({
  hotelId: z.number().int(),
  roomTypeId: z.number().int(),
  from: z.number().int().optional(),
  to: z.number().int().optional(),
  prefix: z.string().optional(),
  count: z.number().int().optional(),
  basePrice: z.number().nonnegative().optional(),
  capacity: z.number().int().positive().optional()
});

export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const hotel = await prisma.hotel.findFirst({
    where: { id: parsed.data.hotelId, ownerId: owner.id }
  });
  if (!hotel) return forbiddenJson();

  let roomNumbers: string[];
  try {
    roomNumbers = expandRoomNumbers({
      from: parsed.data.from,
      to: parsed.data.to,
      prefix: parsed.data.prefix,
      count: parsed.data.count
    });
  } catch {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  if (!roomNumbers.length) {
    return NextResponse.json({ error: "No room numbers generated" }, { status: 400 });
  }

  const roomType = await prisma.roomType.findFirst({
    where: { id: parsed.data.roomTypeId, hotelId: parsed.data.hotelId }
  });
  if (!roomType) return NextResponse.json({ error: "Room type not found" }, { status: 404 });

  const result = await bulkCreatePhysicalRooms({
    hotelId: parsed.data.hotelId,
    roomTypeId: parsed.data.roomTypeId,
    roomNumbers,
    basePrice: parsed.data.basePrice ?? Number(roomType.basePrice),
    capacity: parsed.data.capacity ?? roomType.maxGuests
  });

  return NextResponse.json({ ok: true, ...result });
}
