import { NextRequest, NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { confirmBookingPaymentOwner } from "@/lib/bookings/ownerPaymentApprove";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const updated = await confirmBookingPaymentOwner(id, owner.id);
    return NextResponse.json({ ok: true, booking: updated });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Бронь не найдена" }, { status: 404 });
    if (code === "FORBIDDEN") {
      return NextResponse.json({ error: "Эта бронь не принадлежит вашему объекту" }, { status: 403 });
    }
    if (code === "INVALID_STATUS") {
      return NextResponse.json({ error: "Нельзя подтвердить оплату для текущего статуса" }, { status: 400 });
    }
    if (code === "DATES_UNAVAILABLE") {
      return NextResponse.json({ error: "Номер занят на выбранные даты" }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
