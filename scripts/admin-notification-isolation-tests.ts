/**
 * ADMIN NOTIFICATION ISOLATION — regression coverage for the authorization defect found during
 * the Admin/Owner visual pass: `src/app/dashboard/admin/page.tsx`'s Notifications section ran
 * `prisma.notification.count()` and `prisma.notification.findMany()` with NO `where` clause, so
 * the Admin UI listed, counted and paginated every user's notifications platform-wide and
 * rendered other users' PII (guest name + phone via the `booking` include).
 *
 * These tests assert the shared `adminNotificationWhere` predicate actually isolates by
 * recipient AND by admin-operational type, and that the list/count/unread paths cannot diverge.
 *
 * Run: npx tsx scripts/admin-notification-isolation-tests.ts
 */
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "../src/lib/auth/password";
import {
  adminNotificationCleanupWhere,
  adminNotificationWhere,
  getAdminNotificationsCount,
  getAdminUnreadNotificationsCount
} from "../src/lib/notifications/unread";

type Row = { name: string; ok: boolean; detail: string };
const results: Row[] = [];

function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function staticGates() {
  console.log("\n=== STATIC ===\n");
  const page = fs.readFileSync(path.join(process.cwd(), "src/app/dashboard/admin/page.tsx"), "utf8");

  // The exact regression: an unscoped count()/findMany() in the notifications branch.
  check(
    "admin.notifications.count_scoped",
    !page.includes("prisma.notification.count()"),
    "no bare prisma.notification.count() remains"
  );
  check(
    "admin.notifications.list_scoped",
    page.includes("where: adminNotificationWhere(admin.id)"),
    "findMany uses the shared predicate"
  );
  check(
    "admin.notifications.count_helper",
    page.includes("getAdminNotificationsCount(admin.id)"),
    "pagination denominator uses the shared predicate"
  );

  // Consumer-side routes were audited as already correctly recipient-scoped — lock that in.
  const read = fs.readFileSync(path.join(process.cwd(), "src/app/api/notifications/[id]/read/route.ts"), "utf8");
  check("notif.read_ownership_check", read.includes("where: { id, userId: user.id }"), "detail/read is ownership-checked");

  const list = fs.readFileSync(path.join(process.cwd(), "src/app/api/notifications/list/route.ts"), "utf8");
  check("notif.list_scoped", list.includes("where: { userId: user.id }"), "consumer list is recipient-scoped");

  const readAll = fs.readFileSync(path.join(process.cwd(), "src/app/api/notifications/read-all/route.ts"), "utf8");
  check("notif.read_all_scoped", readAll.includes("userId: user.id"), "read-all is recipient-scoped");

  // Destructive cleanup: scope + authorization. The unauthorized-caller case cannot be exercised
  // by this harness (no HTTP/session layer), so the guard is asserted statically — reported as
  // static evidence, never as a runtime PASS.
  const cleanup = fs.readFileSync(path.join(process.cwd(), "src/app/api/admin/notifications/cleanup/route.ts"), "utf8");
  // Strip comments first: route.ts deliberately quotes the old predicate in its explanatory comment.
  const cleanupCode = cleanup.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  check(
    "cleanup.not_platform_wide",
    !/deleteMany\(\s*\{\s*where:\s*\{\s*createdAt/.test(cleanupCode),
    "no bare createdAt-only deleteMany in executable code"
  );
  check(
    "cleanup.uses_shared_predicate",
    cleanup.includes("adminNotificationCleanupWhere(admin.id, threshold)"),
    "route uses the shared helper built on adminNotificationWhere"
  );
  check(
    "cleanup.authz_guard_present",
    cleanup.includes("getAdminUser()") && cleanup.includes("forbiddenJson()"),
    "STATIC EVIDENCE: non-admin → 403 before destructive query"
  );
  const requireAdmin = fs.readFileSync(path.join(process.cwd(), "src/lib/auth/requireAdmin.ts"), "utf8");
  check(
    "cleanup.authz_guard_is_real",
    requireAdmin.includes('user.role !== "ADMIN"'),
    "STATIC EVIDENCE: getAdminUser checks session role server-side"
  );
}

async function dbProof() {
  console.log("\n=== DB / ISOLATION ===\n");
  const { prisma } = await import("../src/lib/prisma");
  const tag = `adm-notif-${Date.now()}`;
  let adminA = null as { id: number } | null;
  let guest = null as { id: number } | null;
  let owner = null as { id: number } | null;

  try {
    adminA = await prisma.user.create({
      data: {
        email: `${tag}-admin@tajstay.local`,
        name: "Notif Admin A",
        password: await hashPassword("AdminA123!"),
        role: "ADMIN",
        phone: `+99290000${String(Date.now()).slice(-4)}`
      }
    });
    guest = await prisma.user.create({
      data: {
        email: `${tag}-guest@tajstay.local`,
        name: "Notif Guest",
        password: await hashPassword("GuestX123!"),
        role: "GUEST",
        phone: `+99290001${String(Date.now()).slice(-4)}`
      }
    });
    owner = await prisma.user.create({
      data: {
        email: `${tag}-owner@tajstay.local`,
        name: "Notif Owner",
        password: await hashPassword("OwnerX123!"),
        role: "OWNER",
        phone: `+99290002${String(Date.now()).slice(-4)}`
      }
    });

    // A: admin operational notification for this admin → must be visible.
    const adminNote = await prisma.notification.create({
      data: { userId: adminA.id, type: "OWNER_APPLICATION_NEW", isRead: false }
    });
    // A2: templated risk-flag type, also admin-operational.
    await prisma.notification.create({
      data: { userId: adminA.id, type: "RISK_FLAG_HOTEL:123:87", isRead: false }
    });
    // B: consumer notification belonging to a GUEST → must never appear for the admin.
    const guestNote = await prisma.notification.create({
      data: { userId: guest.id, type: "BOOKING_CONFIRMED", isRead: false }
    });
    // C: owner notification belonging to an OWNER → must never appear for the admin.
    const ownerNote = await prisma.notification.create({
      data: { userId: owner.id, type: "NEW_BOOKING", isRead: false }
    });
    // D: consumer-type notification addressed to the ADMIN's own account (admin also books as a
    //    guest). Correct recipient, wrong domain → must be excluded from the operational feed.
    await prisma.notification.create({
      data: { userId: adminA.id, type: "BOOKING_CONFIRMED", isRead: false }
    });

    const visible = await prisma.notification.findMany({
      where: adminNotificationWhere(adminA.id),
      select: { id: true, userId: true, type: true }
    });
    const visibleIds = visible.map((n) => n.id);

    check("A.admin_sees_own_operational", visibleIds.includes(adminNote.id), `ids=${visibleIds.join(",")}`);
    check(
      "A2.admin_sees_risk_flag_prefix",
      visible.some((n) => n.type.startsWith("RISK_FLAG_HOTEL:")),
      "templated RISK_FLAG_HOTEL type matched"
    );
    check("B.guest_notification_excluded", !visibleIds.includes(guestNote.id), `guestNote=${guestNote.id}`);
    check("C.owner_notification_excluded", !visibleIds.includes(ownerNote.id), `ownerNote=${ownerNote.id}`);
    check(
      "D.consumer_type_for_admin_excluded",
      !visible.some((n) => n.type === "BOOKING_CONFIRMED"),
      "admin's own guest-context row filtered out by domain scope"
    );
    check(
      "ISOLATION.no_foreign_recipients",
      visible.every((n) => n.userId === adminA!.id),
      "every returned row belongs to this admin"
    );

    // E: pagination denominator must match the filtered list, not the whole table.
    const totalRows = await getAdminNotificationsCount(adminA.id);
    const platformTotal = await prisma.notification.count();
    check("E.count_matches_list", totalRows === visible.length, `count=${totalRows} list=${visible.length}`);
    check(
      "E2.count_is_not_platform_wide",
      totalRows < platformTotal,
      `admin=${totalRows} platform=${platformTotal} (fixtures alone guarantee others exist)`
    );

    // F: unread count uses the same predicate (all fixtures above are unread).
    const unread = await getAdminUnreadNotificationsCount(adminA.id);
    check("F.unread_matches_predicate", unread === visible.length, `unread=${unread} list=${visible.length}`);
  } catch (e) {
    check("db.proof", false, e instanceof Error ? e.message : String(e));
  } finally {
    const ids = [adminA?.id, guest?.id, owner?.id].filter((x): x is number => typeof x === "number");
    if (ids.length) {
      await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
      await prisma.session.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  }
}

/**
 * Cleanup scope proof. Runs the SAME `adminNotificationCleanupWhere` helper the route uses, but
 * only ever against freshly created synthetic users — the fixture admins own no real rows, so the
 * destructive deleteMany cannot touch any pre-existing (local or production) data.
 */
async function cleanupProof() {
  console.log("\n=== DB / CLEANUP SCOPE ===\n");
  const { prisma } = await import("../src/lib/prisma");
  const tag = `adm-clean-${Date.now()}`;
  const suffix = String(Date.now()).slice(-4);
  const ids: number[] = [];

  try {
    const mk = async (role: string, n: string) => {
      const u = await prisma.user.create({
        data: {
          email: `${tag}-${n}@tajstay.local`,
          name: `Clean ${n}`,
          password: await hashPassword("Clean123!x"),
          role,
          phone: `+9929${n.length}${suffix}${ids.length}`
        }
      });
      ids.push(u.id);
      return u;
    };
    const adminA = await mk("ADMIN", "adminA");
    const adminB = await mk("ADMIN", "adminB");
    const guest = await mk("GUEST", "guest");
    const owner = await mk("OWNER", "owner");

    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
    const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // days=30
    const note = (userId: number, type: string, createdAt?: Date) =>
      prisma.notification.create({ data: { userId, type, isRead: false, ...(createdAt ? { createdAt } : {}) } });

    const oldAdminOp = await note(adminA.id, "OWNER_APPLICATION_NEW", old);
    const recentAdminOp = await note(adminA.id, "OWNER_APPLICATION_NEW");
    const oldGuest = await note(guest.id, "BOOKING_CONFIRMED", old);
    const oldOwner = await note(owner.id, "NEW_BOOKING", old);
    const oldOtherAdmin = await note(adminB.id, "HOTEL_PENDING_REVIEW", old);
    const oldAdminConsumerType = await note(adminA.id, "BOOKING_CONFIRMED", old);

    const res = await prisma.notification.deleteMany({ where: adminNotificationCleanupWhere(adminA.id, threshold) });
    const alive = async (id: number) => Boolean(await prisma.notification.findUnique({ where: { id } }));

    check("C1.old_admin_operational_deleted", !(await alive(oldAdminOp.id)), `deletedCount=${res.count}`);
    check("C2.recent_admin_operational_kept", await alive(recentAdminOp.id), "inside retention window");
    check("C3.old_guest_kept", await alive(oldGuest.id), "guest domain preserved");
    check("C4.old_owner_kept", await alive(oldOwner.id), "owner domain preserved");
    check("C5.other_admin_kept", await alive(oldOtherAdmin.id), "another admin's notifications untouched");
    check("C6.admin_consumer_type_kept", await alive(oldAdminConsumerType.id), "non-operational type of this admin untouched");
    check("C7.exactly_one_deleted", res.count === 1, `count=${res.count}`);
  } catch (e) {
    check("cleanup.proof", false, e instanceof Error ? e.message : String(e));
  } finally {
    if (ids.length) {
      await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
      await prisma.session.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("\n=== ADMIN NOTIFICATION ISOLATION TESTS ===\n");
  staticGates();
  await dbProof();
  await cleanupProof();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

void main();
