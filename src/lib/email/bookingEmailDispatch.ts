import type { Hotel, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookingRoomTitle } from "@/lib/pms/bookingContext";
import {
  appBaseUrl,
  sendBookingCancelledEmail,
  sendBookingConfirmedEmail,
  sendBookingCreatedEmail,
  sendCheckInReminderEmail,
  sendNewBookingToHostEmail,
  sendReviewRequestEmail
} from "@/lib/email/bookingEmails";

type HotelWithOwner = Hotel & { owner: User };

const hotelWithOwnerInclude = {
  room: { include: { hotel: { include: { owner: true } } } },
  roomType: { include: { hotel: { include: { owner: true } } } },
  assignedRoom: { include: { hotel: { include: { owner: true } } } }
} as const;

type BookingWithHotelOwner = {
  id: number;
  publicCode: string | null;
  guestName: string | null;
  guestEmail: string | null;
  phone: string;
  checkIn: Date;
  checkOut: Date;
  totalPrice: { toString(): string } | number;
  currency: string;
  user?: { email: string | null; name: string; firstName: string | null; phone?: string } | null;
  room?: { hotel: HotelWithOwner } | null;
  roomType?: { hotel: HotelWithOwner } | null;
  assignedRoom?: { hotel: HotelWithOwner } | null;
};

function hotelFromBooking(booking: BookingWithHotelOwner): HotelWithOwner | null {
  return booking.assignedRoom?.hotel ?? booking.room?.hotel ?? booking.roomType?.hotel ?? null;
}

function guestDisplayName(input: { name?: string | null; firstName?: string | null; guestName?: string | null }): string {
  return input.name?.trim() || input.firstName?.trim() || input.guestName?.trim() || "Гость";
}

function guestEmailFrom(booking: { guestEmail?: string | null; user?: { email?: string | null } | null }): string | null {
  const email = booking.guestEmail?.trim() || booking.user?.email?.trim();
  return email || null;
}

export async function dispatchBookingCreatedEmails(bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { email: true, name: true, firstName: true, phone: true } },
      ...hotelWithOwnerInclude
    }
  });
  if (!booking?.publicCode) return;

  const hotel = hotelFromBooking(booking);
  if (!hotel) return;

  const guestEmail = guestEmailFrom(booking);
  const guestName = guestDisplayName({ ...booking.user, guestName: booking.guestName });
  const base = appBaseUrl();
  const paymentUrl = `${base}/payment/${encodeURIComponent(booking.publicCode)}`;

  if (guestEmail) {
    await sendBookingCreatedEmail({
      guestEmail,
      guestName,
      bookingCode: booking.publicCode,
      hotelName: hotel.name,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalPrice: Number(booking.totalPrice),
      currency: booking.currency || "TJS",
      paymentUrl
    });
  }

  const hostEmail = hotel.owner.email?.trim();
  if (hostEmail) {
    await sendNewBookingToHostEmail({
      hostEmail,
      hostName: guestDisplayName(hotel.owner),
      guestName,
      guestPhone: booking.phone || booking.user?.phone || undefined,
      bookingCode: booking.publicCode,
      roomName: bookingRoomTitle(booking),
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalPrice: Number(booking.totalPrice),
      dashboardUrl: `${base}/dashboard/owner?section=bookings`
    });
  }
}

export async function dispatchBookingConfirmedEmails(bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { email: true, name: true, firstName: true } },
      ...hotelWithOwnerInclude
    }
  });
  if (!booking) return;

  const hotel = hotelFromBooking(booking);
  if (!hotel) return;

  const guestEmail = guestEmailFrom(booking);
  if (!guestEmail) return;

  const base = appBaseUrl();
  await sendBookingConfirmedEmail({
    guestEmail,
    guestName: guestDisplayName({ ...booking.user, guestName: booking.guestName }),
    hotelName: hotel.name,
    hotelAddress: hotel.address,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    bookingCode: booking.publicCode,
    hostPhone: hotel.owner.phone || undefined,
    chatUrl: `${base}/chat/booking/${booking.id}`
  });
}

export async function dispatchBookingCancelledEmails(
  bookingId: number,
  cancelledBy: "guest" | "host" | "admin" | "system",
  reason?: string
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { email: true, name: true, firstName: true } },
      ...hotelWithOwnerInclude
    }
  });
  if (!booking?.publicCode) return;

  const hotel = hotelFromBooking(booking);
  if (!hotel) return;

  const code = booking.publicCode;
  const hotelName = hotel.name;

  const guestEmail = guestEmailFrom(booking);
  if (guestEmail) {
    await sendBookingCancelledEmail({
      email: guestEmail,
      name: guestDisplayName({ ...booking.user, guestName: booking.guestName }),
      bookingCode: code,
      cancelledBy,
      reason,
      hotelName
    });
  }

  const hostEmail = hotel.owner.email?.trim();
  if (hostEmail) {
    await sendBookingCancelledEmail({
      email: hostEmail,
      name: guestDisplayName(hotel.owner),
      bookingCode: code,
      cancelledBy,
      reason,
      hotelName
    });
  }
}

export async function dispatchCheckInReminderEmail(bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { email: true, name: true, firstName: true } },
      ...hotelWithOwnerInclude
    }
  });
  if (!booking) return;

  const hotel = hotelFromBooking(booking);
  if (!hotel) return;

  const guestEmail = guestEmailFrom(booking);
  if (!guestEmail) return;

  const base = appBaseUrl();
  await sendCheckInReminderEmail({
    guestEmail,
    guestName: guestDisplayName({ ...booking.user, guestName: booking.guestName }),
    hotelName: hotel.name,
    hotelAddress: hotel.address,
    checkIn: booking.checkIn,
    hostPhone: hotel.owner.phone || undefined,
    chatUrl: `${base}/chat/booking/${booking.id}`
  });
}

export async function dispatchReviewRequestEmail(bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { email: true, name: true, firstName: true } },
      ...hotelWithOwnerInclude,
      review: { select: { id: true } }
    }
  });
  if (!booking || booking.review) return;

  const guestEmail = guestEmailFrom(booking);
  if (!guestEmail) return;

  const hotel = hotelFromBooking(booking);
  if (!hotel) return;

  await sendReviewRequestEmail({
    guestEmail,
    guestName: guestDisplayName({ ...booking.user, guestName: booking.guestName }),
    hotelName: hotel.name,
    reviewUrl: `${appBaseUrl()}/dashboard/bookings`
  });
}
