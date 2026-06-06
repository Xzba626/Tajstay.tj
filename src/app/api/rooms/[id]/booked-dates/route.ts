import { NextRequest, NextResponse } from "next/server";
import { addMonths } from "date-fns";
import { getRoomBookedDateRanges } from "@/lib/booking/availability";

function parseDateOnly(raw: string | null, fallback: Date): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const roomId = Number(params.id);
  if (!roomId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const defaultTo = addMonths(defaultFrom, 12);

  const from = parseDateOnly(req.nextUrl.searchParams.get("from"), defaultFrom);
  const to = parseDateOnly(req.nextUrl.searchParams.get("to"), defaultTo);

  if (to.getTime() <= from.getTime()) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }

  const data = await getRoomBookedDateRanges(roomId, from, to);
  return NextResponse.json({
    room_id: roomId,
    ranges: data.ranges,
    disabledDates: data.disabledDates
  });
}
