/**
 * OWNER BLOCK 3 — analytics domain + allocation + settlement tests.
 * Run: npx tsx scripts/owner-block3-tests.ts
 */
import { resolveAnalyticsPeriod, daysInMonth } from "../src/lib/owner/analytics/period";
import { allocateExpenseVersionsToPeriod } from "../src/lib/owner/analytics/expenses";
import { normalizeSettlementChannel, resolveSettlementChannel, settlementBucket } from "../src/lib/owner/analytics/settlement";
import { bookingChannelFromSource } from "../src/lib/owner/analytics/types";
import { BOOKING_SOURCE } from "../src/lib/domain/booking";
import { toMinor, fromMinor } from "../src/lib/owner/analytics/money";
import fs from "node:fs";
import path from "node:path";

type Row = { name: string; ok: boolean; detail: string };
const results: Row[] = [];

function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function staticNav() {
  const sidebar = fs.readFileSync(path.join(process.cwd(), "src/components/dashboard/OwnerSidebar.tsx"), "utf8");
  check("nav.analytics_section", sidebar.includes('section: "analytics"'), "analytics in nav");
  check("nav.activity_section", sidebar.includes('section: "activity"'), "activity in nav");
  check("nav.no_statistics_section", !sidebar.includes('section: "statistics"'), "statistics section removed");
  const page = fs.readFileSync(path.join(process.cwd(), "src/app/dashboard/owner/page.tsx"), "utf8");
  check("page.no_conversion_proxy", !page.includes("owner.conversionProxy"), "proxy UI removed");
  check("page.uses_getHotelAnalytics", page.includes("getHotelAnalytics"), "shared analytics service");
}

function domainChecks() {
  check("channel.online", bookingChannelFromSource(BOOKING_SOURCE.PLATFORM) === "online", "PLATFORM");
  check("channel.offline", bookingChannelFromSource(BOOKING_SOURCE.OWNER_MANUAL) === "offline", "OWNER_MANUAL");
  check("settle.cash", normalizeSettlementChannel("CASH") === "CASH", "CASH");
  check("settle.card", normalizeSettlementChannel("CARD") === "CARD", "CARD");
  check("settle.arrival", normalizeSettlementChannel("ARRIVAL") === "CASH", "ARRIVAL→CASH");
  check(
    "axes.independent",
    settlementBucket(resolveSettlementChannel({ offlinePaymentType: "CARD" })) === "card" &&
      bookingChannelFromSource(BOOKING_SOURCE.OWNER_MANUAL) === "offline",
    "offline+card"
  );

  const feb = daysInMonth(2026, 1);
  const apr = daysInMonth(2026, 3);
  const may = daysInMonth(2026, 4);
  check("days.feb", feb === 28, String(feb));
  check("days.apr", apr === 30, String(apr));
  check("days.may", may === 31, String(may));

  // Monthly 310 in 31-day month → 10/day; pick May 2026
  const mayStart = new Date(2026, 4, 1, 0, 0, 0, 0);
  const mayDay1End = new Date(2026, 4, 1, 23, 59, 59, 999);
  const alloc1 = allocateExpenseVersionsToPeriod(
    [
      {
        expenseId: 1,
        amount: 310,
        effectiveFrom: mayStart,
        effectiveUntil: null,
        recurrence: "MONTHLY",
        category: "INTERNET",
        title: "Net",
        status: "ACTIVE"
      }
    ],
    mayStart,
    mayDay1End
  );
  check("alloc.daily_31", alloc1.totalMinor === 1000, `got ${alloc1.totalMinor} (expect 1000 tiyin = 10 TJS)`);

  const oneTime = allocateExpenseVersionsToPeriod(
    [
      {
        expenseId: 2,
        amount: 100,
        effectiveFrom: mayStart,
        effectiveUntil: null,
        recurrence: "ONE_TIME",
        category: "REPAIR",
        title: "Fix",
        status: "ACTIVE"
      }
    ],
    mayStart,
    mayDay1End
  );
  check("alloc.onetime", oneTime.totalMinor === 10000, String(oneTime.totalMinor));

  // Versioning: 100 until May 16, then 200 — for May 1 only expect 100/31
  const changeDay = new Date(2026, 4, 16, 0, 0, 0, 0);
  const versioned = allocateExpenseVersionsToPeriod(
    [
      {
        expenseId: 3,
        amount: 100,
        effectiveFrom: mayStart,
        effectiveUntil: changeDay,
        recurrence: "MONTHLY",
        category: "ELECTRICITY",
        title: "El",
        status: "ACTIVE"
      },
      {
        expenseId: 3,
        amount: 200,
        effectiveFrom: changeDay,
        effectiveUntil: null,
        recurrence: "MONTHLY",
        category: "ELECTRICITY",
        title: "El",
        status: "ACTIVE"
      }
    ],
    mayStart,
    mayDay1End
  );
  check("version.old_rate_on_may1", versioned.totalMinor === Math.round(10000 / 31), String(versioned.totalMinor));

  const afterChange = allocateExpenseVersionsToPeriod(
    [
      {
        expenseId: 3,
        amount: 100,
        effectiveFrom: mayStart,
        effectiveUntil: changeDay,
        recurrence: "MONTHLY",
        category: "ELECTRICITY",
        title: "El",
        status: "ACTIVE"
      },
      {
        expenseId: 3,
        amount: 200,
        effectiveFrom: changeDay,
        effectiveUntil: null,
        recurrence: "MONTHLY",
        category: "ELECTRICITY",
        title: "El",
        status: "ACTIVE"
      }
    ],
    changeDay,
    new Date(2026, 4, 16, 23, 59, 59, 999)
  );
  check("version.new_rate_on_may16", afterChange.totalMinor === Math.round(20000 / 31), String(afterChange.totalMinor));

  check("money.roundtrip", fromMinor(toMinor(12.5)) === 12.5, "12.5");

  const today = resolveAnalyticsPeriod("today", new Date(2026, 8, 16, 15, 0, 0));
  check("period.today_bounds", today.start.getHours() === 0 && today.end.getHours() === 23, "day bounds");
}

async function dbProof() {
  console.log("\n=== DB / SERVICE PROOF ===\n");
  try {
    const { prisma } = await import("../src/lib/prisma");
    const { getHotelAnalytics } = await import("../src/lib/owner/analytics/getHotelAnalytics");
    const {
      createHotelExpense,
      updateHotelExpenseAmount
    } = await import("../src/lib/owner/analytics/expenseService");

    const owner = await prisma.user.findFirst({ where: { email: "owner@tajstay.local" }, select: { id: true } });
    if (!owner) {
      check("db.owner", false, "seed owner missing");
      await prisma.$disconnect();
      return;
    }

    // Controlled bookings on hotel 1 vs hotel 2 (hotel 2 may lack RoomType — use physical rooms)
    const hotelA = 1;
    const hotelB = 2;
    const roomsA = await prisma.room.findMany({
      where: { hotelId: hotelA },
      select: { id: true, roomTypeId: true },
      take: 4
    });
    const roomsB = await prisma.room.findMany({
      where: { hotelId: hotelB },
      select: { id: true, roomTypeId: true },
      take: 1
    });
    if (roomsA.length < 1 || roomsB.length < 1) {
      check("db.rooms", false, "need rooms on hotel 1/2");
      await prisma.$disconnect();
      return;
    }

    const tag = `b3-${Date.now()}`;
    const now = new Date();
    // Far-future non-overlapping stays avoid booking_room_no_overlap with live inventory.
    // Revenue axis uses revenueRecognizedAt (= now), not stay dates.
    let stayOffset = 0;
    const mk = async (opts: {
      roomId: number;
      roomTypeId: number | null;
      source: string;
      settlement: string;
      amount: number;
      paid: boolean;
      guest: string;
    }) => {
      const checkIn = new Date(Date.UTC(2031, 5, 1 + stayOffset));
      const checkOut = new Date(Date.UTC(2031, 5, 2 + stayOffset));
      stayOffset += 3;
      const b = await prisma.booking.create({
        data: {
          source: opts.source,
          createdByOwnerId: opts.source === "OWNER_MANUAL" ? owner.id : null,
          userId: opts.source === "PLATFORM" ? owner.id : null,
          roomId: opts.roomId,
          assignedRoomId: opts.roomId,
          roomTypeId: opts.roomTypeId,
          checkIn,
          checkOut,
          totalPrice: opts.amount,
          commission: 0,
          phone: "+992900000001",
          guestName: `${tag}-${opts.guest}`,
          status: opts.paid ? "CONFIRMED" : "WAITING_PAYMENT",
          paymentStatus: opts.paid ? "PAID" : "PENDING",
          revenueRecognizedAt: opts.paid ? now : null,
          settlementChannel: opts.settlement,
          paymentMethod: opts.settlement,
          offlineStatus: opts.source === "OWNER_MANUAL" ? "CONFIRMED" : null,
          payOnArrival: opts.settlement === "CASH"
        }
      });
      return b.id;
    };

    const beforeA = await getHotelAnalytics({ ownerId: owner.id, hotelId: hotelA, periodKey: "today" });
    const beforeB = await getHotelAnalytics({ ownerId: owner.id, hotelId: hotelB, periodKey: "today" });

    const pickA = (i: number) => roomsA[i % roomsA.length];
    await mk({
      roomId: pickA(0).id,
      roomTypeId: pickA(0).roomTypeId,
      source: "PLATFORM",
      settlement: "CARD",
      amount: 1000,
      paid: true,
      guest: "A-online-card"
    });
    await mk({
      roomId: pickA(1).id,
      roomTypeId: pickA(1).roomTypeId,
      source: "OWNER_MANUAL",
      settlement: "CASH",
      amount: 500,
      paid: true,
      guest: "A-offline-cash"
    });
    await mk({
      roomId: pickA(0).id,
      roomTypeId: pickA(0).roomTypeId,
      source: "OWNER_MANUAL",
      settlement: "CARD",
      amount: 300,
      paid: true,
      guest: "A-offline-card"
    });
    await mk({
      roomId: pickA(1).id,
      roomTypeId: pickA(1).roomTypeId,
      source: "PLATFORM",
      settlement: "CARD",
      amount: 1000,
      paid: false,
      guest: "A-pending"
    });
    await mk({
      roomId: roomsB[0].id,
      roomTypeId: roomsB[0].roomTypeId,
      source: "PLATFORM",
      settlement: "CARD",
      amount: 9999,
      paid: true,
      guest: "B-should-not-leak"
    });

    const a = await getHotelAnalytics({ ownerId: owner.id, hotelId: hotelA, periodKey: "today" });
    const dTotal = +(a.revenue.total - beforeA.revenue.total).toFixed(2);
    const dCard = +(a.revenue.card - beforeA.revenue.card).toFixed(2);
    const dCash = +(a.revenue.cash - beforeA.revenue.cash).toFixed(2);
    const dOnline = +(a.revenue.online - beforeA.revenue.online).toFixed(2);
    const dOffline = +(a.revenue.offline - beforeA.revenue.offline).toFixed(2);
    const dOnlineCount = a.bookings.onlineCount - beforeA.bookings.onlineCount;
    check("revenue.total", dTotal === 1800, String(dTotal));
    check("revenue.card", dCard === 1300, String(dCard));
    check("revenue.cash", dCash === 500, String(dCash));
    check("revenue.online", dOnline === 1000, String(dOnline));
    check("revenue.offline", dOffline === 800, String(dOffline));
    check("pending.excluded", dOnlineCount === 1, `onlineCountΔ=${dOnlineCount}`);

    const b = await getHotelAnalytics({ ownerId: owner.id, hotelId: hotelB, periodKey: "today" });
    const dB = +(b.revenue.total - beforeB.revenue.total).toFixed(2);
    check("isolation.B_has_9999", dB === 9999, String(dB));
    check("isolation.A_not_B", dTotal === 1800, "A delta unaffected by B");

    let denied = false;
    try {
      await getHotelAnalytics({ ownerId: 999999, hotelId: hotelA, periodKey: "today" });
    } catch (e) {
      denied = e instanceof Error && e.message === "FORBIDDEN";
    }
    check("authz.foreign_owner", denied, "FORBIDDEN");

    const exp = await createHotelExpense({
      hotelId: hotelA,
      ownerId: owner.id,
      title: `${tag}-inet`,
      category: "INTERNET",
      amount: 310,
      recurrence: "MONTHLY",
      effectiveFrom: new Date(now.getFullYear(), now.getMonth(), 1)
    });
    const oneTime = await createHotelExpense({
      hotelId: hotelA,
      ownerId: owner.id,
      title: `${tag}-repair`,
      category: "REPAIR",
      amount: 100,
      recurrence: "ONE_TIME",
      effectiveFrom: now
    });
    const withExp = await getHotelAnalytics({ ownerId: owner.id, hotelId: hotelA, periodKey: "today" });
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const expectedDaily = +(310 / days).toFixed(2);
    const expectedExpenses = +(expectedDaily + 100).toFixed(2);
    const dExp = +(withExp.expenses.total - a.expenses.total).toFixed(2);
    // Allow 0.02 rounding tolerance (minor units)
    check(
      "expense.today_allocation",
      Math.abs(dExp - expectedExpenses) < 0.05,
      `Δ=${dExp} expect≈${expectedExpenses} (daily ${expectedDaily}+100)`
    );
    const dNet = +(withExp.netProfit - (a.revenue.total - a.expenses.total)).toFixed(2);
    // net = revenue - expenses; revenue unchanged after expense add
    const expectedNetDelta = -dExp;
    check("net.profit_delta", Math.abs(dNet - expectedNetDelta) < 0.05, `Δnet=${dNet}`);

    await updateHotelExpenseAmount({
      hotelId: hotelA,
      ownerId: owner.id,
      expenseId: exp.id,
      amount: 620,
      effectiveFrom: new Date(now.getFullYear(), now.getMonth(), Math.min(28, now.getDate() + 1) || 2)
    });
    const versions = await prisma.hotelExpenseVersion.findMany({
      where: { expenseId: exp.id },
      orderBy: { effectiveFrom: "asc" }
    });
    check("expense.version_count", versions.length >= 2, String(versions.length));
    check("expense.old_amount_kept", Number(versions[0].amount) === 310, String(versions[0].amount));
    check("expense.new_amount", Number(versions[versions.length - 1].amount) === 620, String(versions[versions.length - 1].amount));

    const audit = await prisma.ownerHotelAuditLog.count({
      where: { hotelId: hotelA, action: { startsWith: "expense." } }
    });
    check("audit.expense_events", audit >= 3, String(audit));

    // cleanup tagged bookings + expenses
    await prisma.booking.deleteMany({ where: { guestName: { startsWith: tag } } });
    await prisma.hotelExpense.deleteMany({ where: { id: { in: [exp.id, oneTime.id] } } });

    await prisma.$disconnect();
  } catch (e) {
    check("db.proof", false, e instanceof Error ? e.message : String(e));
  }
}

async function main() {
  console.log("\n=== OWNER BLOCK 3 TESTS ===\n");
  staticNav();
  domainChecks();
  await dbProof();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

void main();
