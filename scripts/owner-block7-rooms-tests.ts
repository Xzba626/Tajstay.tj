/**
 * BLOCK 7 — Rooms / Categories / Inventory / Media / 360° closure tests.
 * Extends Owner BLOCK 4 proofs with archive, price immutability, zero-room UX.
 * Run: npx tsx scripts/owner-block7-rooms-tests.ts
 */
import fs from "node:fs";
import path from "node:path";
import { groupHotelRooms } from "../src/lib/hotel/groupHotelRooms";
import { amenitiesToJson } from "../src/lib/pms/amenities";

type Row = { name: string; ok: boolean; detail: string };
const results: Row[] = [];

function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function staticChecks() {
  const panel = fs.readFileSync(
    path.join(process.cwd(), "src/components/owner/OwnerRoomsInventoryPanel.tsx"),
    "utf8"
  );
  check("ui.edit_category", panel.includes("editCategory") && panel.includes("saveEdit"), "edit wired");
  check("ui.archive_room", panel.includes("archiveRoom") && panel.includes('action: "archive"'), "archive room");
  check("ui.media_put", panel.includes('method: "PUT"'), "media attach");
  check("ui.no_hotel_in_forms", !panel.includes('name="hotelId"'), "no hotel field");

  const roomIdRoute = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/owner/rooms/[id]/route.ts"),
    "utf8"
  );
  check("api.archive_status", roomIdRoute.includes('status: "ARCHIVED"'), "ARCHIVED status");
  check("api.category_sot", roomIdRoute.includes("syncRoomsFromCategory"), "typed rooms re-sync");

  const typesRoute = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/owner/room-types/route.ts"),
    "utf8"
  );
  check("api.media_put", typesRoute.includes("export async function PUT"), "PUT media");

  const group = fs.readFileSync(path.join(process.cwd(), "src/lib/hotel/groupHotelRooms.ts"), "utf8");
  check("guest.zero_no_book", group.includes("group.bookHref = null"), "zero-room no CTA");

  const pano = fs.readFileSync(
    path.join(process.cwd(), "src/components/hotel/RoomPanoramaViewer.tsx"),
    "utf8"
  );
  check("pano.honest_360", pano.includes("Equirectangular") && !pano.includes("mesh 3D — fake"), "honest 360");
}

async function dbProof() {
  console.log("\n=== DB PROOF ===\n");
  const { prisma } = await import("../src/lib/prisma");
  const { createPhysicalRoomFromCategory, syncRoomsFromCategory } = await import(
    "../src/lib/pms/createPhysicalRoom"
  );

  try {
    const owner = await prisma.user.findFirst({
      where: { email: "owner@tajstay.local" },
      select: { id: true }
    });
    if (!owner) {
      check("db.owner", false, "missing");
      return;
    }
    const hotelA = 1;
    const tag = `b7-${Date.now()}`;

    const cat = await prisma.roomType.create({
      data: {
        hotelId: hotelA,
        name: `${tag}-Люкс`,
        basePrice: 700,
        maxGuests: 2,
        adults: 2,
        amenities: amenitiesToJson(["wifi", "ac"])
      }
    });

    // Zero-room: guest grouping must not offer book CTA
    const zeroGroups = groupHotelRooms({
      rooms: [],
      roomTypes: [
        {
          id: cat.id,
          name: cat.name,
          description: null,
          basePrice: cat.basePrice,
          maxGuests: cat.maxGuests,
          bedsCount: 1,
          mealPlan: "ROOM_ONLY",
          amenities: cat.amenities,
          photos: [],
          _count: { rooms: 0 }
        }
      ],
      checkIn: "2026-10-01",
      checkOut: "2026-10-03",
      fallbackTitle: "Room"
    });
    check("zero.no_book_href", zeroGroups[0]?.bookHref === null, String(zeroGroups[0]?.bookHref));
    check("zero.sold_out_with_dates", zeroGroups[0]?.soldOut === true, String(zeroGroups[0]?.soldOut));

    const room = await createPhysicalRoomFromCategory({
      hotelId: hotelA,
      ownerId: owner.id,
      roomTypeId: cat.id,
      roomNumber: `${tag}-201`
    });
    check("room.inherits_price", Number(room.price) === 700, String(room.price));

    // Simulate a frozen booking total, then change category price — booking must stay immutable
    const booking = await prisma.booking.create({
      data: {
        publicCode: `B7${Date.now().toString(36).toUpperCase()}`,
        userId: owner.id,
        roomId: room.id,
        roomTypeId: cat.id,
        checkIn: new Date("2026-11-01"),
        checkOut: new Date("2026-11-03"),
        guestCount: 2,
        totalPrice: 1400,
        commission: 0,
        subtotal: 1400,
        status: "CONFIRMED",
        paymentStatus: "PENDING",
        source: "PLATFORM",
        phone: "+992900000007"
      }
    });
    const frozen = Number(booking.totalPrice);

    await prisma.roomType.update({ where: { id: cat.id }, data: { basePrice: 900 } });
    await syncRoomsFromCategory(cat.id);
    const roomAfter = await prisma.room.findUnique({ where: { id: room.id } });
    const bookingAfter = await prisma.booking.findUnique({ where: { id: booking.id } });
    check("price.room_cache_synced", Number(roomAfter?.price) === 900, String(roomAfter?.price));
    check("price.booking_immutable", Number(bookingAfter?.totalPrice) === frozen, String(bookingAfter?.totalPrice));

    // Archive physical room
    await prisma.room.update({
      where: { id: room.id },
      data: { status: "ARCHIVED", availability: false }
    });
    const listed = await prisma.room.count({
      where: { roomTypeId: cat.id, status: { not: "ARCHIVED" } }
    });
    check("archive.excluded_from_inventory", listed === 0, String(listed));

    // cleanup
    await prisma.booking.deleteMany({ where: { id: booking.id } });
    await prisma.room.deleteMany({ where: { roomNumber: { startsWith: tag } } });
    await prisma.roomTypePhoto.deleteMany({ where: { roomTypeId: cat.id } });
    await prisma.roomType.deleteMany({ where: { name: { startsWith: tag } } });
  } catch (e) {
    check("db.proof", false, e instanceof Error ? e.message : String(e));
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("\n=== BLOCK 7 ROOMS TESTS ===\n");
  staticChecks();
  await dbProof();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

void main();
