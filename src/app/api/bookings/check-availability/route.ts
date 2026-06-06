import { NextRequest, NextResponse } from "next/server";
import { checkRoomDateAvailability } from "@/lib/booking/availability";
import { getRoomTypeAvailability } from "@/lib/pms/inventory";

function parseDateOnly(raw: string): Date | null {
  const s = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  let body: {
    property_id?: number;
    room_id?: number;
    room_type_id?: number;
    check_in?: string;
    check_out?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const roomId = Number(body.room_id);
  const roomTypeId = Number(body.room_type_id);
  const checkIn = parseDateOnly(String(body.check_in ?? ""));
  const checkOut = parseDateOnly(String(body.check_out ?? ""));

  if ((!roomId && !roomTypeId) || !checkIn || !checkOut) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (checkOut.getTime() <= checkIn.getTime()) {
    return NextResponse.json({ error: "dates", available: false, conflicting_dates: [] }, { status: 400 });
  }

  if (roomId) {
    const result = await checkRoomDateAvailability({ roomId, checkIn, checkOut });
    return NextResponse.json({
      available: result.available,
      conflicting_dates: result.conflicting_dates,
      conflicts: result.conflicts
    });
  }

  const snap = await getRoomTypeAvailability({ roomTypeId, checkIn, checkOut });
  const available = snap.availableCount > 0;
  return NextResponse.json({
    available,
    conflicting_dates: available ? [] : [body.check_in!, body.check_out!].filter(Boolean),
    roomType: {
      totalRooms: snap.totalRooms,
      availableCount: snap.availableCount,
      occupiedCount: snap.occupiedCount
    }
  });
}
