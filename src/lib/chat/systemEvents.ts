import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { prisma } from "@/lib/prisma";

/**
 * BLOCK 5.6D — semantic system-event architecture for `ChatMessage`.
 *
 * Every SYSTEM-role chat message should be written through `addBookingSystemEvent()`, not by
 * hand-composing Russian prose. The stored row keeps a legacy-compatible `body` (plain text,
 * exactly like every pre-existing row) **and** a structured `eventType` + `eventPayload` — the
 * live chat/admin views render from the structured fields when present, in the *viewer's*
 * locale, and fall back to the stored `body` for legacy rows or anything malformed/unrecognized.
 * Nothing here changes existing rows or removes `body` — this is purely additive.
 */

export type SystemEventType =
  | "booking.welcome"
  | "proof.received"
  | "payment.confirmed"
  | "proof.rejected"
  | "proof.submitted"
  | "booking.cancelled_by_guest"
  | "arrival_payment.confirmed"
  | "checkin.confirmed"
  | "booking.expired"
  | "proof.review_expired"
  | "booking.cancelled_by_admin";

type PayloadMap = {
  "booking.welcome": { variant: "pay_now" | "pay_at_checkin"; payMin?: number; reviewMin?: number };
  "proof.received": { reviewMinutes: number };
  "payment.confirmed": { byRole: "ADMIN" | "OWNER" };
  "proof.rejected": { reason: string };
  "proof.submitted": Record<string, never>;
  "booking.cancelled_by_guest": Record<string, never>;
  "arrival_payment.confirmed": Record<string, never>;
  // BLOCK 5.6D §12: checkin.confirmed is ONLY ever reachable for Pay Now bookings — the sibling
  // owner/bookings/[id]/check-in route explicitly rejects `payOnArrival` bookings (they must go
  // through confirm-arrival-payment instead, which fires arrival_payment.confirmed, a distinct
  // event with no escrow claim). No `paymentModel` field is needed: there is only one call site
  // and it is proven Pay-Now-only by that guard, not assumed.
  "checkin.confirmed": Record<string, never>;
  "booking.expired": Record<string, never>;
  "proof.review_expired": Record<string, never>;
  "booking.cancelled_by_admin": Record<string, never>;
};

const MAX_PAYLOAD_BYTES = 2000;

/** Bounded, centralized JSON serialization — callers never hand-serialize their own payload. */
function serializePayload(payload: unknown): string {
  const json = JSON.stringify(payload ?? {});
  return json.length > MAX_PAYLOAD_BYTES ? json.slice(0, MAX_PAYLOAD_BYTES) : json;
}

/** RU fallback `body` text — used only as the legacy-compatible plain-text representation stored
 * alongside every new event (never as the live-render path; see `renderSystemEvent` for that). */
function fallbackBodyRu<T extends SystemEventType>(eventType: T, payload: PayloadMap[T]): string {
  switch (eventType) {
    case "booking.welcome": {
      const p = payload as PayloadMap["booking.welcome"];
      if (p.variant === "pay_at_checkin") {
        return "🛡️ Система: Ассалому алейкум! Бронирование подтверждено. Предварительная оплата не требуется — оплатите непосредственно в отеле при заселении.";
      }
      return `🛡️ Система: Ассалому алейкум! Пожалуйста, отправьте чек об оплате в течение ${p.payMin ?? 20} минут. Как только вы прикрепите файл в чате или на странице оплаты, откроется ${p.reviewMin ?? 5} минут на проверку владельцем и администратором. Если не успеваете — напишите нам здесь.`;
    }
    case "proof.received": {
      const p = payload as PayloadMap["proof.received"];
      return `🛡️ Система: Чек получен. Отведено ${p.reviewMinutes} минут на проверку администратором и владельцем.`;
    }
    case "payment.confirmed": {
      const p = payload as PayloadMap["payment.confirmed"];
      return p.byRole === "ADMIN"
        ? "🛡️ Система: Администратор подтвердил оплату (проверка спора)."
        : "🛡️ Система: Бронирование подтверждено! Ждем вас.";
    }
    case "proof.rejected": {
      const p = payload as PayloadMap["proof.rejected"];
      return `🛡️ Система: Чек отклонён. ${p.reason} Пожалуйста, отправьте новый чек.`;
    }
    case "proof.submitted":
      return "🛡️ Система: Чек отправлен. Ожидается проверка владельца и администратором.";
    case "booking.cancelled_by_guest":
      return "🛡️ Система: Бронирование отменено пользователем. Сессия закрыта.";
    case "arrival_payment.confirmed":
      return "🛡️ Система: Оплата при заселении подтверждена. Гость заселён.";
    case "checkin.confirmed":
      return "🛡️ Система: Владелец подтвердил заселение. Средства заморожены до завершения.";
    case "booking.expired":
      return "🛡️ Система: Бронь отменена по истечении 15 минут. Чат закрыт.";
    case "proof.review_expired":
      return "🛡️ Система: Время проверки чека истекло. Оплата отклонена.";
    case "booking.cancelled_by_admin":
      return "🛡️ Система: Бронирование отменено администратором.";
    default:
      return "🛡️ Система.";
  }
}

/** The one writer every SYSTEM ChatMessage should go through from now on. */
export async function addBookingSystemEvent<T extends SystemEventType>(input: {
  bookingId: number;
  eventType: T;
  payload: PayloadMap[T];
}): Promise<void> {
  const body = fallbackBodyRu(input.eventType, input.payload);
  await prisma.chatMessage.create({
    data: {
      bookingId: input.bookingId,
      senderId: 0,
      senderRole: "SYSTEM",
      senderName: "System",
      body,
      imageUrl: null,
      isArchived: false,
      deletedAt: null,
      eventType: input.eventType,
      eventPayload: serializePayload(input.payload)
    }
  });
}

/**
 * Render a stored SYSTEM message in the VIEWER's locale. Falls back to the legacy `body` for:
 * legacy rows (`eventType` null), an unrecognized `eventType` (forward-compat with older clients
 * reading a newer event type), or a payload that fails to parse — never crashes, never renders
 * empty.
 */
export function renderSystemEvent(
  locale: Locale,
  row: { eventType: string | null; eventPayload: string | null; body: string }
): string {
  if (!row.eventType) return row.body;

  let payload: Record<string, unknown>;
  try {
    payload = row.eventPayload ? (JSON.parse(row.eventPayload) as Record<string, unknown>) : {};
  } catch {
    return row.body;
  }

  switch (row.eventType as SystemEventType) {
    case "booking.welcome": {
      if (payload.variant === "pay_at_checkin") return m(locale, "chat.systemEvent.bookingWelcomePayAtCheckIn");
      const payMin = typeof payload.payMin === "number" ? payload.payMin : 20;
      const reviewMin = typeof payload.reviewMin === "number" ? payload.reviewMin : 5;
      return m(locale, "chat.systemEvent.bookingWelcomePayNow")
        .replace(/\{payMin\}/g, String(payMin))
        .replace(/\{reviewMin\}/g, String(reviewMin));
    }
    case "proof.received": {
      const reviewMinutes = typeof payload.reviewMinutes === "number" ? payload.reviewMinutes : 5;
      return m(locale, "chat.systemEvent.proofReceived").replace(/\{reviewMinutes\}/g, String(reviewMinutes));
    }
    case "payment.confirmed":
      return payload.byRole === "ADMIN"
        ? m(locale, "chat.systemEvent.paymentConfirmedAdmin")
        : m(locale, "chat.systemEvent.paymentConfirmedOwner");
    case "proof.rejected": {
      const reason = typeof payload.reason === "string" ? payload.reason : "";
      return m(locale, "chat.systemEvent.proofRejected").replace(/\{reason\}/g, reason);
    }
    case "proof.submitted":
      return m(locale, "chat.systemEvent.proofSubmitted");
    case "booking.cancelled_by_guest":
      return m(locale, "chat.systemEvent.bookingCancelledByGuest");
    case "arrival_payment.confirmed":
      return m(locale, "chat.systemEvent.arrivalPaymentConfirmed");
    case "checkin.confirmed":
      return m(locale, "chat.systemEvent.checkinConfirmed");
    case "booking.expired":
      return m(locale, "chat.systemEvent.bookingExpired");
    case "proof.review_expired":
      return m(locale, "chat.systemEvent.proofReviewExpired");
    case "booking.cancelled_by_admin":
      return m(locale, "chat.systemEvent.bookingCancelledByAdmin");
    default:
      return row.body;
  }
}
