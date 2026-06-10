import { safeSend } from "@/lib/email/safeSend";

export async function sendBookingConfirmedEmail(input: {
  guestEmail: string | null | undefined;
  guestName: string;
  hotelName: string;
  checkIn: Date;
  checkOut: Date;
  publicCode: string | null;
}) {
  if (!input.guestEmail?.trim()) return { ok: true, skipped: true };

  const code = input.publicCode ?? "—";
  const dates = `${input.checkIn.toISOString().slice(0, 10)} – ${input.checkOut.toISOString().slice(0, 10)}`;

  return safeSend({
    to: input.guestEmail,
    subject: "TajStay: бронирование подтверждено",
    html: `
      <h2>Бронирование подтверждено</h2>
      <p>Здравствуйте, ${input.guestName}!</p>
      <p>Хозяин подтвердил получение оплаты по брони <strong>${code}</strong>.</p>
      <p><strong>${input.hotelName}</strong><br/>${dates}</p>
      <p>Приятного пребывания!</p>
    `
  });
}
