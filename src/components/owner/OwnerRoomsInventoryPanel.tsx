"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { AMENITY_CATEGORIES, CATEGORY_NAME_SUGGESTIONS, amenityLabel } from "@/lib/pms/amenities";
import { AppImage } from "@/components/ui/AppImage";
import { RoomPanoramaViewer } from "@/components/hotel/RoomPanoramaViewer";

type Photo = { id: number; url: string; kind: string; sceneLabel: string | null; sortOrder: number };
type RoomRow = {
  id: number;
  roomNumber: string | null;
  title: string;
  availability: boolean;
  status: string;
  photos: Photo[];
};
type CategoryRow = {
  id: number;
  name: string;
  basePrice: unknown;
  maxGuests: number;
  amenities: string;
  _count: { rooms: number };
  photos: Photo[];
  rooms: RoomRow[];
};

type Props = {
  locale: Locale;
  hotelId: number;
  hotelName: string;
};

type Mode = null | "menu" | "category" | "room" | "edit";

function parseAmenities(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function OwnerRoomsInventoryPanel({ locale, hotelId, hotelName }: Props) {
  const [types, setTypes] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [catName, setCatName] = useState("");
  const [catPrice, setCatPrice] = useState("");
  const [catGuests, setCatGuests] = useState("2");
  const [catAmenities, setCatAmenities] = useState<string[]>([]);
  const [catPhotos, setCatPhotos] = useState<FileList | null>(null);
  const [catPano, setCatPano] = useState<FileList | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [mediaTargetId, setMediaTargetId] = useState<number | null>(null);

  const [roomTypeId, setRoomTypeId] = useState<number | "">("");
  const [roomNumber, setRoomNumber] = useState("");

  const [panoUrl, setPanoUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/room-types?hotelId=${hotelId}`, { credentials: "include" });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as { roomTypes: CategoryRow[] };
      setTypes(json.roomTypes ?? []);
    } catch {
      setError(m(locale, "owner.roomsInv.loadError"));
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, [hotelId, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleAmenity(id: string) {
    setCatAmenities((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set("hotelId", String(hotelId));
      fd.set("name", catName.trim());
      fd.set("basePrice", catPrice);
      fd.set("maxGuests", catGuests);
      fd.set("amenities", JSON.stringify(catAmenities));
      if (catPhotos) {
        Array.from(catPhotos).forEach((f) => fd.append("photos", f));
      }
      if (catPano) {
        Array.from(catPano).forEach((f) => fd.append("panorama", f));
      }
      const res = await fetch("/api/owner/room-types", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) throw new Error("fail");
      setMode(null);
      setCatName("");
      setCatPrice("");
      setCatGuests("2");
      setCatAmenities([]);
      setCatPhotos(null);
      setCatPano(null);
      setMsg(m(locale, "owner.roomsInv.categoryCreated"));
      await load();
    } catch {
      setError(m(locale, "owner.roomsInv.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function saveRoom(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !roomTypeId) return;
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/owner/rooms", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, roomTypeId, roomNumber: roomNumber.trim() })
      });
      if (res.status === 409) {
        setError(m(locale, "owner.roomsInv.duplicateRoom"));
        return;
      }
      if (!res.ok) throw new Error("fail");
      setMode(null);
      setRoomNumber("");
      setMsg(m(locale, "owner.roomsInv.roomCreated"));
      await load();
    } catch {
      setError(m(locale, "owner.roomsInv.saveError"));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(t: CategoryRow) {
    setEditingId(t.id);
    setCatName(t.name);
    setCatPrice(String(Number(t.basePrice)));
    setCatGuests(String(t.maxGuests));
    setCatAmenities(parseAmenities(t.amenities));
    setCatPhotos(null);
    setCatPano(null);
    setMode("edit");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !editingId) return;
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/owner/room-types", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          roomTypeId: editingId,
          action: "update",
          name: catName.trim(),
          basePrice: Number(catPrice),
          maxGuests: Number(catGuests),
          amenities: catAmenities
        })
      });
      if (res.status === 409) {
        setError(m(locale, "owner.roomsInv.capacityConflict"));
        return;
      }
      if (!res.ok) throw new Error("fail");

      if (catPhotos?.length || catPano?.length) {
        const fd = new FormData();
        fd.set("hotelId", String(hotelId));
        fd.set("roomTypeId", String(editingId));
        if (catPhotos) Array.from(catPhotos).forEach((f) => fd.append("photos", f));
        if (catPano) Array.from(catPano).forEach((f) => fd.append("panorama", f));
        const mediaRes = await fetch("/api/owner/room-types", {
          method: "PUT",
          credentials: "include",
          body: fd
        });
        if (!mediaRes.ok) throw new Error("media");
      }

      setMode(null);
      setEditingId(null);
      setMsg(m(locale, "owner.roomsInv.categoryUpdated"));
      await load();
    } catch {
      setError(m(locale, "owner.roomsInv.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function attachMedia(categoryId: number, files: FileList | null, kind: "PHOTO" | "PANO360") {
    if (!files?.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("hotelId", String(hotelId));
      fd.set("roomTypeId", String(categoryId));
      Array.from(files).forEach((f) => fd.append(kind === "PANO360" ? "panorama" : "photos", f));
      const res = await fetch("/api/owner/room-types", { method: "PUT", credentials: "include", body: fd });
      if (!res.ok) throw new Error("fail");
      setMsg(m(locale, "owner.roomsInv.mediaAdded"));
      setMediaTargetId(null);
      await load();
    } catch {
      setError(m(locale, "owner.roomsInv.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function archiveCategory(id: number) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/owner/room-types", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, roomTypeId: id, action: "archive" })
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function archiveRoom(roomId: number) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/rooms/${roomId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" })
      });
      if (!res.ok) throw new Error("fail");
      setMsg(m(locale, "owner.roomsInv.roomArchived"));
      await load();
    } catch {
      setError(m(locale, "owner.roomsInv.saveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="owner-rooms-inv space-y-3">
      <div className="owner-rooms-inv__toolbar">
        <p className="owner-section-lead owner-rooms-inv__hotel">{hotelName}</p>
        <button
          type="button"
          className="owner-btn owner-btn--primary owner-rooms-inv__add"
          onClick={() => setMode(mode === "menu" ? null : "menu")}
          aria-expanded={mode === "menu"}
        >
          {m(locale, "owner.roomsInv.add")}
        </button>
      </div>

      {mode === "menu" ? (
        <div className="owner-rooms-inv__sheet" role="menu">
          <button type="button" role="menuitem" className="owner-rooms-inv__sheet-btn" onClick={() => setMode("category")}>
            {m(locale, "owner.roomsInv.addCategory")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="owner-rooms-inv__sheet-btn"
            onClick={() => setMode("room")}
            disabled={!types.length}
          >
            {m(locale, "owner.roomsInv.addRoom")}
          </button>
        </div>
      ) : null}

      {msg ? <p className="owner-status-banner owner-status-banner--success">{msg}</p> : null}
      {error ? <p className="owner-status-banner owner-status-banner--danger">{error}</p> : null}

      {mode === "category" ? (
        <form onSubmit={saveCategory} className="owner-panel owner-rooms-inv__form space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="owner-panel__title">{m(locale, "owner.roomsInv.addCategory")}</h3>
            <button type="button" className="owner-btn owner-btn--secondary" onClick={() => setMode(null)}>
              {m(locale, "owner.paymentMethods.cancel")}
            </button>
          </div>
          <div>
            <label className="owner-field__label">{m(locale, "owner.roomsInv.categoryName")}</label>
            <input
              className="owner-input"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
              list="owner-category-suggestions"
            />
            <datalist id="owner-category-suggestions">
              {CATEGORY_NAME_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="owner-rooms-inv__row2">
            <div>
              <label className="owner-field__label">{m(locale, "owner.priceNight")}</label>
              <input
                className="owner-input"
                type="number"
                min={0}
                step={1}
                required
                value={catPrice}
                onChange={(e) => setCatPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="owner-field__label">{m(locale, "owner.capacity")}</label>
              <input
                className="owner-input"
                type="number"
                min={1}
                max={30}
                required
                value={catGuests}
                onChange={(e) => setCatGuests(e.target.value)}
              />
            </div>
          </div>
          <div>
            <p className="owner-field__label">{m(locale, "owner.amenities")}</p>
            {Object.entries(AMENITY_CATEGORIES).map(([key, cat]) => (
              <div key={key} className="mt-2">
                <p className="owner-field__hint">{cat.label[locale] ?? cat.label.ru}</p>
                <div className="owner-rooms-inv__chips">
                  {cat.items.map((id) => {
                    const on = catAmenities.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`owner-rooms-inv__chip${on ? " is-on" : ""}`}
                        aria-pressed={on}
                        onClick={() => toggleAmenity(id)}
                      >
                        {amenityLabel(locale, id)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div>
            <label className="owner-field__label">{m(locale, "owner.roomsInv.photos")}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="owner-input"
              onChange={(e) => setCatPhotos(e.target.files)}
            />
          </div>
          <div>
            <label className="owner-field__label">{m(locale, "owner.roomsInv.panoUpload")}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="owner-input"
              onChange={(e) => setCatPano(e.target.files)}
            />
            <p className="owner-field__hint">{m(locale, "owner.roomsInv.panoHint")}</p>
          </div>
          <button type="submit" className="owner-btn owner-btn--primary" disabled={busy}>
            {busy ? m(locale, "owner.roomsInv.saving") : m(locale, "owner.roomsInv.saveCategory")}
          </button>
        </form>
      ) : null}

      {mode === "edit" ? (
        <form onSubmit={saveEdit} className="owner-panel owner-rooms-inv__form space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="owner-panel__title">{m(locale, "owner.roomsInv.editCategory")}</h3>
            <button
              type="button"
              className="owner-btn owner-btn--secondary"
              onClick={() => {
                setMode(null);
                setEditingId(null);
              }}
            >
              {m(locale, "owner.paymentMethods.cancel")}
            </button>
          </div>
          <div>
            <label className="owner-field__label">{m(locale, "owner.roomsInv.categoryName")}</label>
            <input
              className="owner-input"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
            />
          </div>
          <div className="owner-rooms-inv__row2">
            <div>
              <label className="owner-field__label">{m(locale, "owner.priceNight")}</label>
              <input
                className="owner-input"
                type="number"
                min={0}
                step={1}
                required
                value={catPrice}
                onChange={(e) => setCatPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="owner-field__label">{m(locale, "owner.capacity")}</label>
              <input
                className="owner-input"
                type="number"
                min={1}
                max={30}
                required
                value={catGuests}
                onChange={(e) => setCatGuests(e.target.value)}
              />
            </div>
          </div>
          <div>
            <p className="owner-field__label">{m(locale, "owner.amenities")}</p>
            {Object.entries(AMENITY_CATEGORIES).map(([key, cat]) => (
              <div key={key} className="mt-2">
                <p className="owner-field__hint">{cat.label[locale] ?? cat.label.ru}</p>
                <div className="owner-rooms-inv__chips">
                  {cat.items.map((id) => {
                    const on = catAmenities.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`owner-rooms-inv__chip${on ? " is-on" : ""}`}
                        aria-pressed={on}
                        onClick={() => toggleAmenity(id)}
                      >
                        {amenityLabel(locale, id)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div>
            <label className="owner-field__label">{m(locale, "owner.roomsInv.addPhotos")}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="owner-input"
              onChange={(e) => setCatPhotos(e.target.files)}
            />
          </div>
          <div>
            <label className="owner-field__label">{m(locale, "owner.roomsInv.panoUpload")}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="owner-input"
              onChange={(e) => setCatPano(e.target.files)}
            />
          </div>
          <button type="submit" className="owner-btn owner-btn--primary" disabled={busy}>
            {busy ? m(locale, "owner.roomsInv.saving") : m(locale, "owner.roomsInv.saveEdit")}
          </button>
        </form>
      ) : null}

      {mode === "room" ? (
        <form onSubmit={saveRoom} className="owner-panel owner-rooms-inv__form space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="owner-panel__title">{m(locale, "owner.roomsInv.addRoom")}</h3>
            <button type="button" className="owner-btn owner-btn--secondary" onClick={() => setMode(null)}>
              {m(locale, "owner.paymentMethods.cancel")}
            </button>
          </div>
          <div>
            <label className="owner-field__label">{m(locale, "owner.roomsInv.pickCategory")}</label>
            <select
              className="owner-select"
              required
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">{m(locale, "owner.roomsInv.pickCategory")}</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {Number(t.basePrice)} TJS · {t.maxGuests}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="owner-field__label">{m(locale, "owner.roomsInv.roomNumber")}</label>
            <input
              className="owner-input"
              required
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="101"
              maxLength={32}
            />
          </div>
          <p className="owner-field__hint">{m(locale, "owner.roomsInv.inheritsHint")}</p>
          <button type="submit" className="owner-btn owner-btn--primary" disabled={busy}>
            {busy ? m(locale, "owner.roomsInv.saving") : m(locale, "owner.roomsInv.saveRoom")}
          </button>
        </form>
      ) : null}

      {loading ? <p className="owner-section-lead">{m(locale, "owner.roomsInv.loading")}</p> : null}

      {!loading && types.length === 0 && mode !== "category" ? (
        <div className="owner-panel">
          <p className="owner-section-lead">{m(locale, "owner.roomsInv.empty")}</p>
          <button type="button" className="owner-btn owner-btn--primary mt-2" onClick={() => setMode("category")}>
            {m(locale, "owner.roomsInv.addCategory")}
          </button>
        </div>
      ) : null}

      <ul className="owner-rooms-inv__list">
        {types.map((t) => {
          const am = parseAmenities(t.amenities);
          const cover = t.photos.find((p) => p.kind !== "PANO360") ?? t.photos[0];
          const panos = t.photos.filter((p) => p.kind === "PANO360");
          const open = expanded === t.id;
          return (
            <li key={t.id} className="owner-rooms-inv__card">
              <button
                type="button"
                className="owner-rooms-inv__card-main"
                onClick={() => setExpanded(open ? null : t.id)}
                aria-expanded={open}
              >
                <div className="owner-rooms-inv__cover">
                  {cover ? (
                    <AppImage src={cover.url} alt="" fill className="object-cover" sizes="96px" />
                  ) : (
                    <span className="owner-rooms-inv__cover-empty">—</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="owner-record-card__title truncate">{t.name}</div>
                  <div className="owner-record-card__meta">
                    {Number(t.basePrice).toLocaleString()} TJS · {t.maxGuests} · {t._count.rooms}
                  </div>
                  {am.length ? (
                    <div className="owner-rooms-inv__amen-preview">
                      {am.slice(0, 4).map((id) => amenityLabel(locale, id)).join(" · ")}
                    </div>
                  ) : null}
                </div>
              </button>

              {open ? (
                <div className="owner-rooms-inv__detail space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="owner-btn owner-btn--secondary"
                      onClick={() => {
                        setRoomTypeId(t.id);
                        setMode("room");
                      }}
                    >
                      {m(locale, "owner.roomsInv.addRoom")}
                    </button>
                    <button type="button" className="owner-btn owner-btn--secondary" onClick={() => startEdit(t)}>
                      {m(locale, "owner.roomsInv.editCategory")}
                    </button>
                    <button
                      type="button"
                      className="owner-btn owner-btn--secondary"
                      onClick={() => setMediaTargetId(mediaTargetId === t.id ? null : t.id)}
                    >
                      {m(locale, "owner.roomsInv.addPhotos")}
                    </button>
                    <button type="button" className="owner-btn owner-btn--secondary" onClick={() => void archiveCategory(t.id)}>
                      {m(locale, "owner.roomsInv.archiveCategory")}
                    </button>
                    {panos[0] ? (
                      <button type="button" className="owner-btn owner-btn--secondary" onClick={() => setPanoUrl(panos[0].url)}>
                        {m(locale, "owner.roomsInv.view360")}
                      </button>
                    ) : null}
                  </div>
                  {mediaTargetId === t.id ? (
                    <div className="owner-rooms-inv__media-attach space-y-2">
                      <label className="owner-field__label">{m(locale, "owner.roomsInv.photos")}</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="owner-input"
                        onChange={(e) => void attachMedia(t.id, e.target.files, "PHOTO")}
                      />
                      <label className="owner-field__label">{m(locale, "owner.roomsInv.panoUpload")}</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="owner-input"
                        onChange={(e) => void attachMedia(t.id, e.target.files, "PANO360")}
                      />
                    </div>
                  ) : null}
                  {t._count.rooms === 0 ? (
                    <p className="owner-section-lead">{m(locale, "owner.roomsInv.zeroRooms")}</p>
                  ) : (
                    <ul className="owner-rooms-inv__rooms">
                      {t.rooms.map((r) => (
                        <li key={r.id} className="owner-rooms-inv__room-row">
                          <span className="font-semibold">{r.roomNumber || r.title}</span>
                          <span className="owner-record-card__meta">
                            {r.availability ? m(locale, "owner.availableYes") : m(locale, "owner.availableNo")}
                          </span>
                          <button
                            type="button"
                            className="owner-btn owner-btn--secondary owner-rooms-inv__room-archive"
                            onClick={() => void archiveRoom(r.id)}
                          >
                            {m(locale, "owner.roomsInv.archiveRoom")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {panoUrl ? <RoomPanoramaViewer url={panoUrl} locale={locale} onClose={() => setPanoUrl(null)} /> : null}
    </div>
  );
}
