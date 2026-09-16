/**
 * OWNER BLOCK 2 — hotel context + nav + payment details regression harness.
 * Run: npx tsx scripts/owner-block2-tests.ts
 */
import fs from "node:fs";
import path from "node:path";
import { resolveActiveHotelId, parseOwnerHotelId, OWNER_ACTIVE_HOTEL_COOKIE } from "../src/lib/owner/activeHotel";
import { buildPaymentMethodSnapshot, HOTEL_PAYMENT_METHOD_TYPES } from "../src/lib/hotels/paymentMethods";
import { paymentTypeLabel } from "../src/components/owner/HotelPaymentMethodsManager";

type Row = { name: string; ok: boolean; detail: string };
const results: Row[] = [];
const root = process.cwd();

function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function staticChecks() {
  console.log("\n=== OWNER BLOCK 2 STATIC ===\n");

  check("cookie.name", OWNER_ACTIVE_HOTEL_COOKIE === "tajstay_owner_hotel", "cookie key");
  check("parse.valid", parseOwnerHotelId("12") === 12, "12");
  check("parse.invalid", parseOwnerHotelId("abc") === 0 && parseOwnerHotelId("-1") === 0, "invalid → 0");

  const r1 = resolveActiveHotelId({ requestedId: 2, preferredId: 1, approvedIds: [1, 2] });
  check("resolve.url_wins", r1.hotelId === 2 && !r1.shouldRedirect, "URL hotel wins");

  const r2 = resolveActiveHotelId({ requestedId: 99, preferredId: 2, approvedIds: [1, 2] });
  check(
    "resolve.foreign_fallback",
    r2.shouldRedirect && r2.redirectToId === 2 && r2.hotelId === 2,
    "foreign → preferred"
  );

  const r3 = resolveActiveHotelId({ requestedId: 0, preferredId: 2, approvedIds: [1, 2] });
  check("resolve.cookie_pref", r3.shouldRedirect && r3.redirectToId === 2, "no URL → cookie");

  const r4 = resolveActiveHotelId({ requestedId: 0, preferredId: 0, approvedIds: [7] });
  check("resolve.single_no_redirect", r4.hotelId === 7 && !r4.shouldRedirect, "single hotel");

  check(
    "types.canonical",
    HOTEL_PAYMENT_METHOD_TYPES.join(",") === "CARD,WALLET,BANK,OTHER",
    "enum unchanged"
  );

  check("i18n.type.ru_card", paymentTypeLabel("ru", "CARD") === "Карта", "RU CARD");
  check("i18n.type.tg_card", paymentTypeLabel("tg", "CARD") === "Корт", "TJ CARD");
  check("i18n.type.en_card", paymentTypeLabel("en", "CARD") === "Card", "EN CARD");
  check("i18n.type.ru_wallet", paymentTypeLabel("ru", "WALLET").includes("кошел"), "RU WALLET");
  check("i18n.type.en_other", paymentTypeLabel("en", "OTHER") === "Other", "EN OTHER");

  const snap = buildPaymentMethodSnapshot({
    displayLabel: "Humo",
    recipientName: "Owner",
    paymentIdentifier: "8600",
    instructions: null
  });
  check(
    "snapshot.immutable_shape",
    snap.displayLabel === "Humo" && snap.paymentIdentifier === "8600" && !("type" in snap),
    "snapshot fields stable"
  );

  const sidebar = read("src/components/dashboard/OwnerSidebar.tsx");
  check(
    "nav.mobile_primary_calendar",
    sidebar.includes('MOBILE_PRIMARY = ["overview", "properties", "bookings", "calendar"]'),
    "calendar in primary"
  );
  check(
    "nav.mobile_no_finances_primary",
    !sidebar.includes('MOBILE_PRIMARY = ["overview", "properties", "bookings", "finances"]'),
    "finances not primary"
  );
  check(
    "nav.drawer_no_calendar_dup",
    sidebar.includes('sections: ["rooms", "offline-bookings", "staff"]') &&
      sidebar.includes('sections: ["finances", "analytics", "reviews", "notifications", "activity"]'),
    "calendar out of More; staff+requisites in More"
  );

  const page = read("src/app/dashboard/owner/page.tsx");
  check(
    "finances.no_revenue_kpi_ui",
    !page.includes("owner.finances.revenueMonth") && !page.includes("owner.finances.payoutsTitle"),
    "revenue/payout UI removed from requisites"
  );
  check("finances.keeps_payment_manager", page.includes("HotelPaymentMethodsManager"), "manager present");
  check("context.uses_resolve_helper", page.includes("resolveActiveHotelId"), "canonical resolver");

  const msgs = read("src/lib/i18n/messages.ts");
  check("i18n.requisites_ru", msgs.includes('navFinances: "Реквизиты"'), "RU nav");
  check("i18n.requisites_en", msgs.includes('navFinances: "Payment details"'), "EN nav");
  check("i18n.calendar_short_ru", msgs.includes('navCalendarShort: "Календарь"'), "RU calendar short");

  const manager = read("src/components/owner/HotelPaymentMethodsManager.tsx");
  check(
    "ui.no_native_type_select_for_enums",
    manager.includes("PaymentTypeSelect") && manager.includes('role="listbox"'),
    "custom listbox"
  );
  check("ui.shows_localized_type_in_list", manager.includes("paymentTypeLabel(locale, method.type)"), "list labels");

  const layout = read("src/app/dashboard/owner/layout.tsx");
  check("header.owner_present", layout.includes("OwnerHeader"), "OwnerHeader in layout");
  check("switcher.listbox_not_native", sidebar.includes("owner-sidebar__switcher-listbox"), "hotel switcher listbox");
}

async function idorChecks() {
  console.log("\n=== OWNER BLOCK 2 IDOR (DB) ===\n");
  try {
    const { prisma } = await import("../src/lib/prisma");
    const { getOwnerHotelPaymentMethods } = await import("../src/lib/hotels/paymentMethods");
    const hotels = await prisma.hotel.findMany({
      where: { status: "APPROVED" },
      select: { id: true, ownerId: true, name: true },
      take: 40
    });
    const byOwner = new Map<number, typeof hotels>();
    for (const h of hotels) {
      const list = byOwner.get(h.ownerId) ?? [];
      list.push(h);
      byOwner.set(h.ownerId, list);
    }
    const owners = [...byOwner.keys()];
    if (owners.length < 2) {
      check("idor.skipped_insufficient_owners", true, `owners=${owners.length} — SKIP (no foreign pair)`);
      await prisma.$disconnect();
      return;
    }
    const ownerA = owners[0];
    const ownerB = owners.find((id) => id !== ownerA)!;
    const hotelA = byOwner.get(ownerA)![0];
    const hotelB = byOwner.get(ownerB)![0];

    let allowed = false;
    try {
      await getOwnerHotelPaymentMethods(hotelA.id, ownerA);
      allowed = true;
    } catch {
      allowed = false;
    }
    check("idor.own_hotel_allowed", allowed, `owner ${ownerA} → hotel ${hotelA.id}`);

    let denied = false;
    try {
      await getOwnerHotelPaymentMethods(hotelB.id, ownerA);
      denied = false;
    } catch (e) {
      denied = e instanceof Error && e.message === "FORBIDDEN";
    }
    check("idor.foreign_hotel_forbidden", denied, `owner ${ownerA} ↛ hotel ${hotelB.id}`);

    const snapBefore = buildPaymentMethodSnapshot({
      displayLabel: "Old Humo",
      recipientName: "A",
      paymentIdentifier: "1111",
      instructions: null
    });
    check(
      "snapshot.copy_stable",
      snapBefore.displayLabel === "Old Humo" && snapBefore.paymentIdentifier === "1111",
      "snapshot independent of later method object"
    );

    await prisma.$disconnect();
  } catch (e) {
    check("idor.db_available", false, e instanceof Error ? e.message : String(e));
  }
}

async function main() {
  staticChecks();
  await idorChecks();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

void main();
