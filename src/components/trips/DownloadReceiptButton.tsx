"use client";

export function DownloadReceiptButton({
  bookingId,
  label = "📄 Квитанция",
  className = "btn-secondary text-sm !w-auto !px-3 !py-1.5"
}: {
  bookingId: number;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={`/api/bookings/${bookingId}/receipt`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {label}
    </a>
  );
}
