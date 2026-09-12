import { addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { writeAdminAudit } from "@/lib/admin/auditLog";

export type HotelSubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";

const DEFAULT_MONTHLY_PRICE_TJS = 99;

/** Singleton platform setting row (id=1), created lazily with a safe default. */
export async function getPlatformSetting() {
  const existing = await prisma.platformSetting.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.platformSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, subscriptionMonthlyPriceTjs: DEFAULT_MONTHLY_PRICE_TJS }
  });
}

/** Admin-only. Caller must have already verified admin role - this has no auth check of its own. */
export async function setSubscriptionMonthlyPrice(newPriceTjs: number, adminId: number) {
  const before = await getPlatformSetting();
  const updated = await prisma.platformSetting.update({
    where: { id: 1 },
    data: { subscriptionMonthlyPriceTjs: newPriceTjs, updatedById: adminId }
  });
  await writeAdminAudit({
    actorUserId: adminId,
    action: "subscription_price_changed",
    targetType: "PlatformSetting",
    targetId: 1,
    beforeState: { subscriptionMonthlyPriceTjs: before.subscriptionMonthlyPriceTjs.toString() },
    afterState: { subscriptionMonthlyPriceTjs: newPriceTjs }
  });
  return updated;
}

/**
 * Idempotently starts a Hotel's subscription trial - called only from the Admin moderation route,
 * only on the PENDING/REJECTED -> APPROVED transition. `HotelSubscription.hotelId` is @unique, so
 * even a genuine race (two concurrent approve requests) can create at most one row - the loser's
 * insert fails on the unique constraint and is treated as "already started", not an error.
 * Re-approval after a later suspension/reactivation must NEVER reset trialStartAt - this function
 * is a no-op if a subscription already exists for the hotel, by design.
 */
export async function ensureHotelSubscriptionOnApproval(hotelId: number) {
  const existing = await prisma.hotelSubscription.findUnique({ where: { hotelId } });
  if (existing) return existing;

  const trialStartAt = new Date();
  const trialEndAt = addMonths(trialStartAt, 1);
  // The reference tariff at the moment the trial started - recorded for audit ("what was the
  // list price when this trial began"), NOT charged. amountDue/amountPaid both stay 0 - a FREE
  // period owes nothing and collects nothing, full stop. Never derive revenue from
  // tariffSnapshot; see the model comment in schema.prisma.
  const referenceTariff = (await getPlatformSetting()).subscriptionMonthlyPriceTjs;

  try {
    return await prisma.hotelSubscription.create({
      data: {
        hotelId,
        status: "TRIAL",
        trialStartAt,
        trialEndAt,
        periods: {
          create: {
            periodStart: trialStartAt,
            periodEnd: trialEndAt,
            status: "FREE",
            tariffSnapshot: referenceTariff,
            amountDue: 0,
            amountPaid: 0
          }
        }
      }
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      // Lost a race to a concurrent request - the other one already created it, fetch and return.
      const race = await prisma.hotelSubscription.findUnique({ where: { hotelId } });
      if (race) return race;
    }
    throw err;
  }
}

export async function getHotelSubscription(hotelId: number) {
  return prisma.hotelSubscription.findUnique({ where: { hotelId }, include: { periods: { orderBy: { periodStart: "desc" } } } });
}

/**
 * The ONE canonical definition of TajStay subscription revenue: SUM(amountPaid) WHERE
 * status = 'PAID'. Never SUM(tariffSnapshot), never inferred from status alone - a FREE trial
 * period has a real tariffSnapshot (what the price was) but amountPaid is always 0, so it
 * correctly contributes nothing here regardless of what the tariff happened to be. Establishing
 * this now, ahead of Admin Financial Analytics, so that later work has one shared, already-correct
 * query to call rather than re-deriving revenue logic (and re-risking the free-trial-counted-as-
 * revenue mistake) from scratch.
 */
export async function getSubscriptionRevenue(params?: { since?: Date; hotelId?: number }) {
  const agg = await prisma.subscriptionPeriod.aggregate({
    where: {
      status: "PAID",
      ...(params?.since ? { paidAt: { gte: params.since } } : {}),
      ...(params?.hotelId ? { subscription: { hotelId: params.hotelId } } : {})
    },
    _sum: { amountPaid: true }
  });
  return Number(agg._sum.amountPaid ?? 0);
}
