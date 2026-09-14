/**
 * BLOCK 5.3A — creates fully disposable QA fixtures (never touches any existing shared account)
 * for real browser owner/guest lifecycle testing: a fresh OWNER with a known password, a fresh
 * APPROVED hotel + room + active HotelPaymentMethod, and a fresh GUEST with a known password.
 * Prints credentials + ids as JSON. Run: npx tsx scripts/setup-block53a-fixtures.ts
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const tag = Date.now();
  const ownerPassword = "Qa5_3AOwner!" + (tag % 1000);
  const guestPassword = "Qa5_3AGuest!" + (tag % 1000);

  const owner = await prisma.user.create({
    data: {
      name: "5.3A QA Owner",
      email: `qa-5-3a-owner-${tag}@tajstay.local`,
      phone: `+992700${String(tag).slice(-6)}`,
      password: await hashPassword(ownerPassword),
      role: "OWNER",
      verified: true
    }
  });

  const hotel = await prisma.hotel.create({
    data: {
      ownerId: owner.id,
      name: `5.3A QA Hotel ${tag}`,
      city: "Dushanbe",
      address: "Test street 1",
      description: "Disposable QA fixture for BLOCK 5.3A",
      propertyType: "HOTEL",
      status: "APPROVED",
      latitude: 38.5598,
      longitude: 68.787
    }
  });

  const room = await prisma.room.create({
    data: {
      hotelId: hotel.id,
      roomTypeId: null,
      roomNumber: `5.3A-${tag}`,
      title: "5.3A QA Room",
      price: 200,
      capacity: 2,
      amenities: "[]",
      status: "ACTIVE",
      availability: true
    }
  });

  const method = await prisma.hotelPaymentMethod.create({
    data: {
      hotelId: hotel.id,
      type: "CARD",
      displayLabel: "5.3A QA Card",
      recipientName: "5.3A QA Recipient",
      paymentIdentifier: "5.3A-CARD-0001",
      instructions: "5.3A QA instructions",
      isActive: true,
      sortOrder: 0
    }
  });

  const guest = await prisma.user.create({
    data: {
      name: "5.3A QA Guest",
      email: `qa-5-3a-guest-${tag}@tajstay.local`,
      phone: `+992701${String(tag).slice(-6)}`,
      password: await hashPassword(guestPassword),
      role: "GUEST",
      verified: true
    }
  });

  console.log(
    JSON.stringify(
      {
        ownerId: owner.id,
        ownerEmail: owner.email,
        ownerPassword,
        hotelId: hotel.id,
        roomId: room.id,
        methodId: method.id,
        guestId: guest.id,
        guestEmail: guest.email,
        guestPassword
      },
      null,
      2
    )
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
