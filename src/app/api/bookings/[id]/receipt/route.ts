import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { bookingHotel, bookingRoomTitle } from "@/lib/pms/bookingContext";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingWithHotelInclude
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isGuest = booking.userId === user.id;
  const hotel = bookingHotel(booking);
  const isOwner = user.role === "OWNER" && hotel.ownerId === user.id;
  if (!isGuest && !isOwner && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const code = booking.publicCode ?? `TS-${booking.id}`;
  const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"/><title>Квитанция ${code}</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:1rem;color:#111}
h1{font-size:1.25rem}table{width:100%;border-collapse:collapse;margin-top:1rem}td{padding:.5rem;border-bottom:1px solid #eee}
.footer{margin-top:2rem;font-size:.85rem;color:#666}</style></head><body>
<h1>TajStay — квитанция</h1>
<p>Код брони: <strong>${code}</strong></p>
<table>
<tr><td>Отель</td><td>${hotel.name}</td></tr>
<tr><td>Номер</td><td>${bookingRoomTitle(booking)}</td></tr>
<tr><td>Заезд</td><td>${booking.checkIn.toISOString().slice(0, 10)}</td></tr>
<tr><td>Выезд</td><td>${booking.checkOut.toISOString().slice(0, 10)}</td></tr>
<tr><td>Статус</td><td>${booking.status}</td></tr>
<tr><td>Оплата</td><td>${booking.paymentStatus}</td></tr>
<tr><td>Сумма</td><td><strong>${Number(booking.totalPrice).toFixed(2)} ${booking.currency}</strong></td></tr>
</table>
<p class="footer">Документ сформирован ${new Date().toLocaleString("ru-RU")}. TajStay</p>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="tajstay-receipt-${code}.html"`
    }
  });
}
