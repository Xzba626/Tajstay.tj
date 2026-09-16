import { prisma } from "@/lib/prisma";
import { writeOwnerHotelAudit } from "@/lib/owner/analytics/audit";
import { EXPENSE_CATEGORY, EXPENSE_RECURRENCE, EXPENSE_STATUS } from "@/lib/owner/analytics/types";
import { startOfLocalDay } from "@/lib/owner/analytics/period";

async function assertOwnerHotel(hotelId: number, ownerId: number) {
  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId }, select: { id: true } });
  if (!hotel) throw new Error("FORBIDDEN");
  return hotel;
}

export async function listHotelExpenses(hotelId: number, ownerId: number) {
  await assertOwnerHotel(hotelId, ownerId);
  return prisma.hotelExpense.findMany({
    where: { hotelId, status: { not: EXPENSE_STATUS.ARCHIVED } },
    include: {
      versions: { orderBy: { effectiveFrom: "desc" } }
    },
    orderBy: { updatedAt: "desc" }
  });
}

export async function createHotelExpense(input: {
  hotelId: number;
  ownerId: number;
  title: string;
  category: string;
  amount: number;
  recurrence: string;
  effectiveFrom: Date;
  actorRole?: string;
}) {
  await assertOwnerHotel(input.hotelId, input.ownerId);
  const title = input.title.trim();
  if (!title) throw new Error("INVALID_INPUT");
  if (!EXPENSE_CATEGORY.includes(input.category as (typeof EXPENSE_CATEGORY)[number])) {
    throw new Error("INVALID_CATEGORY");
  }
  if (input.recurrence !== EXPENSE_RECURRENCE.ONE_TIME && input.recurrence !== EXPENSE_RECURRENCE.MONTHLY) {
    throw new Error("INVALID_RECURRENCE");
  }
  if (!(input.amount > 0)) throw new Error("INVALID_AMOUNT");

  const from = startOfLocalDay(input.effectiveFrom);

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.hotelExpense.create({
      data: {
        hotelId: input.hotelId,
        title,
        category: input.category,
        recurrence: input.recurrence,
        status: EXPENSE_STATUS.ACTIVE,
        createdByUserId: input.ownerId,
        versions: {
          create: {
            amount: input.amount,
            effectiveFrom: from,
            effectiveUntil: null,
            createdByUserId: input.ownerId
          }
        }
      },
      include: { versions: true }
    });
    await writeOwnerHotelAudit(
      {
        hotelId: input.hotelId,
        actorUserId: input.ownerId,
        actorRole: input.actorRole ?? "OWNER",
        action: "expense.created",
        entityType: "HotelExpense",
        entityId: created.id,
        afterState: {
          title,
          category: input.category,
          amount: input.amount,
          recurrence: input.recurrence,
          effectiveFrom: from.toISOString()
        }
      },
      tx
    );
    return created;
  });

  return expense;
}

/** Change amount/category for MONTHLY via new version; closes previous open version. */
export async function updateHotelExpenseAmount(input: {
  hotelId: number;
  ownerId: number;
  expenseId: number;
  amount: number;
  effectiveFrom: Date;
  title?: string;
  category?: string;
  actorRole?: string;
}) {
  await assertOwnerHotel(input.hotelId, input.ownerId);
  if (!(input.amount > 0)) throw new Error("INVALID_AMOUNT");
  const from = startOfLocalDay(input.effectiveFrom);

  const expense = await prisma.hotelExpense.findFirst({
    where: { id: input.expenseId, hotelId: input.hotelId },
    include: { versions: { orderBy: { effectiveFrom: "desc" }, take: 1 } }
  });
  if (!expense) throw new Error("NOT_FOUND");
  if (expense.status === EXPENSE_STATUS.ARCHIVED) throw new Error("ARCHIVED");

  const current = expense.versions[0];
  const beforeAmount = current ? Number(current.amount) : null;

  await prisma.$transaction(async (tx) => {
    if (current && current.effectiveUntil == null) {
      // Close previous version at new effectiveFrom (exclusive).
      if (from.getTime() <= current.effectiveFrom.getTime()) {
        throw new Error("EFFECTIVE_BEFORE_CURRENT");
      }
      await tx.hotelExpenseVersion.update({
        where: { id: current.id },
        data: { effectiveUntil: from }
      });
    }
    await tx.hotelExpenseVersion.create({
      data: {
        expenseId: expense.id,
        amount: input.amount,
        effectiveFrom: from,
        effectiveUntil: null,
        createdByUserId: input.ownerId,
        note: "amount_change"
      }
    });
    await tx.hotelExpense.update({
      where: { id: expense.id },
      data: {
        status: EXPENSE_STATUS.ACTIVE,
        title: input.title?.trim() || expense.title,
        category: input.category || expense.category,
        updatedAt: new Date()
      }
    });
    await writeOwnerHotelAudit(
      {
        hotelId: input.hotelId,
        actorUserId: input.ownerId,
        actorRole: input.actorRole ?? "OWNER",
        action: "expense.amount_changed",
        entityType: "HotelExpense",
        entityId: expense.id,
        beforeState: { amount: beforeAmount },
        afterState: { amount: input.amount, effectiveFrom: from.toISOString() }
      },
      tx
    );
  });
}

export async function stopHotelExpense(input: {
  hotelId: number;
  ownerId: number;
  expenseId: number;
  stopAt: Date;
  actorRole?: string;
}) {
  await assertOwnerHotel(input.hotelId, input.ownerId);
  const stopAt = startOfLocalDay(input.stopAt);
  const expense = await prisma.hotelExpense.findFirst({
    where: { id: input.expenseId, hotelId: input.hotelId },
    include: { versions: { where: { effectiveUntil: null }, take: 1 } }
  });
  if (!expense) throw new Error("NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    if (expense.versions[0]) {
      await tx.hotelExpenseVersion.update({
        where: { id: expense.versions[0].id },
        data: { effectiveUntil: stopAt }
      });
    }
    await tx.hotelExpense.update({
      where: { id: expense.id },
      data: { status: EXPENSE_STATUS.STOPPED }
    });
    await writeOwnerHotelAudit(
      {
        hotelId: input.hotelId,
        actorUserId: input.ownerId,
        actorRole: input.actorRole ?? "OWNER",
        action: "expense.stopped",
        entityType: "HotelExpense",
        entityId: expense.id,
        afterState: { stopAt: stopAt.toISOString() }
      },
      tx
    );
  });
}
