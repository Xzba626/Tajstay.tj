"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

/**
 * Was a legacy dark-navy card (`bg-slate-950/50`, `bg-slate-900/80`, `border-white/10`,
 * `text-slate-200/500`) rendering a dark panel on the light Admin page — the exact legacy surface
 * family this design system bans — plus fully hardcoded Russian copy with no RU/TJ/EN keys.
 * Now uses the Admin panel/field/button primitives and the shared message catalog.
 */
export function ChatArchiveClient({ locale }: { locale: Locale }) {
  const [bookingId, setBookingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    const id = Number.parseInt(bookingId.trim(), 10);
    if (!Number.isFinite(id) || id < 1) {
      setError(m(locale, "admin.chatArchiveInvalidId"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/chat/archive?bookingId=${id}`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || m(locale, "admin.chatArchiveError"));
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-archive-booking-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : m(locale, "admin.chatArchiveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-panel mx-auto max-w-lg space-y-4">
      <label className="admin-field">
        {m(locale, "admin.chatArchiveBookingId")}
        <input
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          inputMode="numeric"
          placeholder={m(locale, "admin.chatArchiveBookingIdPlaceholder")}
        />
      </label>
      <button type="button" disabled={busy} onClick={() => download()} className="admin-btn admin-btn--primary w-full">
        {busy ? m(locale, "admin.chatArchiveDownloading") : m(locale, "admin.chatArchiveDownload")}
      </button>
      {/* #dc2626 is the canonical danger literal used for semantic status throughout
          admin-command-center.css — there is no --admin-danger token, only --admin-danger-soft. */}
      {error ? (
        <p className="text-sm font-semibold text-[#dc2626]" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-xs leading-relaxed text-[var(--admin-text-muted)]">{m(locale, "admin.chatArchiveHint")}</p>
    </div>
  );
}
