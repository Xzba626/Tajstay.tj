import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { OFFLINE_STATUS } from "@/lib/domain/booking";
import { formatDateTimeShort } from "@/lib/i18n/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { OfflineBookingOwnerView } from "@/lib/pms/offlinePrivacy";

type Props = {
  locale: Locale;
  bookings: OfflineBookingOwnerView[];
  canViewPii: boolean;
  canViewFinances: boolean;
  canEditStatus: boolean;
  apiBase?: string;
};

export function OfflineBookingsList({
  locale,
  bookings,
  canViewPii,
  canViewFinances,
  canEditStatus,
  apiBase = "/api/owner"
}: Props) {
  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b.id} className="offline-booking-card">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">{b.guestName ?? "—"}</span>
            <StatusBadge variant="neutral">{m(locale, "owner.bookingBadge.offline")}</StatusBadge>
            {b.offlineStatus ? (
              <StatusBadge variant="success">{m(locale, `owner.offline.status.${b.offlineStatus}`)}</StatusBadge>
            ) : null}
            {b.publicCode ? <span className="text-xs text-white/45">{b.publicCode}</span> : null}
          </div>

          <p className="mt-2 text-sm text-white/65">
            {b.hotelName ?? "—"} · {b.roomTypeName ?? "—"}
            {b.roomLabel ? ` · ${m(locale, "owner.offline.roomNo")} ${b.roomLabel}` : ""}
          </p>
          <p className="text-sm text-white/55">
            {b.checkIn.toISOString().slice(0, 10)} — {b.checkOut.toISOString().slice(0, 10)} · {b.guestCount}{" "}
            {m(locale, "owner.offline.guestsShort")}
          </p>

          {canViewPii && b.guestPhone ? (
            <p className="mt-1 text-sm text-white/50">{b.guestPhone}</p>
          ) : !canViewPii ? (
            <p className="mt-2 text-xs text-amber-200/80">{m(locale, "owner.offline.staffPiiNotice")}</p>
          ) : null}

          {canViewFinances ? (
            <p className="mt-1 text-sm text-white/50">
              {b.totalPrice ?? 0} TJS · {m(locale, "owner.offline.prepayment")}: {b.prepayment ?? 0} ·{" "}
              {m(locale, "owner.offline.remaining")}: {b.remainingAmount ?? 0}
            </p>
          ) : null}

          {canViewPii && b.guestDocumentUrl ? (
            <a
              href={b.guestDocumentUrl}
              className="mt-2 inline-block text-sm font-semibold text-[#f5a623] underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              {m(locale, "owner.offline.openDocument")}
            </a>
          ) : null}

          {canEditStatus ? (
            <form action={`${apiBase}/offline-bookings/${b.id}`} method="post" className="mt-3 flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/55">{m(locale, "owner.offline.statusLabel")}</label>
                <select
                  name="offlineStatus"
                  defaultValue={b.offlineStatus ?? OFFLINE_STATUS.CONFIRMED}
                  className="offline-booking-card__select"
                >
                  {Object.values(OFFLINE_STATUS).map((s) => (
                    <option key={s} value={s}>
                      {m(locale, `owner.offline.status.${s}`)}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="offline-booking-card__btn">
                {m(locale, "owner.offline.saveStatus")}
              </button>
            </form>
          ) : null}

          <div className="mt-1 text-xs text-white/35">{formatDateTimeShort(locale, b.checkIn)}</div>
        </div>
      ))}
    </div>
  );
}
