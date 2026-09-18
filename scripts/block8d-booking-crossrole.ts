import { prisma } from "../src/lib/prisma";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/email/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const setCookie = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const cookie =
    setCookie.map((c) => c.split(";")[0]).join("; ") ||
    (res.headers.get("set-cookie") ?? "").split(",").map((c) => c.split(";")[0].trim()).join("; ");
  return { status: res.status, cookie };
}

async function postBooking(opts: {
  cookie: string;
  roomId: number;
  checkIn: string;
  checkOut: string;
  phone: string;
  guestName: string;
  paymentOption: "PAY_NOW" | "PAY_AT_CHECK_IN";
  hotelPaymentMethodId?: number;
}) {
  const fd = new FormData();
  fd.set("roomId", String(opts.roomId));
  fd.set("checkIn", opts.checkIn);
  fd.set("checkOut", opts.checkOut);
  fd.set("phone", opts.phone);
  fd.set("guestName", opts.guestName);
  fd.set("paymentOption", opts.paymentOption);
  if (opts.hotelPaymentMethodId) fd.set("hotelPaymentMethodId", String(opts.hotelPaymentMethodId));
  const res = await fetch(`${BASE}/api/bookings?json=1`, {
    method: "POST",
    body: fd,
    headers: { "x-json": "1", accept: "application/json", cookie: opts.cookie }
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function main() {
  const guest = await login("guest@tajstay.local", "Guest123!");
  if (!guest.cookie) throw new Error("guest login failed");

  const room = await prisma.room.findFirst({
    where: { status: "ACTIVE", hotel: { ownerId: 2, status: "APPROVED" }, price: { gt: 0 } },
    orderBy: { id: "asc" },
    select: { id: true, hotelId: true, price: true, title: true }
  });
  if (!room) throw new Error("no room");
  const method = await prisma.hotelPaymentMethod.findFirst({
    where: { hotelId: room.hotelId, isActive: true },
    select: { id: true }
  });
  const hotel = await prisma.hotel.findUnique({
    where: { id: room.hotelId },
    select: { acceptsPayAtCheckIn: true, name: true }
  });

  const payNow = await postBooking({
    cookie: guest.cookie,
    roomId: room.id,
    checkIn: "2031-07-10",
    checkOut: "2031-07-12",
    phone: "+992900000003",
    guestName: "Guest B8D PayNow",
    paymentOption: "PAY_NOW",
    hotelPaymentMethodId: method?.id
  });
  console.log("PAY_NOW", payNow.status, JSON.stringify(payNow.json));

  let pac = { status: 0, json: {} as Record<string, unknown> };
  if (hotel?.acceptsPayAtCheckIn) {
    pac = await postBooking({
      cookie: guest.cookie,
      roomId: room.id,
      checkIn: "2031-08-10",
      checkOut: "2031-08-12",
      phone: "+992900000003",
      guestName: "Guest B8D PAC",
      paymentOption: "PAY_AT_CHECK_IN"
    });
    console.log("PAY_AT_CHECK_IN", pac.status, JSON.stringify(pac.json));
  } else {
    // enable temporarily for proof then leave as-is if already false — do not mutate product policy silently
    console.log("PAY_AT_CHECK_IN hotel flag", hotel);
  }

  const bookingId = (payNow.json as { bookingId?: number }).bookingId;
  if (bookingId) {
    const b = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        publicCode: true,
        status: true,
        paymentStatus: true,
        payOnArrival: true,
        expiresAt: true,
        totalPrice: true,
        userId: true,
        roomId: true,
        source: true
      }
    });
    console.log("BOOKING_DB", JSON.stringify(b));
    const owner = await login("owner@tajstay.local", "Owner123!");
    const cal = await fetch(`${BASE}/api/owner/calendar?hotelId=${room.hotelId}`, {
      headers: { Cookie: owner.cookie, Accept: "application/json" }
    });
    const calJson = await cal.json().catch(() => ({}));
    const has = JSON.stringify(calJson).includes(String(bookingId));
    console.log("OWNER_CALENDAR", cal.status, "hasBooking", has);
    const guestChat = await fetch(`${BASE}/api/chat/booking/${bookingId}/messages`, {
      headers: { Cookie: guest.cookie }
    });
    const ownerChat = await fetch(`${BASE}/api/chat/booking/${bookingId}/messages`, {
      headers: { Cookie: owner.cookie }
    });
    console.log("CHAT guest", guestChat.status, "owner", ownerChat.status);

    // Manager visibility
    const mgr = await prisma.hotelStaff.findFirst({
      where: { hotelId: room.hotelId, status: "ACTIVE", staffRole: "MANAGER" }
    });
    if (mgr) {
      const token = (await import("node:crypto")).randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 86400000);
      await prisma.session.create({
        data: { token, sessionToken: token, userId: mgr.userId, expires: expiresAt, expiresAt }
      });
      const today = await fetch(`${BASE}/api/manager/bookings?hotelId=${room.hotelId}`, {
        headers: { Cookie: `tajstay_session=${token}` }
      });
      const t = await today.text();
      console.log("MANAGER_BOOKINGS", today.status, t.includes(String(bookingId)) || t.includes(b?.publicCode ?? "___"));
      await prisma.session.deleteMany({ where: { token } });
    }
  }

  const pacId = (pac.json as { bookingId?: number }).bookingId;
  if (pacId) {
    const pb = await prisma.booking.findUnique({
      where: { id: pacId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        payOnArrival: true,
        expiresAt: true,
        publicCode: true
      }
    });
    console.log("PAC_DB", JSON.stringify(pb));
  }

  await prisma.$disconnect();
}

void main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
