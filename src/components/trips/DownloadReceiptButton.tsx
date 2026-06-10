"use client";

export function DownloadReceiptButton({ bookingId }: { bookingId: number }) {
  return (
    <a
      href={`/api/bookings/${bookingId}/receipt`}
      target="_blank"
      rel="noreferrer"
      className="mockup-btn mockup-btn--secondary"
    >
      🧾 Квитанция
    </a>
  );
}
