import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { getBookingGuestLabel, OFFLINE_STATUS } from "@/lib/domain/booking";
import { formatDateTimeShort } from "@/lib/i18n/format";
import { StatusBadge } from "@/components/ui/StatusBadge";

type OfflineBookingRow = {
  id: number;
  publicCode: string | null;
  checkIn: Date;
  checkOut: Date;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  guestCount: number;
  offlineStatus: string | null;
  totalPrice: unknown;
  prepayment: unknown;
  remainingAmount: unknown;
  offlinePaymentType: string | null;
  offlineNote: string | null;
  room?: { title: string; hotel: { name: string } } | null;
  roomType?: { name: string; hotel: { name: string } } | null;
  assignedRoom?: { title: string; roomNumber?: string | null } | null;
  user?: { name: string | null; phone: string | null } | null;
};

export function OfflineBookingsList({ locale, bookings }: { locale: Locale; bookings: OfflineBookingRow[] }) {
  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 text-sm shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{getBookingGuestLabel(b)}</span>
            <StatusBadge variant="neutral">{m(locale, "owner.bookingBadge.offline")}</StatusBadge>
            {b.offlineStatus ? (
              <StatusBadge variant="success">{m(locale, `owner.offline.status.${b.offlineStatus}`)}</StatusBadge>
            ) : null}
            {b.publicCode ? <span className="text-xs text-slate-500">{b.publicCode}</span> : null}
          </div>
          <div className="mt-2 text-slate-600">
            {b.room?.hotel?.name ?? b.roomType?.hotel?.name ?? "—"} ·{" "}
            {b.assignedRoom?.roomNumber ?? b.room?.title ?? b.roomType?.name ?? "—"} · {b.checkIn.toISOString().slice(0, 10)} —{" "}
            {b.checkOut.toISOString().slice(0, 10)} · {b.guestPhone}
          </div>
          <div className="mt-1 text-slate-500">
            {Number(b.totalPrice)} TJS · {m(locale, "owner.offline.prepayment")}: {Number(b.prepayment ?? 0)} ·{" "}
            {m(locale, "owner.offline.remaining")}: {Number(b.remainingAmount ?? 0)}
          </div>
          <form action={`/api/owner/offline-bookings/${b.id}`} method="post" className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">{m(locale, "owner.offline.statusLabel")}</label>
              <select name="offlineStatus" defaultValue={b.offlineStatus ?? OFFLINE_STATUS.CONFIRMED} className="rounded-lg border px-2 py-1.5 text-sm">
                {Object.values(OFFLINE_STATUS).map((s) => (
                  <option key={s} value={s}>
                    {m(locale, `owner.offline.status.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="rounded-lg bg-emerald-700 px-3 py-1.5 text-white">
              {m(locale, "owner.offline.saveStatus")}
            </button>
          </form>
          <div className="mt-1 text-xs text-slate-400">{formatDateTimeShort(locale, b.checkIn)}</div>
        </div>
      ))}
    </div>
  );
}

