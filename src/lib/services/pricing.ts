import { differenceInCalendarDays } from "date-fns";

export function calculateCommission(amount: number): number {
  const rate = Number(process.env.COMMISSION_RATE ?? "0.12");
  return Number((amount * rate).toFixed(2));
}

export function calculateNights(checkIn: Date, checkOut: Date): number {
  const days = differenceInCalendarDays(checkOut, checkIn);
  return days > 0 ? days : 1;
}

