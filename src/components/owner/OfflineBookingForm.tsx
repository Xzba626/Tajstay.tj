"use client";

import { useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { OFFLINE_STATUS } from "@/lib/domain/booking";
import { SensitiveActionConfirmDialog } from "@/components/ui/SensitiveActionConfirmDialog";

type RoomTypeOption = { id: number; name: string; hotel: { name: string } };
type RoomOption = {
  id: number;
  title: string;
  roomNumber?: string | null;
  roomTypeId?: number | null;
  hotel: { name: string };
};

export function OfflineBookingForm({
  locale,
  roomTypes,
  rooms,
  error,
  created,
  defaultRoomId,
  defaultCheckIn,
  defaultCheckOut,
  variant = "full",
  apiBase = "/api/owner"
}: {
  locale: Locale;
  roomTypes: RoomTypeOption[];
  rooms: RoomOption[];
  error?: string;
  created?: boolean;
  defaultRoomId?: number;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  /** full = owner archive; staff = reception walk-in (name, phone, dates, room — no finances) */
  variant?: "full" | "staff";
  apiBase?: string;
}) {
  const isStaff = variant === "staff";
  const formRef = useRef<HTMLFormElement>(null);
  const skipConfirmRef = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const defaultTypeId = useMemo(() => {
    if (!defaultRoomId) return roomTypes[0]?.id ?? 0;
    return rooms.find((r) => r.id === defaultRoomId)?.roomTypeId ?? roomTypes[0]?.id ?? 0;
  }, [defaultRoomId, roomTypes, rooms]);

  const [roomTypeId, setRoomTypeId] = useState(defaultTypeId);

  const roomsForType = useMemo(
    () => rooms.filter((r) => !roomTypeId || r.roomTypeId === roomTypeId),
    [rooms, roomTypeId]
  );

  if (!roomTypes.length) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!isStaff || skipConfirmRef.current) {
      skipConfirmRef.current = false;
      return;
    }
    e.preventDefault();
    setConfirmOpen(true);
  }

  function submitAfterConfirm() {
    setConfirmOpen(false);
    skipConfirmRef.current = true;
    formRef.current?.requestSubmit();
  }

  return (
    <>
    <form
      ref={formRef}
      action={`${apiBase}/offline-bookings`}
      method="post"
      onSubmit={handleSubmit}
      className="offline-booking-form grid gap-3 md:grid-cols-2"
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
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.pms.category")}</label>
        <select
          name="roomTypeId"
          required
          value={roomTypeId}
          onChange={(e) => setRoomTypeId(Number(e.target.value))}
          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
        >
          {roomTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>
              {rt.hotel.name} · {rt.name}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.room")}</label>
        <select name="roomId" defaultValue={defaultRoomId ?? ""} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
          <option value="">{m(locale, "owner.pms.unassigned")}</option>
          {roomsForType.map((r) => (
            <option key={r.id} value={r.id}>
              {r.roomNumber ? `${r.roomNumber} · ` : ""}
              {r.title}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">{m(locale, "owner.pms.unassigned")} — можно назначить позже.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.guestName")}</label>
        <input name="guestName" required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.guestPhone")}</label>
        <input
          name="guestPhone"
          required
          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
          placeholder={isStaff ? "+992…" : undefined}
        />
      </div>
      {!isStaff ? (
        <div>
          <label className="mb-1 block text-sm font-semibold">{m(locale, "owner.offline.guestEmail")}</label>
          <input name="guestEmail" type="email" className="offline-booking-form__input" />
        </div>
      ) : null}
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.guestCount")}</label>
        <input name="guestCount" type="number" min={1} defaultValue={1} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.checkIn")}</label>
        <input
          name="checkIn"
          type="date"
          required
          defaultValue={defaultCheckIn}
          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.checkOut")}</label>
        <input
          name="checkOut"
          type="date"
          required
          defaultValue={defaultCheckOut}
          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
        />
      </div>

      {!isStaff ? (
        <>
          <div>
            <label className="mb-1 block text-sm font-semibold">{m(locale, "owner.offline.total")}</label>
            <input name="totalPrice" type="number" min={0} step={1} required className="offline-booking-form__input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">{m(locale, "owner.offline.prepayment")}</label>
            <input name="prepayment" type="number" min={0} step={1} className="offline-booking-form__input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">{m(locale, "owner.offline.paymentType")}</label>
            <input
              name="offlinePaymentType"
              placeholder={m(locale, "owner.offline.paymentTypePh")}
              className="offline-booking-form__input"
            />
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="totalPrice" value="0" />
          <input type="hidden" name="offlineStatus" value={OFFLINE_STATUS.CONFIRMED} />
        </>
      )}
      {!isStaff ? (
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
      ) : null}

      {!isStaff ? (
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-semibold text-slate-800">{m(locale, "owner.offline.note")}</label>
        <textarea name="offlineNote" rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      ) : null}

      <div className="md:col-span-2">
        <button type="submit" className="h-11 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-600">
          {m(locale, "owner.offline.submit")}
        </button>
      </div>
    </form>
    {isStaff ? (
      <SensitiveActionConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submitAfterConfirm}
        locale={locale}
        title={m(locale, "confirmDialog.offlineBookingTitle")}
        description={m(locale, "confirmDialog.offlineBookingDesc")}
        confirmLabel={m(locale, "owner.offline.submit")}
      />
    ) : null}
    </>
  );
}
