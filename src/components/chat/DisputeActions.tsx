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

  return (
    <div className="rounded-2xl border border-amber-300/30 bg-amber-950/20 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-amber-100">{m(locale, "chat.dispute.title")}</span>
        {canOpen && !openDispute ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg border border-amber-400/40 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/10"
          >
            {m(locale, "chat.dispute.open")}
          </button>
        ) : null}
      </div>

      {openDispute ? (
        <p className="mt-2 text-amber-100/90">
          {m(locale, "chat.dispute.openStatus")}: {openDispute.reason.slice(0, 120)}
          {openDispute.reason.length > 120 ? "…" : ""}
        </p>
      ) : null}

      {items
        .filter((d) => d.status !== "OPEN")
        .map((d) => (
          <p key={d.id} className="mt-2 text-slate-300">
            {d.status}: {d.resolution || d.reason.slice(0, 80)}
          </p>
        ))}

      {open ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={m(locale, "chat.dispute.placeholder")}
            className="min-h-[80px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
          />
          {error ? <p className="text-xs text-red-300">{m(locale, "chat.dispute.error")}</p> : null}
          <button
            type="button"
            disabled={busy || reason.trim().length < 10}
            onClick={() => void submit()}
            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {m(locale, "chat.dispute.submit")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
