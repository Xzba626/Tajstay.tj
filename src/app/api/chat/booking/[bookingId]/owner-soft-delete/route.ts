import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { getBookingChatMessages, ownerSoftDeleteBookingChat } from "@/lib/chat/bookingChat";

/** Владелец: скрыть переписку из UI (мягко, данные в БД сохраняются). */
export async function POST(_: NextRequest, { params }: { params: { bookingId: string } }) {
  const user = await requireUser(["OWNER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookingId = Number.parseInt(String(params.bookingId ?? "").trim(), 10);
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  const ok = await ownerSoftDeleteBookingChat(bookingId, user.id);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await getBookingChatMessages(bookingId, 200);
  return NextResponse.json({ ok: true, messages }, { status: 200 });
}
