import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { initializeBookingChatRoom } from "@/lib/chat/initializeBookingChat";
import { canAccessBookingChat } from "@/lib/chat/bookingAccess";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

export async function POST(req: NextRequest, { params }: { params: { bookingId: string } }) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "HOTEL_MODERATOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookingId = Number.parseInt(String(params.bookingId ?? "").trim(), 10);
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid bookingId" }, { status: 400 });
  }

  let localeFromBody: string | undefined;
  const ct = (req.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("application/json")) {
    try {
      const body = (await req.json()) as { locale?: string };
      localeFromBody = body?.locale;
    } catch {
      /* ignore */
    }
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingWithHotelInclude
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await canAccessBookingChat(booking, user))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await initializeBookingChatRoom(bookingId, localeFromBody);
  if (!result.ok && result.reason === "no_admin") {
    return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json(
    {
      ok: true,
      ownerId: result.ownerId,
      adminId: result.adminId,
      alreadyInitialized: result.alreadyInitialized
    },
    { status: 200 }
  );
}
