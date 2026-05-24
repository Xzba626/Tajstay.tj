"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { InboxFilter } from "@/lib/chat/inbox";

type InboxItem = {
  bookingId: number;
  publicCode: string | null;
  status: string;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  hotelName: string;
  roomTitle: string;
  coverImageUrl: string | null;
  guestLabel: string;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
};

const FILTERS: InboxFilter[] = ["all", "unread", "payment_pending", "on_review", "confirmed", "complaints", "admin"];

function filterLabel(locale: Locale, f: InboxFilter): string {
  return m(locale, `inbox.filter.${f}`);
}

function statusPill(status: string): string {
  if (status === "CONFIRMED" || status === "CHECKED_IN" || status === "COMPLETED") {
    return "bg-emerald-500/20 text-emerald-100";
  }
  if (status === "ON_REVIEW") return "bg-indigo-500/20 text-indigo-100";
  if (status === "WAITING_PAYMENT" || status === "WAIT_PROOF") return "bg-amber-500/20 text-amber-100";
  return "bg-white/10 text-slate-300";
}

export function MessagesInbox({ locale, role }: { locale: Locale; role: string }) {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const visibleFilters = role === "ADMIN" ? FILTERS : FILTERS.filter((f) => f !== "admin");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter });
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/chat/inbox?${params.toString()}`, {
        cache: "no-store",
        credentials: "include"
      });
      const json = (await res.json()) as { items?: InboxItem[] };
      setItems(json.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-normal tracking-tight text-white sm:text-3xl">
          {m(locale, "inbox.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-400">{m(locale, "inbox.subtitle")}</p>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={m(locale, "inbox.searchPlaceholder")}
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-500"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {visibleFilters.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {filterLabel(locale, f)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">{m(locale, "inbox.loading")}</p>
      ) : !items.length ? (
        <p className="py-12 text-center text-sm text-slate-500">{m(locale, "inbox.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const preview =
              item.lastMessage.length > 80 ? `${item.lastMessage.slice(0, 80)}…` : item.lastMessage;
            const cover = item.coverImageUrl || "/brand/tajstay-mark.png";
            const statusLabel =
              m(locale, `status.${item.status}`) !== `status.${item.status}`
                ? m(locale, `status.${item.status}`)
                : item.status;

            return (
              <li key={item.bookingId}>
                <Link
                  href={`/chat/booking/${item.bookingId}`}
                  className="flex gap-3 rounded-2xl border border-white/[0.08] bg-[rgba(15,23,42,0.5)] p-3 backdrop-blur-xl transition hover:border-emerald-500/25 hover:bg-[rgba(15,23,42,0.7)]"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                    {item.unreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                        {item.unreadCount > 9 ? "9+" : item.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white">{item.hotelName}</div>
                        <div className="truncate text-xs text-slate-400">
                          {item.roomTitle}
                          {role === "OWNER" || role === "ADMIN" ? ` · ${item.guestLabel}` : null}
                        </div>
                      </div>
                      {item.lastMessageAt ? (
                        <time className="shrink-0 text-[10px] text-slate-500" dateTime={item.lastMessageAt}>
                          {new Date(item.lastMessageAt).toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short"
                          })}
                        </time>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                      {preview || m(locale, "inbox.noPreview")}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusPill(item.status)}`}>
                        {statusLabel}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {item.checkIn.slice(0, 10)} — {item.checkOut.slice(0, 10)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
