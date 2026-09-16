"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export function ManagerProfileClient({
  locale,
  name,
  hotels
}: {
  locale: Locale;
  name: string;
  hotels: { id: number; name: string }[];
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (newPassword !== confirm) {
      setErr(m(locale, "manager.err.passwordMismatch"));
      return;
    }
    const res = await fetch("/api/manager/password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(m(locale, "manager.err.generic"));
      return;
    }
    setMsg(m(locale, "manager.passwordChanged"));
    setOldPassword("");
    setNewPassword("");
    setConfirm("");
    void json;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/auth/sign-in";
  }

  return (
    <div className="manager-page">
      <h1 className="manager-page__title">{m(locale, "manager.profileTitle")}</h1>
      <div className="manager-profile-card">
        <p>
          <strong>{name}</strong>
        </p>
        <p>{m(locale, "manager.roleManager")}</p>
        <ul>
          {hotels.map((h) => (
            <li key={h.id}>{h.name}</li>
          ))}
        </ul>
      </div>

      <h2 className="manager-page__subtitle">{m(locale, "manager.security")}</h2>
      {msg ? <p role="status">{msg}</p> : null}
      {err ? <p role="alert">{err}</p> : null}
      <form onSubmit={onChangePassword} className="manager-form">
        <label className="manager-field">
          <span>{m(locale, "manager.oldPassword")}</span>
          <input type="password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
        </label>
        <label className="manager-field">
          <span>{m(locale, "manager.newPassword")}</span>
          <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </label>
        <label className="manager-field">
          <span>{m(locale, "manager.confirmPassword")}</span>
          <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        <button type="submit" className="btn-primary">
          {m(locale, "manager.changePassword")}
        </button>
      </form>

      <button type="button" className="btn-secondary manager-logout" onClick={() => void logout()}>
        {m(locale, "manager.logout")}
      </button>
    </div>
  );
}
