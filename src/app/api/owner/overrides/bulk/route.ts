import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { z } from "zod";

const schema = z.object({
  roomId: z.number().int(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isBlocked: z.boolean().optional(),
  customPrice: z.number().nullable().optional(),
  clear: z.boolean().optional()
});

function dateOnlyUTC(value: string): Date {
  const [y, m, d] = value.split("-").map((s) => Number(s));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

function eachDayKeys(start: string, end: string): string[] {
  const a = dateOnlyUTC(start);
  const b = dateOnlyUTC(end);
  const from = a.getTime() <= b.getTime() ? a : b;
  const to = a.getTime() <= b.getTime() ? b : a;
  const keys: string[] = [];
  let cur = from;
  while (cur.getTime() <= to.getTime()) {
    keys.push(cur.toISOString().slice(0, 10));
    cur = addDays(cur, 1);
  }
  return keys;
}

export async function POST(req: Request) {
  const user = await getOwnerUser();
  if (!user) return forbiddenJson();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const { roomId, startDate, endDate, isBlocked, customPrice, clear } = parsed.data;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { hotel: true }
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.hotel.ownerId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dayKeys = eachDayKeys(startDate, endDate);
  if (dayKeys.length > 60) {
    return NextResponse.json({ error: "Range too large (max 60 days)" }, { status: 400 });
  }

  const dates = dayKeys.map((k) => dateOnlyUTC(k));

  if (clear) {
    await prisma.roomDateOverride.deleteMany({
      where: { roomId, date: { in: dates } }
    });
    return NextResponse.json({ ok: true, count: dates.length });
  }

  const blocked = Boolean(isBlocked);
  const price = blocked ? null : customPrice ?? null;

  await prisma.$transaction(async (tx) => {
    for (const dateUtc of dates) {
      await tx.roomDateOverride.deleteMany({ where: { roomId, date: dateUtc } });
      await tx.roomDateOverride.create({
        data: { roomId, date: dateUtc, isBlocked: blocked, customPrice: price }
      });
    }
  });

  return NextResponse.json({ ok: true, count: dates.length });
}
