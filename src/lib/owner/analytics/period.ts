/**
 * Analytics period semantics (TajStay business calendar — local day boundaries).
 * TODAY / WEEK / MONTH use hotel-local calendar days via host timezone offset of Date local.
 */
export type AnalyticsPeriodKey = "today" | "week" | "month" | "custom";

export type AnalyticsPeriod = {
  key: AnalyticsPeriodKey;
  start: Date;
  end: Date;
  labelKey: string;
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Monday-start week (TajStay Owner Analytics). */
function startOfLocalWeek(d: Date): Date {
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return startOfLocalDay(monday);
}

function startOfLocalMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function resolveAnalyticsPeriod(
  key: AnalyticsPeriodKey,
  now = new Date(),
  custom?: { from?: string; to?: string }
): AnalyticsPeriod {
  if (key === "custom" && custom?.from && custom?.to) {
    const start = startOfLocalDay(new Date(custom.from));
    const end = endOfLocalDay(new Date(custom.to));
    if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && start <= end) {
      return { key: "custom", start, end, labelKey: "owner.analytics.period.custom" };
    }
  }
  if (key === "week") {
    return {
      key: "week",
      start: startOfLocalWeek(now),
      end: endOfLocalDay(now),
      labelKey: "owner.analytics.period.week"
    };
  }
  if (key === "month") {
    return {
      key: "month",
      start: startOfLocalMonth(now),
      end: endOfLocalDay(now),
      labelKey: "owner.analytics.period.month"
    };
  }
  return {
    key: "today",
    start: startOfLocalDay(now),
    end: endOfLocalDay(now),
    labelKey: "owner.analytics.period.today"
  };
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function eachLocalDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cur = startOfLocalDay(start);
  const last = startOfLocalDay(end);
  while (cur.getTime() <= last.getTime()) {
    days.push(new Date(cur));
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
  }
  return days;
}

export { startOfLocalDay, endOfLocalDay };
