import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { assignBookingToRoom } from "@/lib/pms/assignment";

const bodySchema = z.object({
  roomId: z.number().int().positive()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const bookingId = Number(params.id);
  if (!bookingId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const json = (await req.json().catch(() => ({}))) as unknown;
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const result = await assignBookingToRoom({
    bookingId,
    roomId: parsed.data.roomId,
    ownerId: owner.id
  });

  if (!result.ok) {
    const status = result.error === "dates_unavailable" ? 409 : result.error === "not_found" ? 404 : 400;
    const msg =
      result.error === "dates_unavailable"
        ? "Этот номер уже занят на выбранные даты."
        : result.error === "room_type_mismatch"
          ? "Комната не относится к категории брони."
          : "Не удалось назначить комнату";
    return NextResponse.json({ ok: false, error: msg }, { status });
  }

  return NextResponse.json({ ok: true });
}
