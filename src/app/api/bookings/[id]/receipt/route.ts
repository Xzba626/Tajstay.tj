import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { bookingHotel, bookingRoomTitle } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      ...bookingWithHotelInclude,
      user: { select: { id: true, name: true } }
    }
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isGuest = booking.userId === user.id;
  const isAdmin = user.role === "ADMIN";
  let isOwner = false;
  if (!isGuest && !isAdmin) {
    try {
      const hotel = bookingHotel(booking);
      isOwner = hotel.ownerId === user.id;
    } catch {
      isOwner = false;
    }
  }
  if (!isGuest && !isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hotel = bookingHotel(booking);
  const code = booking.publicCode ?? `TS${booking.id}`;
  const guestName = booking.user?.name ?? booking.guestName ?? "Гость";
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Квитанция ${code}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 1rem; color: #111; }
    h1 { font-size: 1.25rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    td { padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    td:first-child { color: #6b7280; width: 40%; }
    .total { font-weight: 700; font-size: 1.1rem; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Квитанция TajStay — ${code}</h1>
  <table>
    <tr><td>Гость</td><td>${guestName}</td></tr>
    <tr><td>Объект</td><td>${hotel.name}</td></tr>
    <tr><td>Номер</td><td>${bookingRoomTitle(booking)}</td></tr>
    <tr><td>Заезд</td><td>${booking.checkIn.toISOString().slice(0, 10)}</td></tr>
    <tr><td>Выезд</td><td>${booking.checkOut.toISOString().slice(0, 10)}</td></tr>
    <tr><td>Статус</td><td>${booking.status}</td></tr>
    <tr><td>Оплата</td><td>${booking.paymentStatus}</td></tr>
    <tr><td class="total">Итого</td><td class="total">${Number(booking.totalPrice)} ${booking.currency}</td></tr>
  </table>
  <p style="margin-top:2rem;font-size:0.875rem;color:#6b7280">TajStay — бронирование жилья в Таджикистане</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="receipt-${code}.html"`
    }
  });
}
