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

  const extraHotels = [
    {
      id: 2,
      name: "Khujand Riverside Inn",
      city: "Khujand",
      address: "Lenin Street 45",
      description: "Уютный отель у Сырдарьи, удобно для семейных поездок.",
      rating: 4.4,
      latitude: 40.2822,
      longitude: 69.622,
      propertyType: "HOTEL",
      rooms: [
        { id: 3, title: "Standard Double", price: 320, capacity: 2, amenities: ["wifi", "breakfast"] },
        { id: 4, title: "Family Room", price: 480, capacity: 4, amenities: ["wifi", "breakfast", "parking"] }
      ]
    },
    {
      id: 3,
      name: "Penjikent Guest House",
      city: "Penjikent",
      address: "Rudaki 12",
      description: "Гостевой дом рядом с древним Пенджикентом.",
      rating: 4.2,
      latitude: 39.495,
      longitude: 67.609,
      propertyType: "GUEST_HOUSE",
      rooms: [{ id: 5, title: "Garden Room", price: 180, capacity: 2, amenities: ["wifi", "breakfast"] }]
    },
    {
      id: 4,
      name: "Khorog Mountain Lodge",
      city: "Badakhshan",
      address: "Pamir Highway 8",
      description: "Эко-lodge с видом на Памир.",
      rating: 4.7,
      latitude: 37.492,
      longitude: 71.549,
      propertyType: "ECO_HOUSE",
      rooms: [{ id: 6, title: "Mountain View", price: 400, capacity: 2, amenities: ["wifi", "parking"] }]
    },
    {
      id: 5,
      name: "Dushanbe City Hostel",
      city: "Dushanbe",
      address: "Ismoili Somoni 22",
      description: "Бюджетный хостел в центре Душанбе.",
      rating: 4.0,
      latitude: 38.5731,
      longitude: 68.786,
      propertyType: "HOSTEL",
      rooms: [{ id: 7, title: "Bunk Bed", price: 90, capacity: 1, amenities: ["wifi"] }]
    },
    {
      id: 6,
      name: "Istaravshan Comfort Apartments",
      city: "Khujand",
      address: "Istaravshan Center 3",
      description: "Квартиры с кухней и парковкой.",
      rating: 4.3,
      latitude: 39.911,
      longitude: 69.006,
      propertyType: "APARTMENT",
      rooms: [{ id: 8, title: "Studio", price: 250, capacity: 3, amenities: ["wifi", "parking"] }]
    }
  ] as const;

  for (const item of extraHotels) {
    await prisma.hotel.upsert({
      where: { id: item.id },
      update: {
        status: "APPROVED",
        name: item.name,
        city: item.city,
        address: item.address,
        description: item.description,
        rating: item.rating,
        latitude: item.latitude,
        longitude: item.longitude,
        propertyType: item.propertyType,
        ownerId: owner.id
      },
      create: {
        id: item.id,
        ownerId: owner.id,
        name: item.name,
        city: item.city,
        address: item.address,
        description: item.description,
        status: "APPROVED",
        rating: item.rating,
        latitude: item.latitude,
        longitude: item.longitude,
        propertyType: item.propertyType
      }
    });

    for (const room of item.rooms) {
      await prisma.room.upsert({
        where: { id: room.id },
        update: {
          hotelId: item.id,
          title: room.title,
          price: room.price,
          capacity: room.capacity,
          amenities: JSON.stringify(room.amenities),
          availability: true
        },
        create: {
          id: room.id,
          hotelId: item.id,
          title: room.title,
          price: room.price,
          capacity: room.capacity,
          amenities: JSON.stringify(room.amenities),
          availability: true
        }
      });
    }
  }

  return {
    adminId: admin.id,
    ownerId: owner.id,
    guestId: guest.id,
    hotelId: hotel.id
  };
}
