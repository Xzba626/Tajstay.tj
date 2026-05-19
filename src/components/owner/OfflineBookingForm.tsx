import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { OFFLINE_STATUS } from "@/lib/domain/booking";

type RoomOption = {
  id: number;
  title: string;
  hotel: { name: string };
};

export function OfflineBookingForm({
  locale,
  rooms,
  error,
  created
}: {
  locale: Locale;
  rooms: RoomOption[];
  error?: string;
  created?: boolean;
}) {
  if (!rooms.length) return null;

  return (
    <form
      action="/api/owner/offline-bookings"
      method="post"
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2"
    >
      {created ? (
        <div className="md:col-span-2 rounded-xl border border-emerald-300/40 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {m(locale, "owner.offline.created")}
        </div>
      ) : null}
      {error === "dates" ? (
        <div className="md:col-span-2 rounded-xl border border-amber-300/40 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          {m(locale, "owner.offline.errDates")}
        </div>
      ) : null}
      {error && error !== "dates" ? (
        <div className="md:col-span-2 rounded-xl border border-red-300/40 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {m(locale, "owner.offline.errFailed")}
        </div>
      ) : null}

      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.room")}</label>
        <select name="roomId" required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.hotel.name} · {r.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.guestName")}</label>
        <input name="guestName" required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.guestPhone")}</label>
        <input name="guestPhone" required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.guestEmail")}</label>
        <input name="guestEmail" type="email" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.guestCount")}</label>
        <input name="guestCount" type="number" min={1} defaultValue={1} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.checkIn")}</label>
        <input name="checkIn" type="date" required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.checkOut")}</label>
        <input name="checkOut" type="date" required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.total")}</label>
        <input name="totalPrice" type="number" min={0} step={1} required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.prepayment")}</label>
        <input name="prepayment" type="number" min={0} step={1} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.paymentType")}</label>
        <input name="offlinePaymentType" placeholder={m(locale, "owner.offline.paymentTypePh")} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.statusLabel")}</label>
        <select name="offlineStatus" defaultValue={OFFLINE_STATUS.CONFIRMED} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
          {Object.values(OFFLINE_STATUS).map((s) => (
            <option key={s} value={s}>
              {m(locale, `owner.offline.status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.note")}</label>
        <textarea name="offlineNote" rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>

      <div className="md:col-span-2">
        <button type="submit" className="h-11 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-600">
          {m(locale, "owner.offline.submit")}
        </button>
      </div>
    </form>
  );
}




