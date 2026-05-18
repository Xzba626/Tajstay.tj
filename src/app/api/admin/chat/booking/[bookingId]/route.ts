import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { adminPurgeBookingChatCompletely } from "@/lib/chat/bookingChat";

/** Полное удаление переписки по брони: активные + архив + файлы вложений. */
export async function DELETE(_: NextRequest, { params }: { params: { bookingId: string } }) {
  const user = await requireUser(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookingId = Number.parseInt(String(params.bookingId ?? "").trim(), 10);
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  const { deletedFiles } = await adminPurgeBookingChatCompletely(bookingId);
  return NextResponse.json({ ok: true, deletedFiles }, { status: 200 });
}
