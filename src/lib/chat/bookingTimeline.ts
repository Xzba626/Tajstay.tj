import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/domain/booking";

export type TimelineEventKind =
  | "BOOKING_CREATED"
  | "PAYMENT_PENDING"
  | "PROOF_SUBMITTED"
  | "ON_REVIEW"
  | "CONFIRMED"
  | "REJECTED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "SYSTEM";

export type BookingTimelineEvent = {
  id: string;
  kind: TimelineEventKind;
  at: string;
  labelKey: string;
  detail?: string;
};

function pushUnique(events: BookingTimelineEvent[], event: BookingTimelineEvent) {
  if (events.some((e) => e.id === event.id)) return;
  events.push(event);
}

export async function getBookingTimeline(bookingId: number): Promise<BookingTimelineEvent[]> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      createdAt: true,
      status: true,
      paymentStatus: true,
      proofSubmittedAt: true,
      proofReviewedAt: true,
      checkIn: true,
      checkOut: true
    }
  });
  if (!booking) return [];

  const [logs, systemMessages] = await Promise.all([
    prisma.transactionLog.findMany({
      where: { bookingId },
      orderBy: { createdAt: "asc" },
      take: 100
    }),
    prisma.chatMessage.findMany({
      where: { bookingId, senderRole: "SYSTEM", deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 80,
      select: { id: true, body: true, createdAt: true }
    })
  ]);

  const events: BookingTimelineEvent[] = [];

  pushUnique(events, {
    id: "created",
    kind: "BOOKING_CREATED",
    at: booking.createdAt.toISOString(),
    labelKey: "bookingRoom.timeline.created"
  });

  const payPendingAt = booking.createdAt.toISOString();
  if (
    booking.status === BOOKING_STATUS.WAITING_PAYMENT ||
    booking.status === BOOKING_STATUS.WAIT_PROOF ||
    booking.paymentStatus === "PENDING"
  ) {
    pushUnique(events, {
      id: "payment-pending",
      kind: "PAYMENT_PENDING",
      at: payPendingAt,
      labelKey: "bookingRoom.timeline.paymentPending"
    });
  }

  for (const log of logs) {
    if (log.type === "BOOKING_CREATED") continue;
    if (log.type === "BOOKING_EXPIRED") {
      pushUnique(events, {
        id: `log-${log.id}`,
        kind: "EXPIRED",
        at: log.createdAt.toISOString(),
        labelKey: "bookingRoom.timeline.expired"
      });
    }
    if (log.type === "PAYMENT_PROOF_SUBMITTED" || log.type === "PAYMENT_REVIEW_TIMED_OUT") {
      pushUnique(events, {
        id: `log-${log.id}`,
        kind: log.type === "PAYMENT_REVIEW_TIMED_OUT" ? "REJECTED" : "PROOF_SUBMITTED",
        at: log.createdAt.toISOString(),
        labelKey:
          log.type === "PAYMENT_REVIEW_TIMED_OUT"
            ? "bookingRoom.timeline.rejected"
            : "bookingRoom.timeline.proofSubmitted"
      });
    }
    if (log.type === "PAYMENT_CONFIRMED") {
      pushUnique(events, {
        id: `log-${log.id}`,
        kind: "CONFIRMED",
        at: log.createdAt.toISOString(),
        labelKey: "bookingRoom.timeline.confirmed"
      });
    }
    if (log.type === "PAYMENT_PROOF_REJECTED") {
      let detail: string | undefined;
      try {
        const p = JSON.parse(log.payload ?? "{}") as { reason?: string };
        if (p.reason?.trim()) detail = p.reason.trim();
      } catch {
        /* ignore */
      }
      pushUnique(events, {
        id: `log-${log.id}`,
        kind: "REJECTED",
        at: log.createdAt.toISOString(),
        labelKey: "bookingRoom.timeline.rejected",
        detail
      });
    }
  }

  if (booking.proofSubmittedAt) {
    pushUnique(events, {
      id: "proof-submitted",
      kind: "PROOF_SUBMITTED",
      at: booking.proofSubmittedAt.toISOString(),
      labelKey: "bookingRoom.timeline.proofSubmitted"
    });
  }

  if (booking.status === BOOKING_STATUS.ON_REVIEW) {
    pushUnique(events, {
      id: "on-review",
      kind: "ON_REVIEW",
      at: (booking.proofSubmittedAt ?? booking.createdAt).toISOString(),
      labelKey: "bookingRoom.timeline.onReview"
    });
  }

  if (booking.status === BOOKING_STATUS.CONFIRMED || booking.paymentStatus === "PAID") {
    pushUnique(events, {
      id: "confirmed",
      kind: "CONFIRMED",
      at: (booking.proofReviewedAt ?? booking.proofSubmittedAt ?? booking.createdAt).toISOString(),
      labelKey: "bookingRoom.timeline.confirmed"
    });
  }

  if (booking.status === BOOKING_STATUS.CHECKED_IN) {
    pushUnique(events, {
      id: "checked-in",
      kind: "CHECKED_IN",
      at: booking.checkIn.toISOString(),
      labelKey: "bookingRoom.timeline.checkedIn"
    });
  }

  if (booking.status === BOOKING_STATUS.COMPLETED) {
    pushUnique(events, {
      id: "completed",
      kind: "COMPLETED",
      at: booking.checkOut.toISOString(),
      labelKey: "bookingRoom.timeline.completed"
    });
  }

  if (booking.status === BOOKING_STATUS.REJECTED) {
    pushUnique(events, {
      id: "rejected",
      kind: "REJECTED",
      at: (booking.proofReviewedAt ?? booking.proofSubmittedAt ?? booking.createdAt).toISOString(),
      labelKey: "bookingRoom.timeline.rejected"
    });
  }

  if (booking.status === BOOKING_STATUS.CANCELLED || booking.status === "CANCELLED_BY_GUEST") {
    pushUnique(events, {
      id: "cancelled",
      kind: "CANCELLED",
      at: booking.createdAt.toISOString(),
      labelKey: "bookingRoom.timeline.cancelled"
    });
  }

  if (booking.status === BOOKING_STATUS.EXPIRED) {
    pushUnique(events, {
      id: "expired",
      kind: "EXPIRED",
      at: booking.createdAt.toISOString(),
      labelKey: "bookingRoom.timeline.expired"
    });
  }

  for (const msg of systemMessages) {
    pushUnique(events, {
      id: `sys-${msg.id}`,
      kind: "SYSTEM",
      at: msg.createdAt.toISOString(),
      labelKey: "bookingRoom.timeline.system",
      detail: msg.body.replace(/^🛡️\s*/, "").trim()
    });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
