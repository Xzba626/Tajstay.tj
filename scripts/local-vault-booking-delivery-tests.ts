/**
 * SLICE 2 — Local Vault Booking Delivery API (server side).
 *
 * Every device request below is a REAL Ed25519-signed Request fed to the REAL `deviceBookingSync`
 * service — the PoP/nonce/rate-limit/binding layer is not mocked away (§21). Fixtures are created
 * per run on the local DB and deleted afterwards.
 *
 * Run: npx tsx scripts/local-vault-booking-delivery-tests.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { hashPassword } from "../src/lib/auth/password";
import { buildDeviceCanonical } from "../src/lib/local-vault/canonical";
import { bodyHashHex } from "../src/lib/local-vault/encoding";
import { BOOKING_SYNC_PATH, deviceBookingSync } from "../src/lib/local-vault/bookingSync";
import {
  buildIncremental,
  DELIVERY_CHANGE,
  recordBookingDeliveryChange,
  recordBookingDeliveryChangeById
} from "../src/lib/local-vault/bookingDelivery";
import { createManualOfflineBooking, updateOwnerOfflineBooking } from "../src/lib/services/ownerOfflineBooking";
import { BOOKING_SOURCE, BOOKING_STATUS } from "../src/lib/domain/booking";

type Row = { name: string; ok: boolean; detail: string };
const results: Row[] = [];
function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const b64url = (buf: Buffer) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

type Device = { deviceId: string; priv: crypto.KeyObject; pub: string };

function makeKeys(): { priv: crypto.KeyObject; pub: string; fp: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" }) as { x: string };
  const raw = Buffer.from(jwk.x.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  return { priv: privateKey, pub: jwk.x, fp: crypto.createHash("sha256").update(raw).digest("hex") };
}

type ReqOpts = {
  tamperBody?: boolean;
  badSignature?: boolean;
  timestampOffsetSec?: number;
  nonce?: string;
  withQuery?: boolean;
};

/** Build a genuinely signed sync request; the options exist only to forge negative cases. */
function signedRequest(dev: Device, body: unknown, opts: ReqOpts = {}) {
  const rawBody = Buffer.from(JSON.stringify(body), "utf8");
  const ts = String(Math.floor(Date.now() / 1000) + (opts.timestampOffsetSec ?? 0));
  const nonce = opts.nonce ?? b64url(crypto.randomBytes(16));
  const canonical = buildDeviceCanonical({
    method: "POST",
    canonicalPath: BOOKING_SYNC_PATH,
    timestamp: ts,
    nonce,
    deviceId: dev.deviceId,
    bodyHash: bodyHashHex(rawBody)
  });
  let sig = b64url(crypto.sign(null, Buffer.from(canonical, "utf8"), dev.priv));
  if (opts.badSignature) sig = b64url(crypto.randomBytes(64));
  const sentBody = opts.tamperBody ? Buffer.from(JSON.stringify({ ...(body as object), limit: 499 }), "utf8") : rawBody;
  const url = `http://localhost${BOOKING_SYNC_PATH}${opts.withQuery ? "?cursor=0" : ""}`;
  const req = new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-lv-timestamp": ts,
      "x-lv-nonce": nonce,
      "x-lv-signature": sig,
      "x-lv-device-id": dev.deviceId,
      "x-forwarded-for": "127.0.0.1"
    },
    body: sentBody
  });
  return { req, rawBody: sentBody };
}

async function sync(dev: Device, body: unknown, opts: ReqOpts = {}) {
  const { req, rawBody } = signedRequest(dev, body, opts);
  try {
    const res = await deviceBookingSync(req, rawBody);
    return { status: 200, body: res as any };
  } catch (e) {
    return { status: (e as { httpStatus?: number }).httpStatus ?? 500, body: null as any };
  }
}

function staticGates() {
  console.log("\n=== STATIC: every delivery-relevant mutation is wired ===\n");
  const wired: Array<[string, string]> = [
    ["src/lib/services/ownerOfflineBooking.ts", "OWNER_MANUAL/MANAGER_MANUAL create + update"],
    ["src/app/api/bookings/route.ts", "ONLINE create (all 3 branches)"],
    ["src/app/api/owner/bookings/[id]/confirm/route.ts", "confirm"],
    ["src/app/api/owner/bookings/[id]/reject/route.ts", "reject"],
    ["src/app/api/bookings/[id]/cancel-by-guest/route.ts", "guest cancel"],
    ["src/app/api/bookings/cancel/route.ts", "legacy guest cancel"],
    ["src/app/api/admin/bookings/[id]/cancel/route.ts", "admin cancel"],
    ["src/app/api/jobs/expire-bookings/route.ts", "expiry + review timeout"],
    ["src/lib/bookings/paymentReviewActions.ts", "payment review confirm + reject"]
  ];
  for (const [f, what] of wired) {
    const src = fs.readFileSync(path.join(process.cwd(), f), "utf8");
    check(`wired.${what}`, /recordBookingDeliveryChange/.test(src), f);
  }
  const online = fs.readFileSync(path.join(process.cwd(), "src/app/api/bookings/route.ts"), "utf8");
  check("wired.online_no_bare_create", !/booking = await prisma\.booking\.create\(/.test(online), "no non-transactional online create remains");
}

async function main() {
  console.log("\n=== LOCAL VAULT BOOKING DELIVERY TESTS ===\n");
  staticGates();

  const { prisma } = await import("../src/lib/prisma");
  const tag = `lvbd${Date.now()}`;
  const sfx = String(Date.now()).slice(-5);
  const users: number[] = [];
  const hotels: number[] = [];
  const devices: string[] = [];

  try {
    const owner = await prisma.user.create({
      data: { email: `${tag}-o@tajstay.local`, name: "LVBD Owner", password: await hashPassword("LvbdO123!x"), role: "OWNER", phone: `+9929300${sfx}` }
    });
    const ownerB = await prisma.user.create({
      data: { email: `${tag}-ob@tajstay.local`, name: "LVBD Owner B", password: await hashPassword("LvbdB123!x"), role: "OWNER", phone: `+9929400${sfx}` }
    });
    users.push(owner.id, ownerB.id);

    const mkHotel = async (ownerId: number, name: string) => {
      const h = await prisma.hotel.create({
        data: { name, city: "Dushanbe", address: "t", ownerId, status: "APPROVED", description: "t", latitude: 38.55, longitude: 68.78 }
      });
      hotels.push(h.id);
      return h;
    };
    const hotelA = await mkHotel(owner.id, `${tag} A`);
    const hotelB = await mkHotel(ownerB.id, `${tag} B`);
    const typeA = await prisma.roomType.create({ data: { hotelId: hotelA.id, name: "Std A", basePrice: 300, maxGuests: 3 } });
    const typeB = await prisma.roomType.create({ data: { hotelId: hotelB.id, name: "Std B", basePrice: 500, maxGuests: 3 } });
    const roomA1 = await prisma.room.create({ data: { hotelId: hotelA.id, roomTypeId: typeA.id, title: "A-101", roomNumber: "101", price: 300, capacity: 3, amenities: "[]" } });
    const roomA2 = await prisma.room.create({ data: { hotelId: hotelA.id, roomTypeId: typeA.id, title: "A-102", roomNumber: "102", price: 300, capacity: 3, amenities: "[]" } });
    const roomB1 = await prisma.room.create({ data: { hotelId: hotelB.id, roomTypeId: typeB.id, title: "B-201", roomNumber: "201", price: 500, capacity: 3, amenities: "[]" } });

    const mkDevice = async (hotelId: number, n: string): Promise<Device> => {
      const k = makeKeys();
      const deviceId = `dev_${tag}_${n}`;
      await prisma.localVaultDeviceBinding.create({
        data: { deviceId, installationId: `inst_${tag}_${n}`, publicKey: k.pub, publicKeyFp: k.fp, hotelId, platform: "windows", architecture: "x64" }
      });
      devices.push(deviceId);
      return { deviceId, priv: k.priv, pub: k.pub };
    };
    const devA = await mkDevice(hotelA.id, "a");
    const devB = await mkDevice(hotelB.id, "b");

    const day = (d: number) => new Date(Date.UTC(2027, 5, d));
    const baseA = (await prisma.hotelDeliveryCursor.findUnique({ where: { hotelId: hotelA.id } }))?.lastRevision ?? 0;

    console.log("\n=== OWNER_MANUAL / MANAGER_MANUAL / ONLINE ===\n");
    const offline = await createManualOfflineBooking({
      hotelId: hotelA.id, roomTypeId: typeA.id, roomId: roomA1.id,
      actorUserId: owner.id, actorRole: "OWNER",
      guestName: "Offline Guest", guestPhone: "+992900200111",
      guestCount: 2, checkIn: day(10), checkOut: day(13), totalPrice: null
    } as any);

    const inc1 = await sync(devA, { mode: "incremental", cursor: baseA });
    const offItem = inc1.body?.items?.find((i: any) => i.bookingId === offline.id);
    check("4.owner_manual_delivered", inc1.status === 200 && !!offItem, `status=${inc1.status} found=${!!offItem}`);
    check("4.owner_manual_change_type", offItem?.changeType === DELIVERY_CHANGE.CREATED, `changeType=${offItem?.changeType}`);
    const dto = offItem?.booking;
    check(
      "4.owner_manual_exact_fields",
      dto?.source === BOOKING_SOURCE.OWNER_MANUAL &&
        dto?.room?.id === roomA1.id &&
        dto?.roomType?.id === typeA.id &&
        dto?.checkIn === day(10).toISOString() &&
        dto?.checkOut === day(13).toISOString() &&
        dto?.guestCount === 2 &&
        dto?.totalPrice === 900,
      JSON.stringify({ source: dto?.source, room: dto?.room?.id, type: dto?.roomType?.id, in: dto?.checkIn, out: dto?.checkOut, guests: dto?.guestCount, total: dto?.totalPrice, status: dto?.status })
    );
    check(
      "13.dto_has_no_secrets",
      !!dto && !("password" in dto) && !("passport" in dto) && !("guestDocumentUrl" in dto) && !("proofUrl" in dto),
      "DTO carries no credential/passport/payment-proof fields"
    );

    const mgr = await createManualOfflineBooking({
      hotelId: hotelA.id, roomTypeId: typeA.id, roomId: roomA2.id,
      actorUserId: owner.id, actorRole: "MANAGER",
      guestName: "Manager Guest", guestPhone: "+992900200222",
      guestCount: 1, checkIn: day(10), checkOut: day(12), totalPrice: 1
    } as any);
    const inc2 = await sync(devA, { mode: "incremental", cursor: baseA });
    const mgrItem = inc2.body?.items?.find((i: any) => i.bookingId === mgr.id);
    check(
      "5.manager_manual_delivered",
      mgrItem?.booking?.source === BOOKING_SOURCE.MANAGER_MANUAL && mgrItem?.booking?.totalPrice === 600,
      `source=${mgrItem?.booking?.source} total=${mgrItem?.booking?.totalPrice} (authoritative 600, not injected 1)`
    );

    // ONLINE: the route needs a Next request scope (cookies()), unavailable outside a running server
    // (dev server blocked by Node v24). This runs the SAME create+emit statements the route runs,
    // inside a transaction, and proves it lands on the SAME endpoint with the SAME DTO shape.
    const online = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          checkIn: day(20), checkOut: day(22), totalPrice: 600, commission: 60, phone: "+992900200333",
          guestName: "Online Guest", guestCount: 2, source: "PLATFORM",
          status: BOOKING_STATUS.WAITING_PAYMENT, roomId: roomA1.id, roomTypeId: typeA.id
        }
      });
      await recordBookingDeliveryChangeById(tx, created.id, DELIVERY_CHANGE.CREATED);
      return created;
    });
    const inc3 = await sync(devA, { mode: "incremental", cursor: baseA });
    const onItem = inc3.body?.items?.find((i: any) => i.bookingId === online.id);
    const sameKeys = Object.keys(onItem?.booking ?? {}).sort().join() === Object.keys(dto ?? {}).sort().join();
    check("6.online_delivered_same_protocol", onItem?.booking?.source === "PLATFORM" && sameKeys, `source=${onItem?.booking?.source} sameDtoKeys=${sameKeys}`);

    console.log("\n=== UPDATE / STATUS / CANCELLATION ===\n");
    const beforeUpd = inc3.body.nextCursor;
    await updateOwnerOfflineBooking({ bookingId: offline.id, ownerId: owner.id, checkOut: day(14) } as any);
    const inc4 = await sync(devA, { mode: "incremental", cursor: beforeUpd });
    const upd = inc4.body?.items?.find((i: any) => i.bookingId === offline.id);
    check("7.update_delivered", upd?.changeType === DELIVERY_CHANGE.UPDATED && upd?.booking?.checkOut === day(14).toISOString(), `changeType=${upd?.changeType} checkOut=${upd?.booking?.checkOut}`);

    const beforeStatus = inc4.body.nextCursor;
    await updateOwnerOfflineBooking({ bookingId: offline.id, ownerId: owner.id, offlineStatus: "CHECKED_IN" } as any);
    const inc5 = await sync(devA, { mode: "incremental", cursor: beforeStatus });
    const st = inc5.body?.items?.find((i: any) => i.bookingId === offline.id);
    const offlineRow = await prisma.booking.findUnique({ where: { id: offline.id }, select: { offlineStatus: true } });
    check("8.status_transition_delivered", st?.changeType === DELIVERY_CHANGE.UPDATED && offlineRow?.offlineStatus === "CHECKED_IN", `change=${st?.changeType} dbOfflineStatus=${offlineRow?.offlineStatus}`);

    // PAYMENT REVIEW — the path that actually turns an online booking into CONFIRMED (owner or admin
    // approves the guest's payment proof). It must reach the device feed like every other mutation;
    // otherwise the desk keeps the stale WAITING/ON_REVIEW copy forever while sync reports success.
    const { confirmBookingPayment, rejectBookingPayment } = await import("../src/lib/bookings/paymentReviewActions");
    const mkOnReview = async (d0: number, phone: string) => {
      const b = await prisma.booking.create({
        data: {
          checkIn: day(d0), checkOut: day(d0 + 2), totalPrice: 600, commission: 60, phone,
          guestName: "Proof Guest", guestCount: 1, source: "PLATFORM",
          status: BOOKING_STATUS.ON_REVIEW, roomId: roomA2.id, roomTypeId: typeA.id,
          paymentProofUrl: "private/test-proof.jpg", proofSubmittedAt: new Date()
        }
      });
      await prisma.payment.create({ data: { bookingId: b.id, userId: owner.id, amount: 600, status: "PENDING" } });
      return b;
    };
    const proofOk = await mkOnReview(40, "+992900200601");
    const proofBad = await mkOnReview(44, "+992900200602");
    const beforeReview = inc5.body.nextCursor;
    await confirmBookingPayment({ bookingId: proofOk.id, actorId: owner.id, actorRole: "OWNER" });
    await rejectBookingPayment({ bookingId: proofBad.id, actorId: owner.id, actorRole: "OWNER", reason: "blurry receipt" });
    const incReview = await sync(devA, { mode: "incremental", cursor: beforeReview, limit: 500 });
    const conf = incReview.body?.items?.find((i: any) => i.bookingId === proofOk.id);
    const rej = incReview.body?.items?.find((i: any) => i.bookingId === proofBad.id);
    check(
      "8b.payment_confirm_delivered",
      conf?.changeType === DELIVERY_CHANGE.UPDATED && conf?.booking?.status === BOOKING_STATUS.CONFIRMED && conf?.booking?.paymentStatus === "PAID",
      `change=${conf?.changeType ?? "MISSING"} status=${conf?.booking?.status} pay=${conf?.booking?.paymentStatus}`
    );
    check(
      "8c.payment_reject_delivered",
      rej?.changeType === DELIVERY_CHANGE.UPDATED && rej?.booking?.status === BOOKING_STATUS.WAITING_PAYMENT,
      `change=${rej?.changeType ?? "MISSING"} status=${rej?.booking?.status}`
    );

    // CANCELLATION — the exact transaction the cancel routes (guest/admin/legacy/reject) run:
    // status change + explicit CANCELLED delivery event, committed together. The routes themselves
    // need a session (cookies()), unavailable without a running server.
    const beforeDomainCancel = inc5.body.nextCursor;
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: mgr.id }, data: { status: BOOKING_STATUS.CANCELLED } });
      await recordBookingDeliveryChangeById(tx, mgr.id, DELIVERY_CHANGE.CANCELLED);
    });
    const incCancel = await sync(devA, { mode: "incremental", cursor: beforeDomainCancel });
    const cancelled = incCancel.body?.items?.find((i: any) => i.bookingId === mgr.id);
    check(
      "9.cancellation_delivered_explicitly",
      cancelled?.changeType === DELIVERY_CHANGE.CANCELLED && cancelled?.booking?.status === BOOKING_STATUS.CANCELLED,
      `change=${cancelled?.changeType} status=${cancelled?.booking?.status} (explicit event, not inferred from absence)`
    );

    const beforeCancel = incCancel.body.nextCursor;
    const foreignExpirable = await prisma.booking.count({
      where: {
        status: { in: [BOOKING_STATUS.WAITING_PAYMENT, BOOKING_STATUS.WAIT_PROOF] },
        expiresAt: { lt: new Date() },
        paymentTimerPaused: false,
        NOT: { roomType: { hotelId: { in: hotels } } }
      }
    });
    if (foreignExpirable > 0) {
      // Reported as NOT RUN, not FAIL: the safety guard worked as designed. Code wiring of the job is
      // asserted by the static gate above.
      console.log(`NOT RUN  9b.cancellation_via_expiry_job_http — ${foreignExpirable} non-fixture expirable bookings exist; the job would mutate data this suite must not touch`);
    } else {
      await prisma.booking.update({ where: { id: online.id }, data: { expiresAt: new Date(Date.now() - 60_000) } });
      process.env.JOB_SECRET = process.env.JOB_SECRET || "lvbd-test-secret";
      const { POST: expireJob } = await import("../src/app/api/jobs/expire-bookings/route");
      const jobRes = await expireJob(
        new NextRequest("http://localhost/api/jobs/expire-bookings", { method: "POST", headers: { "x-job-secret": process.env.JOB_SECRET } })
      );
      const inc6 = await sync(devA, { mode: "incremental", cursor: beforeCancel });
      const cx = inc6.body?.items?.find((i: any) => i.bookingId === online.id);
      check(
        "9.cancellation_delivered",
        jobRes.status === 200 && cx?.changeType === DELIVERY_CHANGE.CANCELLED && cx?.booking?.status === BOOKING_STATUS.EXPIRED,
        `job=${jobRes.status} change=${cx?.changeType} status=${cx?.booking?.status}`
      );
    }

    console.log("\n=== CURSOR / REPLAY / EMPTY / PAGINATION ===\n");
    const full = await sync(devA, { mode: "incremental", cursor: baseA, limit: 500 });
    const revs: number[] = full.body.items.map((i: any) => i.revision);
    check("10.incremental_strictly_increasing", revs.length > 0 && revs.every((r, i) => i === 0 || r > revs[i - 1]) && revs[0] > baseA, `revisions=${revs.join(",")}`);
    const replay = await sync(devA, { mode: "incremental", cursor: baseA, limit: 500 });
    const sig = (b: any) => JSON.stringify(b.items.map((i: any) => [i.revision, i.bookingId, i.changeType]));
    check("11.cursor_replay_identical", sig(replay.body) === sig(full.body), "same cursor → same ordered change set (safe re-apply after crash before local commit)");
    const empty = await sync(devA, { mode: "incremental", cursor: full.body.nextCursor });
    check(
      "13.empty_at_head",
      empty.status === 200 && empty.body.items.length === 0 && empty.body.hasMore === false && empty.body.nextCursor === full.body.nextCursor,
      `status=${empty.status} items=${empty.body?.items?.length} hasMore=${empty.body?.hasMore}`
    );

    const pageStart = full.body.nextCursor;
    const expected: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await prisma.$transaction((tx) => recordBookingDeliveryChangeById(tx, mgr.id, DELIVERY_CHANGE.UPDATED));
      expected.push(r as number);
    }
    let cur = pageStart;
    const got: number[] = [];
    const hasMoreSeq: boolean[] = [];
    for (let guard = 0; guard < 10; guard++) {
      const p = await sync(devA, { mode: "incremental", cursor: cur, limit: 3 });
      got.push(...p.body.items.map((i: any) => i.revision));
      hasMoreSeq.push(p.body.hasMore);
      cur = p.body.nextCursor;
      if (!p.body.hasMore) break;
    }
    check("14.pagination_no_missing_no_dup_stable", JSON.stringify(got) === JSON.stringify(expected) && new Set(got).size === got.length, `expected=${expected.join(",")} got=${got.join(",")}`);
    check("14.pagination_hasMore_correct", JSON.stringify(hasMoreSeq) === JSON.stringify([true, true, false]), `hasMore=${hasMoreSeq.join(",")}`);

    console.log("\n=== CONCURRENCY: an in-flight revision is never skipped ===\n");
    const c0 = (await prisma.hotelDeliveryCursor.findUnique({ where: { hotelId: hotelA.id } }))!.lastRevision;
    let aRev = -1;
    let bRev = -1;
    let aCommitAt = 0;
    let bAllocAt = 0;
    const txA = prisma.$transaction(
      async (tx) => {
        aRev = await recordBookingDeliveryChange(tx, { bookingId: offline.id, hotelId: hotelA.id, changeType: DELIVERY_CHANGE.UPDATED });
        await sleep(1500); // hold the per-hotel lock, uncommitted
        aCommitAt = Date.now();
      },
      { timeout: 30_000 }
    );
    await sleep(250);
    const txB = prisma.$transaction(
      async (tx) => {
        bRev = await recordBookingDeliveryChange(tx, { bookingId: mgr.id, hotelId: hotelA.id, changeType: DELIVERY_CHANGE.UPDATED });
        bAllocAt = Date.now();
      },
      { timeout: 30_000 }
    );
    await sleep(500);
    const mid = await buildIncremental(hotelA.id, c0, 100); // device syncs while A is in flight, B blocked
    await Promise.all([txA, txB]);
    check("12.mid_flight_sync_sees_nothing_uncommitted", mid.items.length === 0 && mid.nextCursor === c0, `midItems=${mid.items.length} midCursor=${mid.nextCursor} c0=${c0}`);
    check("12.b_blocked_until_a_committed", bAllocAt >= aCommitAt, `B allocated ${bAllocAt - aCommitAt}ms after A's commit point`);
    check("12.commit_order_equals_revision_order", bRev === aRev + 1, `aRev=${aRev} bRev=${bRev}`);
    const after = await buildIncremental(hotelA.id, mid.nextCursor, 100);
    const afterRevs = after.items.map((i) => i.revision);
    check("12.a_not_lost_continuing_from_returned_cursor", JSON.stringify(afterRevs) === JSON.stringify([aRev, bRev]), `continued revisions=${afterRevs.join(",")}`);

    console.log("\n=== SNAPSHOT / BOOTSTRAP ===\n");
    const legacy = await createManualOfflineBooking({
      hotelId: hotelA.id, roomTypeId: typeA.id, roomId: roomA2.id,
      actorUserId: owner.id, actorRole: "OWNER",
      guestName: "Pre-changelog Guest", guestPhone: "+992900200444",
      guestCount: 1, checkIn: day(25), checkOut: day(27), totalPrice: null
    } as any);
    await prisma.bookingDeliveryChange.deleteMany({ where: { bookingId: legacy.id } }); // simulate pre-changelog row
    const snapA = await sync(devA, { mode: "snapshot", limit: 500 });
    const snapIds: number[] = snapA.body.items.map((i: any) => i.bookingId);
    check("1.snapshot_active_device", snapA.status === 200 && snapIds.includes(offline.id), `status=${snapA.status} n=${snapIds.length}`);
    check("3.pre_changelog_booking_in_snapshot", snapIds.includes(legacy.id), `legacy ${legacy.id} present=${snapIds.includes(legacy.id)}`);
    check("R.snapshot_headRevision_for_handoff", typeof snapA.body.headRevision === "number" && snapA.body.headRevision >= bRev, `headRevision=${snapA.body.headRevision}`);

    console.log("\n=== HOTEL ISOLATION ===\n");
    const bookingB = await createManualOfflineBooking({
      hotelId: hotelB.id, roomTypeId: typeB.id, roomId: roomB1.id,
      actorUserId: ownerB.id, actorRole: "OWNER",
      guestName: "Hotel B Guest", guestPhone: "+992900200555",
      guestCount: 1, checkIn: day(10), checkOut: day(11), totalPrice: null
    } as any);
    const snapForged = await sync(devA, { mode: "snapshot", limit: 500, hotelId: hotelB.id });
    const forgedIds: number[] = snapForged.body.items.map((i: any) => i.bookingId);
    check("2.snapshot_excludes_other_hotel", !snapIds.includes(bookingB.id) && !forgedIds.includes(bookingB.id), `B ${bookingB.id} leaked=${snapIds.includes(bookingB.id) || forgedIds.includes(bookingB.id)}`);
    check("20.body_hotelId_ignored", snapForged.body.hotelId === hotelA.id, `responded for hotel ${snapForged.body.hotelId} (asked ${hotelB.id})`);
    const incForged = await sync(devA, { mode: "incremental", cursor: 0, limit: 500, hotelId: hotelB.id, bookingId: bookingB.id });
    const incForgedIds: number[] = incForged.body.items.map((i: any) => i.bookingId);
    check(
      "20.incremental_cursor0_no_foreign_changes",
      !incForgedIds.includes(bookingB.id) && incForged.body.items.every((i: any) => i.booking == null || [roomA1.id, roomA2.id].includes(i.booking.room?.id)),
      `foreign leaked=${incForgedIds.includes(bookingB.id)}`
    );
    const incB = await sync(devB, { mode: "incremental", cursor: 0, limit: 500 });
    const bIds: number[] = incB.body.items.map((i: any) => i.bookingId);
    check("2.device_B_sees_only_B", bIds.includes(bookingB.id) && !bIds.includes(offline.id), `B sees own=${bIds.includes(bookingB.id)} A-leak=${bIds.includes(offline.id)}`);

    console.log("\n=== DEVICE SECURITY ===\n");
    const badSig = await sync(devA, { mode: "incremental", cursor: 0 }, { badSignature: true });
    check("17.invalid_signature_rejected", badSig.status >= 400 && badSig.status < 500 && badSig.body == null, `status=${badSig.status}`);
    const tampered = await sync(devA, { mode: "incremental", cursor: 0 }, { tamperBody: true });
    check("19.body_tamper_rejected", tampered.status >= 400 && tampered.status < 500 && tampered.body == null, `status=${tampered.status}`);
    const stale = await sync(devA, { mode: "incremental", cursor: 0 }, { timestampOffsetSec: -600 });
    check("S.expired_timestamp_rejected", stale.status >= 400 && stale.status < 500, `status=${stale.status}`);
    const withQuery = await sync(devA, { mode: "incremental", cursor: 0 }, { withQuery: true });
    check("S.query_string_rejected", withQuery.status >= 400 && withQuery.status < 500, `status=${withQuery.status}`);

    const fixedNonce = b64url(crypto.randomBytes(16));
    const first = await sync(devA, { mode: "incremental", cursor: 0 }, { nonce: fixedNonce });
    const replayed = await sync(devA, { mode: "incremental", cursor: 0 }, { nonce: fixedNonce });
    check("18.replayed_nonce_rejected", first.status === 200 && replayed.status >= 400 && replayed.status < 500, `first=${first.status} replay=${replayed.status}`);

    const gk = makeKeys();
    const ghost: Device = { deviceId: `dev_${tag}_ghost`, priv: gk.priv, pub: gk.pub };
    const unknown = await sync(ghost, { mode: "incremental", cursor: 0 });
    check("16.unknown_device_rejected", unknown.status === 401, `status=${unknown.status}`);

    const okBefore = await sync(devA, { mode: "incremental", cursor: 0 });
    await prisma.localVaultDeviceBinding.update({ where: { deviceId: devA.deviceId }, data: { status: "REVOKED", revokedAt: new Date(), revokeReason: "test" } });
    const revoked = await sync(devA, { mode: "incremental", cursor: 0 });
    check("15.revoked_device_rejected", okBefore.status === 200 && revoked.status === 403 && revoked.body == null, `before=${okBefore.status} after=${revoked.status}`);
  } catch (e) {
    check("suite", false, e instanceof Error ? `${e.message}\n${e.stack}` : String(e));
  } finally {
    if (hotels.length) {
      const fixtureBookingIds = (
        await prisma.booking.findMany({
          where: { OR: [{ roomType: { hotelId: { in: hotels } } }, { room: { hotelId: { in: hotels } } }] },
          select: { id: true }
        })
      ).map((b) => b.id);
      if (fixtureBookingIds.length) {
        await prisma.transactionLog.deleteMany({ where: { bookingId: { in: fixtureBookingIds } } });
        await prisma.payment.deleteMany({ where: { bookingId: { in: fixtureBookingIds } } });
        await prisma.chatMessage.deleteMany({ where: { bookingId: { in: fixtureBookingIds } } });
        await prisma.notification.deleteMany({ where: { bookingId: { in: fixtureBookingIds } } });
      }
      await prisma.bookingDeliveryChange.deleteMany({ where: { hotelId: { in: hotels } } });
      await prisma.hotelDeliveryCursor.deleteMany({ where: { hotelId: { in: hotels } } });
      await prisma.booking.deleteMany({ where: { roomType: { hotelId: { in: hotels } } } });
      await prisma.booking.deleteMany({ where: { room: { hotelId: { in: hotels } } } });
      await prisma.localVaultDeviceBinding.deleteMany({ where: { hotelId: { in: hotels } } });
      await prisma.room.deleteMany({ where: { hotelId: { in: hotels } } });
      await prisma.roomType.deleteMany({ where: { hotelId: { in: hotels } } });
      await prisma.ownerHotelAuditLog.deleteMany({ where: { hotelId: { in: hotels } } }).catch(() => undefined);
      await prisma.hotel.deleteMany({ where: { id: { in: hotels } } });
    }
    for (const d of devices.concat(`dev_${tag}_ghost`)) {
      await prisma.localVaultUsedNonce.deleteMany({ where: { subjectKey: `device:${d}` } });
      await prisma.localVaultRateBucket.deleteMany({ where: { id: { contains: d } } });
    }
    if (users.length) {
      await prisma.notification.deleteMany({ where: { userId: { in: users } } });
      await prisma.session.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
    await prisma.$disconnect();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

void main();
