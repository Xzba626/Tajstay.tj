/**
 * OFFLINE BOOKING — authoritative price, capacity, category→room and hotel isolation.
 *
 * Root cause under test: OfflineBookingForm required a manual `totalPrice`, so the server's
 * authoritative quote (category basePrice × nights) never ran. The quote is now derived from
 * `quoteOfflineStayTotal` — the same function `createManualOfflineBooking` falls back to — and
 * these tests pin that the server, not the client, stays the price authority.
 *
 * Fixtures are created fresh and deleted afterwards; no pre-existing data is read or mutated.
 *
 * Run: npx tsx scripts/offline-booking-quote-tests.ts
 */
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "../src/lib/auth/password";
import { nightsBetween, quoteOfflineStayTotal } from "../src/lib/services/offlinePricing";
import { createManualOfflineBooking } from "../src/lib/services/ownerOfflineBooking";
import { BOOKING_SOURCE } from "../src/lib/domain/booking";

type Row = { name: string; ok: boolean; detail: string };
const results: Row[] = [];
function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function staticGates() {
  console.log("\n=== STATIC ===\n");
  const form = fs.readFileSync(path.join(process.cwd(), "src/components/owner/OfflineBookingForm.tsx"), "utf8");
  check("form.no_required_manual_total", !/name="totalPrice"[\s\S]{0,200}?required/.test(form), "totalPrice is no longer a required input");
  check("form.controlled_room", form.includes("value={roomId}"), "roomId select is controlled (no stale defaultValue)");
  check("form.quote_fetch", form.includes("/api/owner/offline-bookings/quote"), "form requests the authoritative quote");
  check("form.race_guard", form.includes("quoteSeq"), "stale quote responses are discarded");
  check("form.no_silent_zero", form.includes("canSubmit"), "submission blocked without a quote or explicit override");

  const route = fs.readFileSync(path.join(process.cwd(), "src/app/api/owner/offline-bookings/quote/route.ts"), "utf8");
  check("quote.reuses_pricing", route.includes("quoteOfflineStayTotal"), "reuses existing pricing fn (no second engine)");
  check("quote.owner_scoped", route.includes("hotel: { ownerId: owner.id }"), "hotel scope derived from ownership, not client");
  check("quote.room_type_match", route.includes("room_type_mismatch"), "room must belong to the quoted category");
}

async function dbProof() {
  console.log("\n=== DB / PRICING + GUARDS ===\n");
  const { prisma } = await import("../src/lib/prisma");
  const tag = `ofb-${Date.now()}`;
  const sfx = String(Date.now()).slice(-5);
  const ids: { users: number[]; hotels: number[] } = { users: [], hotels: [] };

  try {
    const ownerA = await prisma.user.create({
      data: { email: `${tag}-a@tajstay.local`, name: "OFB Owner A", password: await hashPassword("OfbA123!x"), role: "OWNER", phone: `+9929100${sfx}` }
    });
    const ownerB = await prisma.user.create({
      data: { email: `${tag}-b@tajstay.local`, name: "OFB Owner B", password: await hashPassword("OfbB123!x"), role: "OWNER", phone: `+9929200${sfx}` }
    });
    ids.users.push(ownerA.id, ownerB.id);

    const mkHotel = async (ownerId: number, name: string) => {
      const h = await prisma.hotel.create({
        data: {
          name, city: "Dushanbe", address: "test", ownerId, status: "APPROVED", description: "t",
          latitude: 38.5598, longitude: 68.787
        }
      });
      ids.hotels.push(h.id);
      return h;
    };
    const hotelA = await mkHotel(ownerA.id, `${tag} Hotel A`);
    const hotelB = await mkHotel(ownerB.id, `${tag} Hotel B`);

    const typeA = await prisma.roomType.create({
      data: { hotelId: hotelA.id, name: "Standard", basePrice: 300, maxGuests: 2 }
    });
    const typeB = await prisma.roomType.create({
      data: { hotelId: hotelB.id, name: "Standard B", basePrice: 500, maxGuests: 4 }
    });
    const roomA = await prisma.room.create({
      data: { hotelId: hotelA.id, roomTypeId: typeA.id, title: "A-101", roomNumber: "101", price: 300, capacity: 2, amenities: "[]" }
    });
    const roomB = await prisma.room.create({
      data: { hotelId: hotelB.id, roomTypeId: typeB.id, title: "B-201", roomNumber: "201", price: 500, capacity: 4, amenities: "[]" }
    });

    const checkIn = new Date(Date.UTC(2027, 0, 10));
    const checkOut = new Date(Date.UTC(2027, 0, 13)); // 3 nights

    const nights = nightsBetween(checkIn, checkOut);
    const quoted = quoteOfflineStayTotal({ basePrice: 300, checkIn, checkOut });
    check("P1.nights_derived", nights === 3, `nights=${nights}`);
    check("P2.total_is_base_x_nights", quoted === 900, `300 x 3 = ${quoted}`);

    const created = await createManualOfflineBooking({
      hotelId: hotelA.id, roomTypeId: typeA.id, roomId: roomA.id,
      actorUserId: ownerA.id, actorRole: "OWNER",
      guestName: "Test Guest", guestPhone: "+992900111222",
      guestCount: 2, checkIn, checkOut, totalPrice: null
    } as any);
    check("P3.booking_uses_quote", Number(created.totalPrice) === 900, `totalPrice=${created.totalPrice}`);
    check("P4.source_is_owner_manual", created.source === BOOKING_SOURCE.OWNER_MANUAL, `source=${created.source}`);
    // Booking has no direct hotelId — hotel scope is via roomType/room relations.
    const createdType = created.roomTypeId;
    check("P5.hotel_scope_correct", createdType === typeA.id, `roomTypeId=${createdType} (hotel A type ${typeA.id})`);

    let capErr = "";
    try {
      await createManualOfflineBooking({
        hotelId: hotelA.id, roomTypeId: typeA.id, roomId: roomA.id,
        actorUserId: ownerA.id, actorRole: "OWNER",
        guestName: "Over Capacity", guestPhone: "+992900111333",
        guestCount: 3, checkIn: new Date(Date.UTC(2027, 1, 1)), checkOut: new Date(Date.UTC(2027, 1, 3)), totalPrice: null
      } as any);
    } catch (e) { capErr = e instanceof Error ? e.message : String(e); }
    check("N1.capacity_rejected", capErr === "guest_capacity", `err=${capErr || "(none - booking created!)"}`);

    let overlapErr = "";
    try {
      await createManualOfflineBooking({
        hotelId: hotelA.id, roomTypeId: typeA.id, roomId: roomA.id,
        actorUserId: ownerA.id, actorRole: "OWNER",
        guestName: "Overlap", guestPhone: "+992900111444",
        guestCount: 1, checkIn, checkOut, totalPrice: null
      } as any);
    } catch (e) { overlapErr = e instanceof Error ? e.message : String(e); }
    check("N2.overlap_rejected", overlapErr !== "", `err=${overlapErr || "(none - double booking allowed!)"}`);

    let idorErr = "";
    try {
      await createManualOfflineBooking({
        hotelId: hotelB.id, roomTypeId: typeB.id, roomId: roomB.id,
        actorUserId: ownerA.id, actorRole: "OWNER",
        guestName: "Cross Hotel", guestPhone: "+992900111555",
        guestCount: 1, checkIn: new Date(Date.UTC(2027, 2, 1)), checkOut: new Date(Date.UTC(2027, 2, 2)), totalPrice: null
      } as any);
    } catch (e) { idorErr = e instanceof Error ? e.message : String(e); }
    check("N3.cross_hotel_rejected", idorErr === "forbidden", `err=${idorErr || "(none - IDOR!)"}`);

    let mismatchErr = "";
    try {
      await createManualOfflineBooking({
        hotelId: hotelA.id, roomTypeId: typeA.id, roomId: roomB.id,
        actorUserId: ownerA.id, actorRole: "OWNER",
        guestName: "Mismatch", guestPhone: "+992900111666",
        guestCount: 1, checkIn: new Date(Date.UTC(2027, 3, 1)), checkOut: new Date(Date.UTC(2027, 3, 2)), totalPrice: null
      } as any);
    } catch (e) { mismatchErr = e instanceof Error ? e.message : String(e); }
    check("N4.room_category_mismatch_rejected", mismatchErr !== "", `err=${mismatchErr || "(none!)"}`);

    const mgrBooking = await createManualOfflineBooking({
      hotelId: hotelA.id, roomTypeId: typeA.id, roomId: roomA.id,
      actorUserId: ownerA.id, actorRole: "MANAGER",
      guestName: "Mgr Price", guestPhone: "+992900111777",
      guestCount: 1, checkIn: new Date(Date.UTC(2027, 4, 1)), checkOut: new Date(Date.UTC(2027, 4, 3)),
      totalPrice: 1
    } as any);
    check("N5.manager_price_override_ignored", Number(mgrBooking.totalPrice) === 600, `totalPrice=${mgrBooking.totalPrice} (expected authoritative 600, not 1)`);
  } catch (e) {
    check("db.proof", false, e instanceof Error ? e.message : String(e));
  } finally {
    if (ids.hotels.length) {
      // Booking links to a hotel only through roomType/room, so clean up by those relations.
      await prisma.booking.deleteMany({ where: { roomType: { hotelId: { in: ids.hotels } } } });
      await prisma.booking.deleteMany({ where: { room: { hotelId: { in: ids.hotels } } } });
      await prisma.room.deleteMany({ where: { hotelId: { in: ids.hotels } } });
      await prisma.roomType.deleteMany({ where: { hotelId: { in: ids.hotels } } });
      await prisma.hotel.deleteMany({ where: { id: { in: ids.hotels } } });
    }
    if (ids.users.length) {
      await prisma.notification.deleteMany({ where: { userId: { in: ids.users } } });
      await prisma.session.deleteMany({ where: { userId: { in: ids.users } } });
      await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    }
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("\n=== OFFLINE BOOKING QUOTE / GUARD TESTS ===\n");
  staticGates();
  await dbProof();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

void main();
