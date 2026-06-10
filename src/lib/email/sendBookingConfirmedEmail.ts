import { safeSend } from "@/lib/email/safeSend";
import { paymentConfirmedEmailSubject, renderPaymentConfirmedEmail } from "@/lib/email/templates";

export async function sendBookingConfirmedEmail(input: {
  guestEmail: string | null | undefined;
  guestName: string;
  hotelName: string;
  checkIn: Date;
  checkOut: Date;
  publicCode: string | null;
  dashboardUrl?: string;
}) {
  if (!input.guestEmail?.trim()) return { ok: true, skipped: true };

  return safeSend({
    to: input.guestEmail,
    subject: paymentConfirmedEmailSubject(input.publicCode),
    html: renderPaymentConfirmedEmail({
      guestName: input.guestName,
      hotelName: input.hotelName,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      publicCode: input.publicCode,
      dashboardUrl: input.dashboardUrl
    })
  });
}
