import { BOOKING_STATUS } from "@/lib/domain/booking";

/** History filters (guest hub). No separate “Paid” tab — payment is a badge, not a category. */
export const TRIPS_TABS = ["confirmed", "unconfirmed", "past", "cancelled", "all"] as const;
export type TripsTab = (typeof TRIPS_TABS)[number];

const CANCELLED = new Set<string>([
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.REJECTED,
  BOOKING_STATUS.EXPIRED,
  "CANCELLED_BY_GUEST"
]);

const UNCONFIRMED = new Set<string>([
  BOOKING_STATUS.WAITING_PAYMENT,
  BOOKING_STATUS.WAIT_PROOF,
  BOOKING_STATUS.ON_REVIEW,
  BOOKING_STATUS.PENDING_OWNER,
  "PENDING"
]);

/** Live stay statuses — COMPLETED is a business status, not a History tab. */
const CONFIRMED_LIVE = new Set<string>([
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.COMPLETED
]);

/** Legacy query aliases → History tabs. */
const LEGACY_TAB_MAP: Record<string, TripsTab> = {
  active: "confirmed",
  pending: "unconfirmed",
  history: "past",
  payments: "all"
};

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Past is a **temporal** History category (calendar), not a booking business status.
 * Do not equate COMPLETED with Past — COMPLETED stays in Confirmed until check-out day has passed.
 */
export function isStayPast(checkOut: Date, now: Date = new Date()): boolean {
  return startOfLocalDay(now).getTime() > startOfLocalDay(checkOut).getTime();
}

/** Hide from “live” lists 15+ days after checkout when terminal (legacy helper). */
export function isBookingInTripsArchive(b: { status: string; checkOut: Date }): boolean {
  if (!CANCELLED.has(b.status) && b.status !== BOOKING_STATUS.COMPLETED) return false;
  const cut = new Date(b.checkOut);
  cut.setDate(cut.getDate() + 15);
  return Date.now() > cut.getTime();
}

export function parseTripsTab(raw: string | undefined): TripsTab {
  const t = (raw ?? "confirmed").trim().toLowerCase();
  if (LEGACY_TAB_MAP[t]) return LEGACY_TAB_MAP[t];
  if (TRIPS_TABS.includes(t as TripsTab)) return t as TripsTab;
  return "confirmed";
}

type BookingSlice = {
  status: string;
  paymentStatus: string;
  checkIn: Date;
  checkOut: Date;
  paymentProofUrl?: string | null;
  proofSubmittedAt?: Date | null;
};

/**
 * Mutually exclusive History category (except “all”).
 * Priority: cancelled → past (by check-out date only) → unconfirmed → confirmed.
 * COMPLETED is shown via booking-status badge; tab Past is date-driven.
 */
export function classifyTripsTab(b: BookingSlice, now: Date = new Date()): Exclude<TripsTab, "all"> {
  if (CANCELLED.has(b.status)) return "cancelled";

  if (isStayPast(b.checkOut, now)) return "past";

  if (UNCONFIRMED.has(b.status)) return "unconfirmed";

  if (CONFIRMED_LIVE.has(b.status)) return "confirmed";

  // Unknown status with future dates → treat as unconfirmed rather than inventing a tab
  return "unconfirmed";
}

export function filterBookingsByTab<T extends BookingSlice>(bookings: T[], tab: TripsTab, now?: Date): T[] {
  if (tab === "all") return bookings;
  return bookings.filter((b) => classifyTripsTab(b, now) === tab);
}

export function countBookingsByTabs<T extends BookingSlice>(bookings: T[], now?: Date): Record<TripsTab, number> {
  const counts: Record<TripsTab, number> = {
    confirmed: 0,
    unconfirmed: 0,
    past: 0,
    cancelled: 0,
    all: bookings.length
  };
  for (const b of bookings) {
    counts[classifyTripsTab(b, now)] += 1;
  }
  return counts;
}

export function normalizePaymentBadge(paymentStatus: string): "UNPAID" | "PAID" | "REFUNDED" | "FAILED" {
  if (paymentStatus === "PAID") return "PAID";
  if (paymentStatus === "REFUNDED") return "REFUNDED";
  if (paymentStatus === "FAILED") return "FAILED";
  return "UNPAID";
}
