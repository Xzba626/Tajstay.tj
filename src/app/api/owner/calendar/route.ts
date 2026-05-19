import { NextRequest, NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { getOwnerCalendarData } from "@/lib/services/ownerCalendar";

export async function GET(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const days = Math.min(60, Math.max(7, Number(req.nextUrl.searchParams.get("days") || "30") || 30));
  const hotelId = Number(req.nextUrl.searchParams.get("hotelId") || "") || undefined;
  const roomId = Number(req.nextUrl.searchParams.get("roomId") || "") || undefined;

  const data = await getOwnerCalendarData(owner.id, days);
  let { rooms } = data;
  if (hotelId) rooms = rooms.filter((r) => r.hotelId === hotelId);
  if (roomId) rooms = rooms.filter((r) => r.id === roomId);

  return NextResponse.json({ ok: true, ...data, rooms });
}
