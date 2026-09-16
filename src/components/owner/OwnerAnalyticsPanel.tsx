"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { HotelAnalyticsDto } from "@/lib/owner/analytics/getHotelAnalytics";
import type { AnalyticsPeriodKey } from "@/lib/owner/analytics/period";
import { EXPENSE_CATEGORY } from "@/lib/owner/analytics/types";

type Props = {
  locale: Locale;
  hotelId: number;
  hotelName: string;
  initialDetail?: "revenue" | "expenses" | "profit" | null;
};

type ExpenseRow = {
  id: number;
  title: string;
  category: string;
  recurrence: string;
  status: string;
  currentAmount: string;
  effectiveFrom: string | null;
};

export function OwnerAnalyticsPanel({ locale, hotelId, hotelName, initialDetail = null }: Props) {
  const [period, setPeriod] = useState<AnalyticsPeriodKey>("today");
  const [data, setData] = useState<HotelAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<"revenue" | "expenses" | "profit" | null>(initialDetail ?? null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    category: "INTERNET",
    amount: "",
    recurrence: "MONTHLY"
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, eRes] = await Promise.all([
        fetch(`/api/owner/analytics?hotelId=${hotelId}&period=${period}`, { credentials: "include" }),
        fetch(`/api/owner/expenses?hotelId=${hotelId}`, { credentials: "include" })
      ]);
      if (!aRes.ok) throw new Error("analytics");
      const aJson = (await aRes.json()) as { analytics: HotelAnalyticsDto };
      setData(aJson.analytics);
      if (eRes.ok) {
        const eJson = (await eRes.json()) as { expenses: ExpenseRow[] };
        setExpenses(eJson.expenses ?? []);
      }
    } catch {
      setError(m(locale, "owner.analytics.loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [hotelId, period, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveExpense() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/owner/expenses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          title: draft.title,
          category: draft.category,
          amount: Number(draft.amount),
          recurrence: draft.recurrence,
          effectiveFrom: new Date().toISOString()
        })
      });
      if (!res.ok) throw new Error("fail");
      setAdding(false);
      setDraft({ title: "", category: "INTERNET", amount: "", recurrence: "MONTHLY" });
      await load();
    } catch {
      setError(m(locale, "owner.analytics.expenseSaveError"));
    } finally {
      setBusy(false);
    }
  }

  async function stopExpense(id: number) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/owner/expenses", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, expenseId: id, action: "stop" })
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const periods: AnalyticsPeriodKey[] = ["today", "week", "month"];

  return (
    <div className="owner-analytics space-y-3">
      <div className="owner-analytics__period" role="group" aria-label={m(locale, "owner.analytics.periodLabel")}>
        {periods.map((p) => (
          <button
            key={p}
            type="button"
            className={`owner-analytics__period-btn${period === p ? " is-active" : ""}`}
            onClick={() => setPeriod(p)}
          >
            {m(locale, `owner.analytics.period.${p}`)}
          </button>
        ))}
      </div>

      <p className="owner-section-lead">
        {m(locale, "owner.analytics.forHotel", { hotel: hotelName })}
      </p>

      {loading ? <p className="owner-section-lead">{m(locale, "owner.analytics.loading")}</p> : null}
      {error ? <p className="owner-status-banner owner-status-banner--danger">{error}</p> : null}

      {data && !loading ? (
        <>
          <div className="owner-analytics__kpi-grid">
            <button type="button" className="owner-analytics__kpi" onClick={() => setDetail("revenue")}>
              <span className="owner-analytics__kpi-label">{m(locale, "owner.analytics.revenue")}</span>
              <span className="owner-analytics__kpi-value">{Math.round(data.revenue.total).toLocaleString()} TJS</span>
              <span className="owner-analytics__kpi-meta">
                {m(locale, "owner.analytics.settlement.card")}: {Math.round(data.revenue.card)} ·{" "}
                {m(locale, "owner.analytics.settlement.cash")}: {Math.round(data.revenue.cash)}
              </span>
            </button>
            <button type="button" className="owner-analytics__kpi" onClick={() => setDetail("expenses")}>
              <span className="owner-analytics__kpi-label">{m(locale, "owner.analytics.expenses")}</span>
              <span className="owner-analytics__kpi-value">{Math.round(data.expenses.total).toLocaleString()} TJS</span>
            </button>
            <button type="button" className="owner-analytics__kpi owner-analytics__kpi--brand" onClick={() => setDetail("profit")}>
              <span className="owner-analytics__kpi-label">{m(locale, "owner.analytics.netProfit")}</span>
              <span className="owner-analytics__kpi-value">{Math.round(data.netProfit).toLocaleString()} TJS</span>
            </button>
            <div className="owner-analytics__kpi">
              <span className="owner-analytics__kpi-label">{m(locale, "owner.analytics.bookings")}</span>
              <span className="owner-analytics__kpi-value">
                {data.bookings.onlineCount + data.bookings.offlineCount}
              </span>
              <span className="owner-analytics__kpi-meta">
                {m(locale, "owner.analytics.online")}: {data.bookings.onlineCount} ·{" "}
                {m(locale, "owner.analytics.offline")}: {data.bookings.offlineCount}
              </span>
            </div>
          </div>

          <div className="owner-analytics__ops">
            <span>
              {m(locale, "owner.kpi.pendingOnline")}: <strong>{data.bookings.pendingConfirmation}</strong>
            </span>
            <span>
              {m(locale, "owner.kpi.checkInsToday")}: <strong>{data.ops.checkInsInPeriod}</strong>
            </span>
            <span>
              {m(locale, "owner.kpi.checkOutsToday")}: <strong>{data.ops.checkOutsInPeriod}</strong>
            </span>
          </div>

          {detail ? (
            <div className="owner-panel owner-analytics__detail">
              <div className="flex items-center justify-between gap-2">
                <h3 className="owner-panel__title">
                  {detail === "revenue"
                    ? m(locale, "owner.analytics.revenue")
                    : detail === "expenses"
                      ? m(locale, "owner.analytics.expenses")
                      : m(locale, "owner.analytics.netProfit")}
                </h3>
                <button type="button" className="owner-btn owner-btn--secondary" onClick={() => setDetail(null)}>
                  {m(locale, "owner.paymentMethods.cancel")}
                </button>
              </div>

              {detail === "revenue" || detail === "profit" ? (
                <ul className="owner-analytics__breakdown">
                  <li>
                    {m(locale, "owner.analytics.revenue")}: {Math.round(data.revenue.total)} TJS
                  </li>
                  <li>
                    {m(locale, "owner.analytics.settlement.card")}: {Math.round(data.revenue.card)} TJS
                  </li>
                  <li>
                    {m(locale, "owner.analytics.settlement.cash")}: {Math.round(data.revenue.cash)} TJS
                  </li>
                  {data.revenue.other > 0 ? (
                    <li>
                      {m(locale, "owner.analytics.settlement.other")}: {Math.round(data.revenue.other)} TJS
                    </li>
                  ) : null}
                  <li>
                    {m(locale, "owner.analytics.online")}: {Math.round(data.revenue.online)} TJS ({data.bookings.onlineCount})
                  </li>
                  <li>
                    {m(locale, "owner.analytics.offline")}: {Math.round(data.revenue.offline)} TJS ({data.bookings.offlineCount})
                  </li>
                </ul>
              ) : null}

              {detail === "expenses" || detail === "profit" ? (
                <>
                  <ul className="owner-analytics__breakdown">
                    <li>
                      {m(locale, "owner.analytics.expenses")}: {Math.round(data.expenses.total)} TJS
                    </li>
                    {data.expenses.byCategory.map((c) => (
                      <li key={c.category}>
                        {m(locale, `owner.analytics.expenseCategory.${c.category}`)}: {Math.round(c.amount)} TJS
                      </li>
                    ))}
                  </ul>
                  {detail === "expenses" ? (
                    <div className="space-y-2 mt-3">
                      {expenses.length === 0 ? (
                        <p className="owner-section-lead">{m(locale, "owner.analytics.expensesEmpty")}</p>
                      ) : (
                        <ul className="space-y-2">
                          {expenses.map((e) => (
                            <li key={e.id} className="owner-record-card flex flex-wrap items-center justify-between gap-2 text-sm">
                              <div>
                                <div className="owner-record-card__title">{e.title}</div>
                                <div className="owner-record-card__meta">
                                  {m(locale, `owner.analytics.expenseCategory.${e.category}`)} ·{" "}
                                  {m(locale, `owner.analytics.recurrence.${e.recurrence}`)} · {e.currentAmount} TJS ·{" "}
                                  {m(locale, `owner.analytics.expenseStatus.${e.status}`)}
                                </div>
                              </div>
                              {e.status === "ACTIVE" ? (
                                <button
                                  type="button"
                                  className="rounded-lg border px-2.5 py-1 text-xs"
                                  disabled={busy}
                                  onClick={() => void stopExpense(e.id)}
                                >
                                  {m(locale, "owner.analytics.stopExpense")}
                                </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                      {adding ? (
                        <div className="space-y-2 rounded-xl border p-3">
                          <input
                            className="owner-input"
                            placeholder={m(locale, "owner.analytics.expenseTitlePh")}
                            value={draft.title}
                            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                          />
                          <select
                            className="owner-select"
                            value={draft.category}
                            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                          >
                            {EXPENSE_CATEGORY.map((c) => (
                              <option key={c} value={c}>
                                {m(locale, `owner.analytics.expenseCategory.${c}`)}
                              </option>
                            ))}
                          </select>
                          <select
                            className="owner-select"
                            value={draft.recurrence}
                            onChange={(e) => setDraft((d) => ({ ...d, recurrence: e.target.value }))}
                          >
                            <option value="ONE_TIME">{m(locale, "owner.analytics.recurrence.ONE_TIME")}</option>
                            <option value="MONTHLY">{m(locale, "owner.analytics.recurrence.MONTHLY")}</option>
                          </select>
                          <input
                            className="owner-input"
                            type="number"
                            min={1}
                            step={1}
                            placeholder={m(locale, "owner.analytics.expenseAmountPh")}
                            value={draft.amount}
                            onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                          />
                          <div className="flex gap-2 justify-end">
                            <button type="button" className="owner-btn owner-btn--secondary" onClick={() => setAdding(false)}>
                              {m(locale, "owner.paymentMethods.cancel")}
                            </button>
                            <button type="button" className="owner-btn owner-btn--primary" disabled={busy} onClick={() => void saveExpense()}>
                              {m(locale, "owner.paymentMethods.save")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" className="owner-btn owner-btn--primary" onClick={() => setAdding(true)}>
                          {m(locale, "owner.analytics.addExpense")}
                        </button>
                      )}
                    </div>
                  ) : null}
                </>
              ) : null}

              {detail === "profit" ? (
                <p className="owner-panel__meta mt-2">
                  {Math.round(data.revenue.total)} − {Math.round(data.expenses.total)} = {Math.round(data.netProfit)} TJS
                </p>
              ) : null}

              {detail === "revenue" && data.contributing.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {data.contributing.slice(0, 20).map((row) => (
                    <li key={row.id} className="owner-record-card text-sm">
                      <div className="owner-record-card__title">
                        {row.publicCode ?? `#${row.id}`} · {Math.round(row.amount)} TJS
                      </div>
                      <div className="owner-record-card__meta">
                        {row.guest} · {m(locale, `owner.analytics.${row.channel}`)} ·{" "}
                        {m(locale, `owner.analytics.settlement.${row.settlement.toLowerCase()}`)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
