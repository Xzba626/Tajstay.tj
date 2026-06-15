import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { restoreBookingChatFromArchive } from "@/lib/chat/bookingChat";

/** Восстановление переписки из архива (споры). */
export async function POST(req: NextRequest) {
  const user = await requireUser(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { bookingId?: unknown };
  const bookingId = Number.parseInt(String(body.bookingId ?? "").trim(), 10);
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  const { restoredRows } = await restoreBookingChatFromArchive(bookingId);
  return NextResponse.json({ ok: true, bookingId, restoredRows }, { status: 200 });
}
