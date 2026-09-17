/**
 * Booking confirmation / receipt outbound delivery (Email via Resend + Telegram Bot).
 *
 * Root cause (MASTER FINAL): CONFIRMED transitions only wrote in-app Notification rows.
 * Resend was used for password-reset only; Telegram Bot only for login OTP — never receipts.
 *
 * Delivery is best-effort AFTER the booking transaction commits. Failures are recorded and
 * never roll back a valid confirmation. Idempotent per (bookingId, eventKey, channel).
 */
import { prisma } from "@/lib/prisma";
import { getResendClient } from "@/lib/email/resend";
import { getEmailFrom } from "@/lib/email/from";
import { sendTelegramMessage } from "@/lib/telegram/api";
import { getTelegramBotToken } from "@/lib/telegram/config";
import { formatMoney, formatStayDateRange } from "@/lib/i18n/format";
import { normalizeLocale, type Locale } from "@/lib/i18n/locale";
import { bookingHotel } from "@/lib/pms/bookingContext";

export type BookingConfirmationEventKey =
  | "booking.confirmed.payment_captured"
  | "booking.confirmed.pay_on_arrival";

export type ChannelDeliveryState =
  | "not_attempted"
  | "skipped_no_recipient"
  | "skipped_not_configured"
  | "sent"
  | "failed"
  | "already_sent";

export type BookingConfirmationDeliveryResult = {
  bookingId: number;
  eventKey: BookingConfirmationEventKey;
  email: ChannelDeliveryState;
  telegram: ChannelDeliveryState;
  emailError?: string;
  telegramError?: string;
  emailTo?: string | null;
  telegramChatId?: string | null;
};

const LOG_EMAIL = "BOOKING_RECEIPT_EMAIL";
const LOG_TELEGRAM = "BOOKING_RECEIPT_TELEGRAM";

function siteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function copy(locale: Locale, paid: boolean) {
  if (locale === "en") {
    return {
      subject: paid ? "TajStay — booking confirmed" : "TajStay — booking reserved (pay at property)",
      heading: paid ? "Your booking is confirmed" : "Your booking is reserved",
      paymentLine: paid
        ? "Payment status: paid."
        : "Payment status: pay at the property on arrival (not paid yet).",
      open: "Open booking",
      thanks: "Thank you for choosing TajStay."
    };
  }
  if (locale === "tg") {
    return {
      subject: paid ? "TajStay — брон тасдиқ шуд" : "TajStay — брон захира шуд (пардохт дар ҷой)",
      heading: paid ? "Брони шумо тасдиқ шуд" : "Брони шумо захира шуд",
      paymentLine: paid
        ? "Ҳолати пардохт: пардохтшуда."
        : "Ҳолати пардохт: ҳангоми ҷойгиршавӣ дар объект (ҳанӯз пардохт нашудааст).",
      open: "Кушодани брон",
      thanks: "Барои интихоби TajStay ташаккур."
    };
  }
  return {
    subject: paid ? "TajStay — бронирование подтверждено" : "TajStay — бронь зарезервирована (оплата на месте)",
    heading: paid ? "Ваше бронирование подтверждено" : "Ваша бронь зарезервирована",
    paymentLine: paid
      ? "Статус оплаты: оплачено."
      : "Статус оплаты: оплата при заселении (пока не оплачено).",
    open: "Открыть бронь",
    thanks: "Спасибо, что выбрали TajStay."
  };
}

async function alreadyDelivered(bookingId: number, eventKey: string, logType: string): Promise<boolean> {
  const rows = await prisma.transactionLog.findMany({
    where: { bookingId, type: logType },
    orderBy: { id: "desc" },
    take: 20
  });
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload || "{}") as { eventKey?: string; state?: string };
      if (payload.eventKey === eventKey && payload.state === "sent") return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

async function recordAttempt(
  bookingId: number,
  logType: string,
  payload: Record<string, unknown>
): Promise<void> {
  await prisma.transactionLog.create({
    data: {
      bookingId,
      type: logType,
      payload: JSON.stringify({ ...payload, at: new Date().toISOString() })
    }
  });
}

function buildBodies(input: {
  locale: Locale;
  paid: boolean;
  hotelName: string;
  categoryName: string;
  publicCode: string;
  checkIn: Date;
  checkOut: Date;
  total: number;
  currency: string;
  bookingUrl: string;
}) {
  const L = copy(input.locale, input.paid);
  const dates = formatStayDateRange(input.locale, input.checkIn, input.checkOut);
  const money = formatMoney(input.locale, input.total, input.currency);
  const lines = [
    L.heading,
    "",
    `${input.hotelName}`,
    input.categoryName,
    dates,
    money,
    L.paymentLine,
    `Code: ${input.publicCode}`,
    "",
    input.bookingUrl,
    "",
    L.thanks
  ];
  const text = lines.join("\n");
  const html = `
<!DOCTYPE html>
<html lang="${input.locale === "tg" ? "tg" : input.locale}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f7f5;font-family:Inter,system-ui,sans-serif;color:#14231b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #d8e5dd;overflow:hidden;">
        <tr><td style="background:#0F7A4D;padding:18px 22px;color:#ffffff;font-weight:800;font-size:18px;">TajStay</td></tr>
        <tr><td style="padding:22px;">
          <h1 style="margin:0 0 12px;font-size:20px;color:#14231b;">${L.heading}</h1>
          <p style="margin:0 0 8px;font-size:15px;"><strong>${escapeHtml(input.hotelName)}</strong></p>
          <p style="margin:0 0 8px;font-size:14px;color:#3d5248;">${escapeHtml(input.categoryName)}</p>
          <p style="margin:0 0 8px;font-size:14px;">${escapeHtml(dates)}</p>
          <p style="margin:0 0 8px;font-size:14px;">${escapeHtml(money)}</p>
          <p style="margin:0 0 8px;font-size:14px;">${escapeHtml(L.paymentLine)}</p>
          <p style="margin:0 0 16px;font-size:14px;">${escapeHtml(input.publicCode)}</p>
          <a href="${input.bookingUrl}" style="display:inline-block;background:#0F7A4D;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:14px;">${L.open}</a>
          <p style="margin:18px 0 0;font-size:13px;color:#5a6f65;">${L.thanks}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject: L.subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Fire-and-forget safe entry: never throws to caller.
 */
export function queueBookingConfirmationDelivery(bookingId: number, eventKey: BookingConfirmationEventKey): void {
  void sendBookingConfirmation(bookingId, eventKey).catch((err) => {
    console.error("[booking-receipt] unhandled", {
      bookingId,
      eventKey,
      error: err instanceof Error ? err.message : String(err)
    });
  });
}

export async function sendBookingConfirmation(
  bookingId: number,
  eventKey: BookingConfirmationEventKey
): Promise<BookingConfirmationDeliveryResult> {
  const result: BookingConfirmationDeliveryResult = {
    bookingId,
    eventKey,
    email: "not_attempted",
    telegram: "not_attempted"
  };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { id: true, email: true, telegramId: true, name: true } },
      room: { include: { hotel: true } },
      roomType: { include: { hotel: true } },
      assignedRoom: { include: { hotel: true } }
    }
  });
  if (!booking) {
    result.email = "failed";
    result.telegram = "failed";
    result.emailError = "booking_not_found";
    return result;
  }

  const hotel = bookingHotel(booking);
  const categoryName =
    booking.roomType?.name ||
    booking.assignedRoom?.roomNumber ||
    booking.room?.roomNumber ||
    "—";
  const publicCode = booking.publicCode || `TS-${booking.id}`;
  const paid =
    eventKey === "booking.confirmed.payment_captured" ||
    booking.paymentStatus === "PAID" ||
    booking.paymentStatus === "CAPTURED";
  const locale = receiptLocale(
    // Prefer explicit booking/guest locale when present; else platform default.
    (booking as { locale?: string | null }).locale ?? null
  );
  const bookingUrl = `${siteOrigin()}/chat/booking/${booking.id}`;
  const total = Number(booking.totalPrice);
  const bodies = buildBodies({
    locale,
    paid,
    hotelName: hotel.name,
    categoryName,
    publicCode,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    total,
    currency: booking.currency || "TJS",
    bookingUrl
  });

  // --- Email ---
  const emailTo = (booking.user?.email || booking.guestEmail || "").trim() || null;
  result.emailTo = emailTo;
  if (await alreadyDelivered(bookingId, eventKey, LOG_EMAIL)) {
    result.email = "already_sent";
  } else if (!emailTo) {
    result.email = "skipped_no_recipient";
    await recordAttempt(bookingId, LOG_EMAIL, { eventKey, state: result.email });
  } else {
    const resend = getResendClient();
    if (!resend) {
      result.email = "skipped_not_configured";
      await recordAttempt(bookingId, LOG_EMAIL, { eventKey, state: result.email, to: emailTo });
    } else {
      try {
        const { data, error } = await resend.emails.send({
          from: getEmailFrom(),
          to: emailTo,
          subject: bodies.subject,
          html: bodies.html,
          text: bodies.text
        });
        if (error) {
          result.email = "failed";
          result.emailError = typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : String(error);
          await recordAttempt(bookingId, LOG_EMAIL, {
            eventKey,
            state: "failed",
            to: emailTo,
            error: result.emailError
          });
        } else {
          result.email = "sent";
          await recordAttempt(bookingId, LOG_EMAIL, {
            eventKey,
            state: "sent",
            to: emailTo,
            providerId: data?.id ?? null
          });
        }
      } catch (err) {
        result.email = "failed";
        result.emailError = err instanceof Error ? err.message : String(err);
        await recordAttempt(bookingId, LOG_EMAIL, {
          eventKey,
          state: "failed",
          to: emailTo,
          error: result.emailError
        });
      }
    }
  }

  // --- Telegram ---
  const chatId = booking.user?.telegramId?.trim() || null;
  result.telegramChatId = chatId;
  if (await alreadyDelivered(bookingId, eventKey, LOG_TELEGRAM)) {
    result.telegram = "already_sent";
  } else if (!chatId) {
    result.telegram = "skipped_no_recipient";
    await recordAttempt(bookingId, LOG_TELEGRAM, { eventKey, state: result.telegram });
  } else if (!getTelegramBotToken()) {
    result.telegram = "skipped_not_configured";
    await recordAttempt(bookingId, LOG_TELEGRAM, { eventKey, state: result.telegram, chatId });
  } else {
    const tgText = bodies.text.replace(/</g, "").replace(/>/g, "");
    const send = await sendTelegramMessage({ chatId, text: tgText });
    if (send.ok) {
      result.telegram = "sent";
      await recordAttempt(bookingId, LOG_TELEGRAM, { eventKey, state: "sent", chatId });
    } else {
      result.telegram = "failed";
      result.telegramError = send.error;
      await recordAttempt(bookingId, LOG_TELEGRAM, {
        eventKey,
        state: "failed",
        chatId,
        error: send.error
      });
    }
  }

  return result;
}

/** Exported for tests — normalize locale helper keep available. */
export function receiptLocale(raw?: string | null): Locale {
  return normalizeLocale(raw);
}
