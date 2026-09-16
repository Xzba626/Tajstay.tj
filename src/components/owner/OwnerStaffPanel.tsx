"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type StaffRow = {
  id: number;
  name: string;
  phone: string;
  staffRole: string;
  status: string;
  lastActiveAt: string | null;
};

export function OwnerStaffPanel({ locale, hotelId }: { locale: Locale; hotelId: number }) {
  const [items, setItems] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [onceSecret, setOnceSecret] = useState<{ tempPassword: string; inviteToken: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/staff?hotelId=${hotelId}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "failed");
        setItems([]);
        return;
      }
      setItems(json.items ?? []);
    } catch {
      setError("network");
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOnceSecret(null);
    setError(null);
    try {
      const res = await fetch("/api/owner/staff", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, firstName, lastName, phone })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "failed");
        return;
      }
      setOnceSecret({ tempPassword: json.tempPassword, inviteToken: json.inviteToken });
      setFirstName("");
      setLastName("");
      setPhone("");
      setAdding(false);
      void load();
    } finally {
      setBusy(false);
    }
  }

  async function action(staffId: number, actionName: string) {
    setBusy(true);
    setOnceSecret(null);
    try {
      const res = await fetch("/api/owner/staff", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, staffId, action: actionName })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "failed");
        return;
      }
      if (json.tempPassword) {
        setOnceSecret({ tempPassword: json.tempPassword, inviteToken: json.inviteToken });
      }
      void load();
    } finally {
      setBusy(false);
    }
  }

  function statusLabel(s: string) {
    if (s === "ACTIVE") return m(locale, "owner.staff.statusActive");
    if (s === "INVITED") return m(locale, "owner.staff.statusInvited");
    if (s === "SUSPENDED") return m(locale, "owner.staff.statusSuspended");
    return s;
  }

  return (
    <section className="owner-panel space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{m(locale, "owner.staff.title")}</h2>
        <button type="button" className="btn-primary" onClick={() => setAdding((v) => !v)} disabled={busy}>
          {m(locale, "owner.staff.add")}
        </button>
      </div>

      {onceSecret ? (
        <div className="owner-status-banner owner-status-banner--warning" role="status">
          <p>{m(locale, "owner.staff.tempPasswordOnce")}</p>
          <p className="font-mono text-sm">{onceSecret.tempPassword}</p>
          <p className="text-sm">
            {m(locale, "owner.staff.inviteLink")}: /auth/staff-invite?token={onceSecret.inviteToken}
          </p>
          <button type="button" className="btn-secondary" onClick={() => setOnceSecret(null)}>
            {m(locale, "owner.staff.dismissSecret")}
          </button>
        </div>
      ) : null}

      {adding ? (
        <form onSubmit={onCreate} className="owner-form owner-form--grid-2">
          <label className="owner-field">
            <span className="owner-field__label">{m(locale, "owner.staff.firstName")}</span>
            <input className="owner-input" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="owner-field">
            <span className="owner-field__label">{m(locale, "owner.staff.lastName")}</span>
            <input className="owner-input" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
          <label className="owner-field md:col-span-2">
            <span className="owner-field__label">{m(locale, "owner.staff.phone")}</span>
            <input className="owner-input" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary md:col-span-2" disabled={busy}>
            {m(locale, "owner.staff.create")}
          </button>
        </form>
      ) : null}

      {loading ? <p>{m(locale, "owner.staff.loading")}</p> : null}
      {error ? <p role="alert">{m(locale, "owner.staff.error")}</p> : null}
      {!loading && !items.length ? <p>{m(locale, "owner.staff.empty")}</p> : null}

      <ul className="space-y-3">
        {items.map((s) => (
          <li key={s.id} className="rounded-xl border border-[var(--border-subtle,#d8e4dc)] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-[var(--text-secondary-semantic,#4a6356)]">
                  {m(locale, "owner.staff.roleManager")} · {statusLabel(s.status)}
                </div>
                {s.lastActiveAt ? (
                  <div className="text-xs text-[var(--text-tertiary-semantic,#6b7f74)]">
                    {m(locale, "owner.staff.lastActive")}: {new Date(s.lastActiveAt).toLocaleString()}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {s.status === "ACTIVE" || s.status === "INVITED" ? (
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => void action(s.id, "suspend")}>
                    {m(locale, "owner.staff.suspend")}
                  </button>
                ) : null}
                {s.status === "SUSPENDED" ? (
                  <button type="button" className="btn-secondary" disabled={busy} onClick={() => void action(s.id, "reactivate")}>
                    {m(locale, "owner.staff.reactivate")}
                  </button>
                ) : null}
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => void action(s.id, "reset")}>
                  {m(locale, "owner.staff.reset")}
                </button>
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => void action(s.id, "remove")}>
                  {m(locale, "owner.staff.remove")}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
