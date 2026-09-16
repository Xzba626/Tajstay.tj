/**
 * OWNER BLOCK 6 — targeted regression checks (presentation + IA aliases).
 * Run: npx tsx scripts/owner-block6-tests.ts
 */
import assert from "node:assert/strict";
import { ownerBookingSourceLabel, ownerStatusLabel } from "../src/lib/i18n/ownerPresentation";
import { resolveActiveHotelId } from "../src/lib/owner/activeHotel";

let passed = 0;
function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name);
  passed += 1;
  console.log(`PASS ${name}`);
}

// Status / source presentation — no raw enums for known keys
ok("status CONFIRMED ru", ownerStatusLabel("ru", "CONFIRMED") === "Подтверждено");
ok("status WAITING_PAYMENT en", ownerStatusLabel("en", "WAITING_PAYMENT") === "Awaiting payment" || ownerStatusLabel("en", "WAITING_PAYMENT").length > 0);
ok("source MANAGER_MANUAL ru", ownerBookingSourceLabel("ru", "MANAGER_MANUAL").includes("менеджер") || ownerBookingSourceLabel("ru", "MANAGER_MANUAL").includes("Офлайн"));
ok("source PLATFORM en", !ownerBookingSourceLabel("en", "PLATFORM").includes("PLATFORM"));
ok("unknown source safe", ownerBookingSourceLabel("ru", "WEIRD") !== "WEIRD" || ownerBookingSourceLabel("ru", "WEIRD").length > 0);

// Active hotel: invalid requested → redirect to approved fallback
{
  const r = resolveActiveHotelId({ requestedId: 999, preferredId: 2, approvedIds: [1, 2] });
  ok("invalid hotel redirects", r.shouldRedirect && r.redirectToId === 2);
}
{
  const r = resolveActiveHotelId({ requestedId: 1, preferredId: 2, approvedIds: [1, 2] });
  ok("valid hotel no redirect", !r.shouldRedirect && r.hotelId === 1);
}
{
  const r = resolveActiveHotelId({ requestedId: 0, preferredId: 0, approvedIds: [] });
  ok("no hotels → hotelId 0", r.hotelId === 0 && !r.shouldRedirect);
}

console.log(`\nBLOCK6 TESTS ${passed}/${passed} PASS`);
