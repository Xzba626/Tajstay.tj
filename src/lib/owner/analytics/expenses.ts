import { daysInMonth, eachLocalDay, startOfLocalDay } from "@/lib/owner/analytics/period";
import { toMinor } from "@/lib/owner/analytics/money";
import { EXPENSE_RECURRENCE } from "@/lib/owner/analytics/types";

export type ExpenseVersionRow = {
  expenseId: number;
  amount: unknown;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  recurrence: string;
  category: string;
  title: string;
  status: string;
};

/**
 * Allocate expense amount into a period (minor units).
 * ONE_TIME: full amount if effectiveFrom day is inside [start, end].
 * MONTHLY: for each calendar day in period ∩ version window:
 *   daily = monthlyAmount / daysInThatMonth (actual 28/29/30/31).
 */
export function allocateExpenseVersionsToPeriod(
  versions: ExpenseVersionRow[],
  periodStart: Date,
  periodEnd: Date
): {
  totalMinor: number;
  byCategory: Record<string, number>;
  byExpense: Record<number, { title: string; category: string; minor: number }>;
} {
  const byCategory: Record<string, number> = {};
  const byExpense: Record<number, { title: string; category: string; minor: number }> = {};
  let totalMinor = 0;

  const days = eachLocalDay(periodStart, periodEnd);

  for (const v of versions) {
    if (v.status === "ARCHIVED") continue;
    const from = startOfLocalDay(v.effectiveFrom);
    const until = v.effectiveUntil ? startOfLocalDay(v.effectiveUntil) : null;
    const amountMinor = toMinor(v.amount);

    if (v.recurrence === EXPENSE_RECURRENCE.ONE_TIME) {
      if (from.getTime() >= periodStart.getTime() && from.getTime() <= periodEnd.getTime()) {
        if (until && from.getTime() >= until.getTime()) continue;
        totalMinor += amountMinor;
        byCategory[v.category] = (byCategory[v.category] ?? 0) + amountMinor;
        const prev = byExpense[v.expenseId] ?? { title: v.title, category: v.category, minor: 0 };
        prev.minor += amountMinor;
        byExpense[v.expenseId] = prev;
      }
      continue;
    }

    // MONTHLY
    let allocated = 0;
    for (const day of days) {
      if (day.getTime() < from.getTime()) continue;
      if (until && day.getTime() >= until.getTime()) continue;
      const dim = daysInMonth(day.getFullYear(), day.getMonth());
      allocated += Math.round(amountMinor / dim);
    }
    if (allocated === 0) continue;
    totalMinor += allocated;
    byCategory[v.category] = (byCategory[v.category] ?? 0) + allocated;
    const prev = byExpense[v.expenseId] ?? { title: v.title, category: v.category, minor: 0 };
    prev.minor += allocated;
    byExpense[v.expenseId] = prev;
  }

  return { totalMinor, byCategory, byExpense };
}
