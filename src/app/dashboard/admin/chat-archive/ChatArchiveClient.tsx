"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTimeShort } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type ListItem = {
  bookingId: number;
  publicCode: string | null;
  status: string;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  chatArchivedAt: string;
  guestLabel: string;
  hotelName: string;
  roomTitle: string;
  messageCount: number;
};

type ArchivedMessage = {
  id: number;
  senderRole: string;
  senderName: string;
  message: string;
  imageUrl: string | null;
  originalCreatedAt: string;
};

type DetailPayload = {
  booking: {
    id: number;
    publicCode: string | null;
    status: string;
    guest: { name: string | null; phone: string | null } | null;
    hotel: { name: string };
    room: { title: string };
  };
  chatArchivedAt: string | null;
  archivedMessages: ArchivedMessage[];
};

type Props = {
  locale: Locale;
};

export function ChatArchiveClient({ locale }: Props) {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [listBusy, setListBusy] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setListBusy(true);
    setListError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (q.trim()) params.set("q", q.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin/chat/archive?${params.toString()}`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || m(locale, "chatArchive.loadError"));
      setItems((json as { items?: ListItem[] }).items ?? []);
      setTotal((json as { total?: number }).total ?? 0);
    } catch (e) {
      setListError(e instanceof Error ? e.message : m(locale, "chatArchive.loadError"));
    } finally {
      setListBusy(false);
    }
  }, [from, locale, page, q, to]);

  const loadDetail = useCallback(
    async (bookingId: number) => {
      setSelectedId(bookingId);
      setDetailBusy(true);
      setDetailError(null);
      setActionMsg(null);
      try {
        const res = await fetch(`/api/admin/chat/archive?bookingId=${bookingId}`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((json as { error?: string }).error || m(locale, "chatArchive.loadError"));
        setDetail(json as DetailPayload);
      } catch (e) {
        setDetail(null);
        setDetailError(e instanceof Error ? e.message : m(locale, "chatArchive.loadError"));
      } finally {
        setDetailBusy(false);
      }
    },
    [locale]
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function downloadJson(bookingId: number) {
    setActionBusy(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/chat/archive?bookingId=${bookingId}`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || m(locale, "chatArchive.downloadError"));
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-archive-booking-${bookingId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : m(locale, "chatArchive.downloadError"));
    } finally {
      setActionBusy(false);
    }
  }

  async function restoreChat(bookingId: number) {
    if (!window.confirm(m(locale, "chatArchive.restoreConfirm"))) return;
    setActionBusy(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/admin/chat/archive/restore", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || m(locale, "chatArchive.restoreError"));
      setActionMsg(m(locale, "chatArchive.restored"));
      setSelectedId(null);
      setDetail(null);
      await loadList();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : m(locale, "chatArchive.restoreError"));
    } finally {
      setActionBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 backdrop-blur-xl sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-slate-200">{m(locale, "chatArchive.searchLabel")}</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white outline-none focus:border-emerald-500/50"
              placeholder={m(locale, "chatArchive.searchPlaceholder")}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-slate-200">{m(locale, "chatArchive.fromDate")}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white outline-none focus:border-emerald-500/50"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-slate-200">{m(locale, "chatArchive.toDate")}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white outline-none focus:border-emerald-500/50"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={listBusy}
            onClick={() => {
              setPage(1);
              void loadList();
            }}
            className="rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {listBusy ? m(locale, "chatArchive.searching") : m(locale, "chatArchive.search")}
          </button>
          <button
            type="button"
            disabled={listBusy}
            onClick={() => {
              setQ("");
              setFrom("");
              setTo("");
              setPage(1);
              setSelectedId(null);
              setDetail(null);
              void (async () => {
                setListBusy(true);
                setListError(null);
                try {
                  const params = new URLSearchParams({ page: "1", pageSize: "20" });
                  const res = await fetch(`/api/admin/chat/archive?${params.toString()}`, { credentials: "include" });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error((json as { error?: string }).error || m(locale, "chatArchive.loadError"));
                  setItems((json as { items?: ListItem[] }).items ?? []);
                  setTotal((json as { total?: number }).total ?? 0);
                } catch (e) {
                  setListError(e instanceof Error ? e.message : m(locale, "chatArchive.loadError"));
                } finally {
                  setListBusy(false);
                }
              })();
            }}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-200"
          >
            {m(locale, "chatArchive.reset")}
          </button>
        </div>
        {listError ? <p className="mt-3 text-sm text-red-300">{listError}</p> : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
        <div className="border-b border-white/10 px-4 py-3 text-sm text-slate-400">
          {m(locale, "chatArchive.results", { count: String(total) })}
        </div>
        {items.length === 0 && !listBusy ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">{m(locale, "chatArchive.empty")}</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {items.map((item) => (
              <li key={item.bookingId}>
                <button
                  type="button"
                  onClick={() => void loadDetail(item.bookingId)}
                  className="flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-white">
                      {item.hotelName} · {item.roomTitle}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {item.guestLabel} · {item.publicCode ? `#${item.publicCode}` : `#${item.bookingId}`}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-slate-500">
                    {formatDateTimeShort(locale, new Date(item.chatArchivedAt))} · {item.messageCount}{" "}
                    {m(locale, "chatArchive.messages")}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm">
            <button
              type="button"
              disabled={page <= 1 || listBusy}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-emerald-300 disabled:opacity-40"
            >
              ←
            </button>
            <span className="text-slate-400">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || listBusy}
              onClick={() => setPage((p) => p + 1)}
              className="text-emerald-300 disabled:opacity-40"
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      {selectedId != null ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-6">
          {detailBusy ? (
            <p className="text-sm text-slate-400">{m(locale, "chatArchive.loadingDetail")}</p>
          ) : detailError ? (
            <p className="text-sm text-red-300">{detailError}</p>
          ) : detail ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {detail.booking.hotel.name} · {detail.booking.room.title}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {detail.booking.publicCode ? `#${detail.booking.publicCode}` : `#${detail.booking.id}`} ·{" "}
                    {detail.booking.guest?.name ?? "—"} · {detail.booking.status}
                  </p>
                  {detail.chatArchivedAt ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {m(locale, "chatArchive.archivedAt")}: {formatDateTimeShort(locale, new Date(detail.chatArchivedAt))}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void downloadJson(selectedId)}
                    className="rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-slate-200"
                  >
                    {m(locale, "chatArchive.download")}
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void restoreChat(selectedId)}
                    className="rounded-xl bg-amber-600/90 px-3 py-2 text-xs font-medium text-white"
                  >
                    {m(locale, "chatArchive.restore")}
                  </button>
                  <a
                    href={`/chat/booking/${selectedId}`}
                    className="rounded-xl border border-emerald-500/40 px-3 py-2 text-xs font-medium text-emerald-300"
                  >
                    {m(locale, "chatArchive.openChat")}
                  </a>
                </div>
              </div>

              <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/50 p-3">
                {detail.archivedMessages.length === 0 ? (
                  <p className="text-sm text-slate-500">{m(locale, "chatArchive.noMessages")}</p>
                ) : (
                  detail.archivedMessages.map((msg) => (
                    <div key={msg.id} className="rounded-lg bg-slate-950/60 px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-300">{msg.senderName}</span>
                        <span>{msg.senderRole}</span>
                        <span>{formatDateTimeShort(locale, new Date(msg.originalCreatedAt))}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-slate-200">{msg.message}</p>
                      {msg.imageUrl ? (
                        <a href={msg.imageUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-emerald-300">
                          {m(locale, "chatArchive.attachment")}
                        </a>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
          {actionMsg ? <p className="mt-3 text-sm text-emerald-300">{actionMsg}</p> : null}
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-slate-500">{m(locale, "chatArchive.hint")}</p>
    </div>
  );
}
