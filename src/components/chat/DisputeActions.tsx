"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type DisputeRow = {
  id: number;
  status: string;
  reason: string;
  createdAt: string;
  resolution: string | null;
};

export function DisputeActions({
  locale,
  bookingId,
  canOpen
}: {
  locale: Locale;
  bookingId: number;
  canOpen: boolean;
}) {
  const [items, setItems] = useState<DisputeRow[]>([]);
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/disputes?bookingId=${bookingId}`, { credentials: "include" });
      const json = (await res.json()) as { items?: DisputeRow[] };
      setItems(json.items ?? []);
    } catch {
      setItems([]);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!reason.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookingId, reason: reason.trim() })
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "failed");
      }
      setReason("");
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  const openDispute = items.find((d) => d.status === "OPEN");
  const resolvedItems = items.filter((d) => d.status !== "OPEN");
  const idle = !openDispute && !open && resolvedItems.length === 0;

  // BLOCK 5.6A: when there's nothing to show and the form isn't open, render only the compact
  // "Пожаловаться" text action — not a persistently-visible bordered card. The full card (with
  // border/background) only appears once there's an open dispute, history, or an in-progress form.
  if (idle) {
    return canOpen ? (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-semibold text-[var(--taj-color-text-muted)] underline-offset-2 hover:text-[#b45309] hover:underline"
        >
          {m(locale, "chat.dispute.open")}
        </button>
      </div>
    ) : null;
  }

  return (
    <div className="rounded-2xl border border-[#d97706]/25 bg-[#d97706]/[0.06] p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-[#92400e]">{m(locale, "chat.dispute.title")}</span>
        {canOpen && !openDispute && !open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-[#d97706]/40 px-3 py-1 text-xs font-semibold text-[#92400e] hover:bg-[#d97706]/10"
          >
            {m(locale, "chat.dispute.open")}
          </button>
        ) : null}
      </div>

      {openDispute ? (
        <p className="mt-2 text-[#92400e]">
          {m(locale, "chat.dispute.openStatus")}: {openDispute.reason.slice(0, 120)}
          {openDispute.reason.length > 120 ? "…" : ""}
        </p>
      ) : null}

      {resolvedItems.map((d) => (
        <p key={d.id} className="mt-2 text-[var(--taj-color-text-secondary)]">
          {d.status}: {d.resolution || d.reason.slice(0, 80)}
        </p>
      ))}

      {open ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={m(locale, "chat.dispute.placeholder")}
            className="min-h-[80px] w-full rounded-xl border border-[var(--taj-color-border)] bg-[var(--taj-color-bg-card-solid)] px-3 py-2 text-sm text-[var(--taj-color-text)]"
          />
          {error ? <p className="text-xs text-[#b91c1c]">{m(locale, "chat.dispute.error")}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setReason("");
                setError(null);
              }}
              className="rounded-lg border border-[var(--taj-color-border)] px-4 py-2 text-xs font-semibold text-[var(--taj-color-text-secondary)]"
            >
              {m(locale, "chat.modalBack")}
            </button>
            <button
              type="button"
              disabled={busy || reason.trim().length < 10}
              onClick={() => void submit()}
              className="rounded-lg bg-[#d97706] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {m(locale, "chat.dispute.submit")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
