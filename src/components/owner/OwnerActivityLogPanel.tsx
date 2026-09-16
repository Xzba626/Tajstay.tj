"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type EventRow = {
  id: number;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actorRole: string | null;
  beforeState: string | null;
  afterState: string | null;
  createdAt: string;
};

export function OwnerActivityLogPanel({ locale, hotelId }: { locale: Locale; hotelId: number }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const load = useCallback(
    async (reset = false) => {
      setLoading(true);
      setError(null);
      try {
        const q = new URLSearchParams({ hotelId: String(hotelId), take: "30" });
        if (!reset && cursor) q.set("cursor", String(cursor));
        const res = await fetch(`/api/owner/audit?${q}`, { credentials: "include" });
        if (!res.ok) throw new Error("fail");
        const json = (await res.json()) as { events: EventRow[]; nextCursor: number | null };
        setEvents((prev) => (reset ? json.events : [...prev, ...json.events]));
        setNextCursor(json.nextCursor);
      } catch {
        setError(m(locale, "owner.analytics.loadError"));
      } finally {
        setLoading(false);
      }
    },
    [hotelId, cursor, locale]
  );

  useEffect(() => {
    setEvents([]);
    setCursor(null);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  function actionLabel(action: string): string {
    const keyMap: Record<string, string> = {
      "expense.created": "owner.activity.action.expenseCreated",
      "expense.amount_changed": "owner.activity.action.expenseAmountChanged",
      "expense.stopped": "owner.activity.action.expenseStopped"
    };
    const path = keyMap[action];
    if (!path) return action;
    return m(locale, path);
  }

  function formatState(before: string | null, after: string | null): string {
    const parse = (raw: string | null) => {
      if (!raw) return null;
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return null;
      }
    };
    const b = parse(before);
    const a = parse(after);
    if (b?.amount != null && a?.amount != null) {
      return `${b.amount} TJS → ${a.amount} TJS`;
    }
    if (a?.amount != null && a?.title) {
      return `${String(a.title)} · ${a.amount} TJS`;
    }
    if (a?.stopAt) {
      return String(a.stopAt).slice(0, 10);
    }
    return [before, after].filter(Boolean).join(" → ").slice(0, 120);
  }

  return (
    <div className="space-y-3">
      <p className="owner-section-lead">{m(locale, "owner.activity.hint")}</p>
      {loading && events.length === 0 ? <p className="owner-section-lead">{m(locale, "owner.analytics.loading")}</p> : null}
      {error ? <p className="owner-status-banner owner-status-banner--danger">{error}</p> : null}
      {events.length === 0 && !loading ? (
        <p className="owner-section-lead">{m(locale, "owner.activity.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="owner-record-card text-sm">
              <div className="owner-record-card__title">{actionLabel(e.action)}</div>
              <div className="owner-record-card__meta">
                {new Date(e.createdAt).toLocaleString()} · {e.actorRole ?? "—"}
                {e.entityType ? ` · ${e.entityType} #${e.entityId}` : ""}
              </div>
              {e.beforeState || e.afterState ? (
                <div className="owner-record-card__meta truncate">
                  {formatState(e.beforeState, e.afterState)}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {nextCursor ? (
        <button
          type="button"
          className="owner-btn owner-btn--secondary"
          onClick={() => {
            const c = nextCursor;
            setCursor(c);
            void (async () => {
              setLoading(true);
              try {
                const q = new URLSearchParams({ hotelId: String(hotelId), take: "30", cursor: String(c) });
                const res = await fetch(`/api/owner/audit?${q}`, { credentials: "include" });
                const json = (await res.json()) as { events: EventRow[]; nextCursor: number | null };
                setEvents((prev) => [...prev, ...json.events]);
                setNextCursor(json.nextCursor);
              } finally {
                setLoading(false);
              }
            })();
          }}
        >
          {m(locale, "owner.activity.loadMore")}
        </button>
      ) : null}
    </div>
  );
}
