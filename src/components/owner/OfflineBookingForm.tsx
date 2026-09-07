"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { OFFLINE_STATUS } from "@/lib/domain/booking";

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
  defaultCheckOut
}: {
  locale: Locale;
  roomTypes: RoomTypeOption[];
  rooms: RoomOption[];
  error?: string;
  created?: boolean;
  defaultRoomId?: number;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
}) {
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

  return (
    <form action="/api/owner/offline-bookings" method="post" className="owner-form owner-form--grid-2 owner-panel">
      {created ? (
        <div className="owner-status-banner owner-status-banner--success md:col-span-2" role="status">
          {m(locale, "owner.offline.created")}
        </div>
      ) : null}
      {error === "dates" ? (
        <div className="owner-status-banner owner-status-banner--warning md:col-span-2" role="alert">
          {m(locale, "owner.offline.errDates")}
        </div>
      ) : null}
      {error && error !== "dates" ? (
        <div className="owner-status-banner owner-status-banner--danger md:col-span-2" role="alert">
          {m(locale, "owner.offline.errFailed")}
        </div>
      ) : null}

      <div className="md:col-span-2">
        <label className="owner-field__label">{m(locale, "owner.pms.category")}</label>
        <select
          name="roomTypeId"
          required
          value={roomTypeId}
          onChange={(e) => setRoomTypeId(Number(e.target.value))}
          className="owner-select"
        >
          {roomTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>
              {rt.hotel.name} · {rt.name}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="owner-field__label">{m(locale, "owner.offline.room")}</label>
        <select name="roomId" defaultValue={defaultRoomId ?? ""} className="owner-select">
          <option value="">{m(locale, "owner.pms.unassigned")}</option>
          {roomsForType.map((r) => (
            <option key={r.id} value={r.id}>
              {r.roomNumber ? `${r.roomNumber} · ` : ""}
              {r.title}
            </option>
          ))}
        </select>
        <p className="owner-field__hint">{m(locale, "owner.pms.unassigned")} — можно назначить позже.</p>
      </div>

      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.guestName")}</label>
        <input name="guestName" required className="owner-input" />
      </div>
      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.guestPhone")}</label>
        <input name="guestPhone" required className="owner-input" />
      </div>
      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.guestEmail")}</label>
        <input name="guestEmail" type="email" className="owner-input" />
      </div>
      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.guestCount")}</label>
        <input name="guestCount" type="number" min={1} defaultValue={1} className="owner-input" />
      </div>

      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.checkIn")}</label>
        <input name="checkIn" type="date" required defaultValue={defaultCheckIn} className="owner-input" />
      </div>
      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.checkOut")}</label>
        <input name="checkOut" type="date" required defaultValue={defaultCheckOut} className="owner-input" />
      </div>

      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.total")}</label>
        <input name="totalPrice" type="number" min={0} step={1} required className="owner-input" />
      </div>
      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.prepayment")}</label>
        <input name="prepayment" type="number" min={0} step={1} className="owner-input" />
      </div>

      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.paymentType")}</label>
        <input
          name="offlinePaymentType"
          placeholder={m(locale, "owner.offline.paymentTypePh")}
          className="owner-input"
        />
      </div>
      <div>
        <label className="owner-field__label">{m(locale, "owner.offline.statusLabel")}</label>
        <select name="offlineStatus" defaultValue={OFFLINE_STATUS.CONFIRMED} className="owner-select">
          {Object.values(OFFLINE_STATUS).map((s) => (
            <option key={s} value={s}>
              {m(locale, `owner.offline.status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="owner-field__label">{m(locale, "owner.offline.note")}</label>
        <textarea name="offlineNote" rows={2} className="owner-textarea" />
      </div>

      <div className="md:col-span-2">
        <button type="submit" className="owner-btn owner-btn--primary">
          {m(locale, "owner.offline.submit")}
        </button>
      </div>
    </form>
  );
}
