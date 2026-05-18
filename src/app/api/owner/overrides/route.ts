import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { z } from "zod";
import { publicUrl } from "@/lib/http/publicOrigin";

const schema = z.object({
  roomId: z.coerce.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isBlocked: z.coerce.boolean().optional(),
  customPrice: z.coerce.number().optional().nullable()
});

function dateOnlyUTC(value: string): Date {
  const [y, m, d] = value.split("-").map((s) => Number(s));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

export async function POST(req: Request) {
  const user = await getOwnerUser();
  if (!user) return forbiddenJson();

  const form = await req.formData();
  const payload = {
    roomId: Number(form.get("roomId")),
    date: String(form.get("date") ?? ""),
    isBlocked: form.get("isBlocked") ? true : false,
    customPrice: form.get("customPrice") ? Number(form.get("customPrice")) : null
  };

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { roomId, date, isBlocked, customPrice } = parsed.data;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { hotel: true }
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.hotel.ownerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dateUtc = dateOnlyUTC(date);
  await prisma.roomDateOverride.deleteMany({ where: { roomId, date: dateUtc } });

  await prisma.roomDateOverride.create({
    data: {
      roomId,
      date: dateUtc,
      isBlocked: Boolean(isBlocked),
      customPrice: isBlocked ? null : customPrice ?? null
    }
  });

  const u = publicUrl(req, "/dashboard/owner");
  u.searchParams.set("section", "calendar");
  return NextResponse.redirect(u);
}

