"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { SensitiveActionConfirmDialog } from "@/components/ui/SensitiveActionConfirmDialog";

type HotelOption = { id: number; name: string };

type ModeratorRow = {
  id: number;
  createdAt: string;
  user: {
    id: number;
    name: string | null;
    phone: string | null;
    email: string | null;
    role: string;
  };
};

export function OwnerHotelPersonnelPanel({
  locale,
  hotels
}: {
  locale: Locale;
  hotels: HotelOption[];
}) {
  const [hotelId, setHotelId] = useState(hotels[0]?.id ?? 0);
  const [moderators, setModerators] = useState<ModeratorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/owner/hotels/${hotelId}/moderators`, { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as { moderators?: ModeratorRow[] };
      if (!res.ok) {
        setModerators([]);
        return;
      }
      setModerators(data.moderators ?? []);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!hotelId || !trimmed) return;
    setInviting(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/owner/hotels/${hotelId}/moderators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: trimmed })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const key =
          data.error === "user_not_found"
            ? "owner.personnel.errorNotFound"
            : data.error === "invalid_role"
              ? "owner.personnel.errorInvalidRole"
              : "owner.personnel.errorInvite";
        setMsg({ type: "err", text: m(locale, key) });
        return;
      }
      setEmail("");
      setMsg({ type: "ok", text: m(locale, "owner.personnel.inviteOk") });
      await load();
    } finally {
      setInviting(false);
    }
  }

  async function remove(userId: number) {
    if (!hotelId) return;
    setRemoving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/owner/hotels/${hotelId}/moderators?userId=${userId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) {
        setMsg({ type: "err", text: m(locale, "owner.personnel.errorRemove") });
        return;
      }
      setMsg({ type: "ok", text: m(locale, "owner.personnel.removeOk") });
      setRemoveTarget(null);
      await load();
    } finally {
      setRemoving(false);
    }
  }

  if (!hotels.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        {m(locale, "owner.personnel.noHotels")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {hotels.length > 1 ? (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="personnel-hotel" className="text-sm font-medium text-slate-700">
            {m(locale, "owner.personnel.hotelLabel")}
          </label>
          <select
            id="personnel-hotel"
            value={hotelId}
            onChange={(e) => setHotelId(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <form onSubmit={invite} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">{m(locale, "owner.personnel.inviteTitle")}</h3>
        <p className="mt-1 text-sm text-slate-600">{m(locale, "owner.personnel.inviteHint")}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="moderator-email" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Email
            </label>
            <input
              id="moderator-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={m(locale, "owner.personnel.emailPlaceholder")}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={inviting || !email.trim()}
            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {inviting ? m(locale, "owner.personnel.inviting") : m(locale, "owner.personnel.inviteCta")}
          </button>
        </div>
        {msg ? (
          <p className={`mt-3 text-sm ${msg.type === "ok" ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>
        ) : null}
      </form>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">{m(locale, "owner.personnel.listTitle")}</h3>
          <p className="mt-1 text-sm text-slate-600">{m(locale, "owner.personnel.listHint")}</p>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-sm text-slate-500">{m(locale, "owner.personnel.loading")}</p>
        ) : !moderators.length ? (
          <p className="px-5 py-8 text-sm text-slate-500">{m(locale, "owner.personnel.empty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {moderators.map((row) => {
              const u = row.user;
              const displayName = u.name?.trim() || u.email || u.phone || `#${u.id}`;
              return (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{displayName}</p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {[u.email, u.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      {m(locale, "roles.HOTEL_MODERATOR")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoveTarget(u.id)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    {m(locale, "owner.personnel.remove")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <SensitiveActionConfirmDialog
        open={removeTarget != null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => (removeTarget != null ? remove(removeTarget) : undefined)}
        locale={locale}
        title={m(locale, "confirmDialog.removeModeratorTitle")}
        description={m(locale, "confirmDialog.removeModeratorDesc")}
        confirmLabel={m(locale, "owner.personnel.remove")}
        variant="danger"
        busy={removing}
      />
    </div>
  );
}
