import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";

/** Демо-данные для разработки (admin / owner / guest, отель, бронь). */
export async function runDevSeed() {
  const adminPass = await hashPassword("Admin123!");
  const ownerPass = await hashPassword("Owner123!");
  const guestPass = await hashPassword("Guest123!");

  const admin = await prisma.user.upsert({
    where: { phone: "+992900000001" },
    update: {
      name: "Admin",
      email: "admin@tajstay.local",
      password: adminPass,
      role: "ADMIN",
      verified: true
    },
    create: {
      name: "Admin",
      phone: "+992900000001",
      email: "admin@tajstay.local",
      password: adminPass,
      role: "ADMIN",
      verified: true
    }
  });

  const owner = await prisma.user.upsert({
    where: { phone: "+992900000002" },
    update: {
      name: "Owner",
      email: "owner@tajstay.local",
      password: ownerPass,
      role: "OWNER",
      verified: true
    },
    create: {
      name: "Owner",
      phone: "+992900000002",
      email: "owner@tajstay.local",
      password: ownerPass,
      role: "OWNER",
      verified: true
    }
  });

  await prisma.ownerApplication.deleteMany({ where: { userId: owner.id } });
  await prisma.ownerApplication.create({
    data: {
      userId: owner.id,
      fullName: owner.name,
      phone: owner.phone,
      email: owner.email ?? "owner@tajstay.local",
      businessName: "Seed Owner Co",
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedById: admin.id
    }
  });

  const guest = await prisma.user.upsert({
    where: { phone: "+992900000003" },
    update: {
      name: "Guest",
      email: "guest@tajstay.local",
      password: guestPass,
      role: "GUEST",
      verified: true
    },
    create: {
      name: "Guest",
      phone: "+992900000003",
      email: "guest@tajstay.local",
      password: guestPass,
      role: "GUEST",
      verified: true
    }
  });

  const hotel = await prisma.hotel.upsert({
    where: { id: 1 },
    update: { status: "APPROVED" },
    create: {
      id: 1,
      ownerId: owner.id,
      name: "TajStay Dushanbe Premium",
      city: "Dushanbe",
      address: "Rudaki Avenue 1",
      description: "Современный городской отель с панорамой на горы и высоким уровнем сервиса.",
      status: "APPROVED",
      rating: 4.8,
      latitude: 38.5598,
      longitude: 68.787,
      propertyType: "HOTEL"
    }
  });

  await prisma.room.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      hotelId: hotel.id,
      title: "Deluxe King",
      price: 550,
      capacity: 2,
      amenities: JSON.stringify(["wifi", "breakfast", "parking"]),
      availability: true
    }
  });

  await prisma.room.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      hotelId: hotel.id,
      title: "Family Suite",
      price: 820,
      capacity: 4,
      amenities: JSON.stringify(["wifi", "breakfast", "parking", "view"]),
      availability: true
    }
  });

  const pastCheckIn = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const pastCheckOut = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const booking = await prisma.booking.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      userId: guest.id,
      roomId: 1,
      checkIn: pastCheckIn,
      checkOut: pastCheckOut,
      totalPrice: 550 * 5,
      commission: Number((550 * 5 * 0.12).toFixed(2)),
      paymentStatus: "PAID",
      payOnArrival: false,
      phone: guest.phone,
      status: "CONFIRMED"
    }
  });

  await prisma.notification.deleteMany({ where: { bookingId: booking.id } });
  await prisma.notification.create({
    data: {
      userId: hotel.ownerId,
      bookingId: booking.id,
      type: "NEW_BOOKING",
      isRead: false
    }
  });

  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const dateUtc = new Date(Date.UTC(futureDate.getUTCFullYear(), futureDate.getUTCMonth(), futureDate.getUTCDate(), 0, 0, 0));
  await prisma.roomDateOverride.deleteMany({ where: { roomId: 1, date: dateUtc } });
  await prisma.roomDateOverride.create({
    data: {
      roomId: 1,
      date: dateUtc,
      isBlocked: false,
      customPrice: 600
    }
  });

  return {
    adminId: admin.id,
    ownerId: owner.id,
    guestId: guest.id,
    hotelId: hotel.id
  };
}
