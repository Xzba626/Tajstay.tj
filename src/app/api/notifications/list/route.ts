import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function deriveLink(n: { bookingId: number | null; type: string; userRole: string }): string {
  if (!n.bookingId) return n.userRole === "OWNER" ? "/dashboard/owner?section=notifications" : "/dashboard/guest";
  if (n.userRole === "OWNER") return "/dashboard/owner?section=bookings";
  if (n.userRole === "ADMIN") return "/dashboard/admin?section=notifications";
  return "/dashboard/guest";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ items: [] }, { status: 200 });

  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    include: {
      booking: {
        include: {
          room: { include: { hotel: true } },
          user: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 12
  });

  const items = rows.map((n) => {
    const bookingCode = n.booking?.publicCode ?? null;
    const hotelName = n.booking?.room?.hotel?.name ?? null;
    const guestName =
      n.booking?.guestName?.trim() || n.booking?.user?.name?.trim() || n.booking?.guestPhone?.trim() || null;
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      bookingId: n.bookingId,
      bookingCode,
      hotelName,
      guestName,
      link: n.link || deriveLink({ bookingId: n.bookingId, type: n.type, userRole: user.role })
    };
  });

  return NextResponse.json({ items }, { status: 200 });
}

