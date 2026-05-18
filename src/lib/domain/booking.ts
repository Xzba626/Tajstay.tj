/** Статусы бронирования (хранятся в Booking.status) */
export const BOOKING_STATUS = {
  // New premium chat-first lifecycle (2026)
  WAITING_PAYMENT: "WAITING_PAYMENT",
  CHECKED_IN: "CHECKED_IN",

  // Legacy statuses kept for compatibility with existing flows
  WAIT_PROOF: "WAIT_PROOF",
  ON_REVIEW: "ON_REVIEW",
  PENDING_OWNER: "PENDING_OWNER",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED"
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const ESCROW_STATE = {
  NOT_CHARGED: "NOT_CHARGED",
  HELD: "HELD",
  RELEASABLE: "RELEASABLE",
  RELEASED: "RELEASED",
  REFUNDED: "REFUNDED"
} as const;

export type EscrowState = (typeof ESCROW_STATE)[keyof typeof ESCROW_STATE];

export function deriveEscrowState(input: {
  status: string;
  paymentStatus: string;
}): EscrowState {
  if (input.paymentStatus === "REFUNDED") return ESCROW_STATE.REFUNDED;
  if (input.paymentStatus !== "PAID") return ESCROW_STATE.NOT_CHARGED;
  if (input.status === BOOKING_STATUS.COMPLETED) return ESCROW_STATE.RELEASED;
  if (input.status === BOOKING_STATUS.CHECKED_IN) return ESCROW_STATE.HELD;
  if (input.status === BOOKING_STATUS.CONFIRMED) return ESCROW_STATE.RELEASABLE;
  return ESCROW_STATE.HELD;
}

export function normalizeBookingStatus(status: string): BookingStatus {
  if (status === BOOKING_STATUS.WAIT_PROOF) return BOOKING_STATUS.WAITING_PAYMENT;
  return (status as BookingStatus) || BOOKING_STATUS.WAITING_PAYMENT;
}

export const OWNER_APPLICATION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED"
} as const;
