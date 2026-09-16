/**
 * OWNER BLOCK 4 — rooms/categories inheritance + isolation tests.
 * Run: npx tsx scripts/owner-block4-tests.ts
 */
import fs from "node:fs";
import path from "node:path";
import { amenityLabel, AMENITY_CATEGORIES } from "../src/lib/pms/amenities";

type Row = { name: string; ok: boolean; detail: string };
const results: Row[] = [];

function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function staticChecks() {
  const page = fs.readFileSync(path.join(process.cwd(), "src/app/dashboard/owner/page.tsx"), "utf8");
  check("ui.inventory_panel", page.includes("OwnerRoomsInventoryPanel"), "panel wired");
  check("ui.no_room_types_panel", !page.includes("OwnerRoomTypesPanel"), "old panel removed");
  check("ui.no_rooms_search_toolbar", !page.includes('section="rooms"'), "rooms DataToolbar gone");

  const panel = fs.readFileSync(path.join(process.cwd(), "src/components/owner/OwnerRoomsInventoryPanel.tsx"), "utf8");
  check("ui.no_hotel_select_in_add", !panel.includes('name="hotelId"'), "no hotel field in forms");
  check("ui.add_sheet", panel.includes("addCategory") && panel.includes("addRoom"), "add sheet");
  check("ui.no_price_in_add_room", !/mode === \"room\"[\s\S]*priceNight/.test(panel), "no price in add room");

  check("amen.wifi_ru", amenityLabel("ru", "wifi") === "Wi-Fi", amenityLabel("ru", "wifi"));
  check("amen.ac_ru", amenityLabel("ru", "ac") === "Кондиционер", amenityLabel("ru", "ac"));
  check("amen.ac_en", amenityLabel("en", "ac") === "Air conditioning", amenityLabel("en", "ac"));
  check("amen.groups", Object.keys(AMENITY_CATEGORIES).includes("basics"), "basics group");
}

async function dbProof() {
  console.log("\n=== DB PROOF ===\n");
  const { prisma } = await import("../src/lib/prisma");
  const { createPhysicalRoomFromCategory } = await import("../src/lib/pms/createPhysicalRoom");
  const { amenitiesToJson } = await import("../src/lib/pms/amenities");

  try {
    const owner = await prisma.user.findFirst({ where: { email: "owner@tajstay.local" }, select: { id: true } });
    if (!owner) {
      check("db.owner", false, "missing");
      return;
    }
    const hotelA = 1;
    const hotelB = 2;
    const tag = `b4-${Date.now()}`;

    const cat = await prisma.roomType.create({
      data: {
        hotelId: hotelA,
        name: `${tag}-Полулюкс`,
        basePrice: 500,
        maxGuests: 2,
        adults: 2,
        amenities: amenitiesToJson(["wifi", "ac", "private_bath"])
      }
    });

    const r101 = await createPhysicalRoomFromCategory({
      hotelId: hotelA,
      ownerId: owner.id,
      roomTypeId: cat.id,
      roomNumber: `${tag}-101`
    });
    check("room.inherits_price", Number(r101.price) === 500, String(r101.price));
    check("room.inherits_capacity", r101.capacity === 2, String(r101.capacity));
    check("room.inherits_amenities", r101.amenities.includes("wifi"), r101.amenities);

    const r102 = await createPhysicalRoomFromCategory({
      hotelId: hotelA,
      ownerId: owner.id,
      roomTypeId: cat.id,
      roomNumber: `${tag}-102`
    });
    check("room.second", Boolean(r102.id), String(r102.id));

    let dup = false;
    try {
      await createPhysicalRoomFromCategory({
        hotelId: hotelA,
        ownerId: owner.id,
        roomTypeId: cat.id,
        roomNumber: `${tag}-101`
      });
    } catch (e) {
      dup = e instanceof Error && e.message === "DUPLICATE_ROOM_NUMBER";
    }
    check("room.duplicate_blocked", dup, "DUPLICATE_ROOM_NUMBER");

    // Same room number on hotel B OK
    const catB = await prisma.roomType.create({
      data: {
        hotelId: hotelB,
        name: `${tag}-B`,
        basePrice: 100,
        maxGuests: 2,
        amenities: "[]"
      }
    });
    const b101 = await createPhysicalRoomFromCategory({
      hotelId: hotelB,
      ownerId: owner.id,
      roomTypeId: catB.id,
      roomNumber: `${tag}-101`
    });
    check("isolation.same_number_other_hotel", Boolean(b101.id), String(b101.id));

    let forbidden = false;
    try {
      await createPhysicalRoomFromCategory({
        hotelId: hotelA,
        ownerId: 999999,
        roomTypeId: cat.id,
        roomNumber: `${tag}-999`
      });
    } catch (e) {
      forbidden = e instanceof Error && e.message === "FORBIDDEN";
    }
    check("authz.foreign_owner", forbidden, "FORBIDDEN");

    // Price edit sync
    await prisma.roomType.update({ where: { id: cat.id }, data: { basePrice: 600 } });
    const { syncRoomsFromCategory } = await import("../src/lib/pms/createPhysicalRoom");
    await syncRoomsFromCategory(cat.id);
    const synced = await prisma.room.findUnique({ where: { id: r101.id } });
    check("price.sync_after_edit", Number(synced?.price) === 600, String(synced?.price));

    // cleanup
    await prisma.room.deleteMany({ where: { roomNumber: { startsWith: tag } } });
    await prisma.roomType.deleteMany({ where: { name: { startsWith: tag } } });
  } catch (e) {
    check("db.proof", false, e instanceof Error ? e.message : String(e));
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("\n=== OWNER BLOCK 4 TESTS ===\n");
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
