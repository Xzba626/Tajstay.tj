import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { canAccessBookingChat } from "@/lib/chat/bookingAccess";
import { triggerBookingChatEvent } from "@/lib/pusher/server";
import { PUSHER_EVENTS } from "@/lib/pusher/config";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

const schema = z.object({
  typing: z.boolean()
});

export async function POST(req: NextRequest, { params }: { params: { bookingId: string } }) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "HOTEL_MODERATOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookingId = Number.parseInt(String(params.bookingId ?? "").trim(), 10);
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingWithHotelInclude
  });
  if (!booking || !(await canAccessBookingChat(booking, user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  await triggerBookingChatEvent(bookingId, PUSHER_EVENTS.TYPING, {
    userId: user.id,
    name: user.name,
    typing: parsed.data.typing
  });

  return NextResponse.json({ ok: true });
}
