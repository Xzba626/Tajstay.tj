import { BOOKING_STATUS } from "@/lib/domain/booking";

export const TRIPS_TABS = ["active", "pending", "history", "cancelled", "payments"] as const;
export type TripsTab = (typeof TRIPS_TABS)[number];

const CANCELLED = new Set<string>([
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.REJECTED,
  BOOKING_STATUS.EXPIRED,
  "CANCELLED_BY_GUEST"
]);

const PENDING = new Set<string>([
  BOOKING_STATUS.WAITING_PAYMENT,
  BOOKING_STATUS.WAIT_PROOF,
  BOOKING_STATUS.ON_REVIEW
]);

const ACTIVE = new Set<string>([
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.CHECKED_IN,
  BOOKING_STATUS.PENDING_OWNER
]);

const TERMINAL_HISTORY = new Set<string>([
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.REJECTED,
  BOOKING_STATUS.CANCELLED,
  BOOKING_STATUS.EXPIRED,
  "CANCELLED_BY_GUEST"
]);

/** Hide from active 15+ days after checkout when terminal. */
export function isBookingInTripsArchive(b: { status: string; checkOut: Date }): boolean {
  if (!TERMINAL_HISTORY.has(b.status)) return false;
  const cut = new Date(b.checkOut);
  cut.setDate(cut.getDate() + 15);
  return Date.now() > cut.getTime();
}

export function parseTripsTab(raw: string | undefined): TripsTab {
  const t = (raw ?? "active").trim().toLowerCase();
  if (TRIPS_TABS.includes(t as TripsTab)) return t as TripsTab;
  return "active";
}

type BookingSlice = {
  status: string;
  paymentStatus: string;
  checkOut: Date;
  paymentProofUrl?: string | null;
  proofSubmittedAt?: Date | null;
};

export function classifyTripsTab(b: BookingSlice): TripsTab {
  if (CANCELLED.has(b.status)) return "cancelled";
  if (PENDING.has(b.status)) return "pending";
  if (b.status === BOOKING_STATUS.COMPLETED || isBookingInTripsArchive(b)) return "history";
  if (ACTIVE.has(b.status)) return "active";
  if (b.paymentProofUrl || b.proofSubmittedAt || b.paymentStatus === "PAID") return "payments";
  return "history";
}

export function filterBookingsByTab<T extends BookingSlice>(bookings: T[], tab: TripsTab): T[] {
  return bookings.filter((b) => classifyTripsTab(b) === tab);
}
