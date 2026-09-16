/** Money helpers — integer minor units (tiyin) to avoid float drift. */
import { moneyToFixed2 } from "@/lib/money/serializeDecimal";

export function toMinor(value: unknown): number {
  const n = Number(moneyToFixed2(value));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromMinor(minor: number): number {
  return Math.round(minor) / 100;
}

export function formatTjs(minor: number): string {
  return fromMinor(minor).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}
