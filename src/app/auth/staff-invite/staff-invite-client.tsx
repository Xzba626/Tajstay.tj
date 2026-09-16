"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/use-locale";
import { m } from "@/lib/i18n/messages";

export default function StaffInviteClient() {
  const locale = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(m(locale, "manager.err.passwordMismatch"));
      return;
    }
    const res = await fetch("/api/staff/invite/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: password })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "failed");
      return;
    }
    setOk(true);
    window.setTimeout(() => router.push("/auth/sign-in?next=/dashboard/manager"), 1200);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-xl font-semibold mb-4">{m(locale, "manager.inviteTitle")}</h1>
      {ok ? <p role="status">{m(locale, "manager.inviteDone")}</p> : null}
      {error ? <p role="alert">{m(locale, "manager.err.generic")}</p> : null}
      {!ok ? (
        <form onSubmit={onSubmit} className="manager-form">
          <label className="manager-field">
            <span>{m(locale, "manager.newPassword")}</span>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="manager-field">
            <span>{m(locale, "manager.confirmPassword")}</span>
            <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary" disabled={!token}>
            {m(locale, "manager.activate")}
          </button>
        </form>
      ) : null}
    </main>
  );
}
