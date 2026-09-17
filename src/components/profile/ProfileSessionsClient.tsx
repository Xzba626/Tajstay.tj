"use client";

import { useCallback, useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";

type SessionRow = { id: number; createdAt: string; expiresAt: string | null; current: boolean };

type Labels = {
  title: string;
  current: string;
  other: string;
  revokeOthers: string;
  revokeOne: string;
  empty: string;
  loadError: string;
  revoked: string;
};

/** Active session list + revoke (embedded in Profile → Security). */
export function ProfileSessionsClient({ locale: _locale, labels }: { locale: Locale; labels: Labels }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as { sessions?: SessionRow[] };
      setSessions(json.sessions ?? []);
    } catch {
      setError(labels.loadError);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [labels.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function revokeOthers() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile/sessions", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_others" })
      });
      if (!res.ok) throw new Error("fail");
      setMsg(labels.revoked);
      await load();
    } catch {
      setError(labels.loadError);
    } finally {
      setBusy(false);
    }
  }

  async function revokeOne(id: number) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile/sessions", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke_one", sessionId: id })
      });
      if (!res.ok) throw new Error("fail");
      setMsg(labels.revoked);
      await load();
    } catch {
      setError(labels.loadError);
    } finally {
      setBusy(false);
    }
  }

  const others = sessions.filter((s) => !s.current);

  return (
    <div className="profile-sessions space-y-3">
      {loading ? <p className="profile-section-lead">{labels.title}</p> : null}
      {error ? (
        <p className="profile-status profile-status--danger" role="alert">
          {error}
        </p>
      ) : null}
      {msg ? (
        <p className="profile-status profile-status--success" role="status">
          {msg}
        </p>
      ) : null}

      <ul className="profile-sessions-list space-y-2">
        {sessions.map((s) => (
          <li key={s.id} className="profile-sessions-list__row flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm">
              <Smartphone size={16} aria-hidden />
              {s.current ? labels.current : labels.other}
              <span className="text-[var(--taj-color-text-secondary)]">
                {new Date(s.createdAt).toLocaleString()}
              </span>
            </span>
            {!s.current ? (
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={busy}
                onClick={() => void revokeOne(s.id)}
              >
                {labels.revokeOne}
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {!loading && !sessions.length ? <p className="profile-section-lead">{labels.empty}</p> : null}

      {others.length ? (
        <button type="button" className="btn-primary inline-flex !w-auto px-6" disabled={busy} onClick={() => void revokeOthers()}>
          {labels.revokeOthers}
        </button>
      ) : null}
    </div>
  );
}
