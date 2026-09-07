import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { formatDateTimeShort } from "@/lib/i18n/format";
import { AdminSectionHead } from "@/components/admin/AdminSectionHead";
import { paymentStatusVariant, StatusBadge } from "@/components/ui/StatusBadge";

type PaymentRow = {
  id: number;
  amount: unknown;
  currency: string;
  status: string;
  provider: string;
  method: string;
  bookingId: number;
  createdAt?: Date;
  booking?: {
    commission?: unknown;
    user?: { name: string | null } | null;
    room?: { hotel?: { name: string } | null } | null;
  } | null;
};

type PayoutRow = {
  id: number;
  amount: unknown;
  currency: string;
  status: string;
  bookingId: number;
  createdAt?: Date;
  owner?: { name: string | null } | null;
  booking?: { room?: { hotel?: { name: string } | null } | null } | null;
};

type RefundRow = {
  id: number;
  amount: unknown;
  currency: string;
  status: string;
  paymentId: number;
  reason: string | null;
  createdAt?: Date;
};

type Props = {
  locale: Locale;
  payments: PaymentRow[];
  payouts: PayoutRow[];
  refunds: RefundRow[];
};

function sumAmount(rows: { amount: unknown }[]) {
  return rows.reduce((total, row) => total + Number(row.amount ?? 0), 0);
}

function formatMoney(value: number, currency = "TJS") {
  return `${Math.round(value).toLocaleString()} ${currency}`;
}

export function AdminFinanceSection({ locale, payments, payouts, refunds }: Props) {
  const paidPayments = payments.filter((p) => p.status === "PAID");
  const pendingPayments = payments.filter((p) => p.status === "PENDING");
  const paymentsTotal = sumAmount(paidPayments);
  const payoutsTotal = sumAmount(payouts);
  const refundsTotal = sumAmount(refunds);
  const commissionTotal = paidPayments.reduce(
    (total, p) => total + Number(p.booking?.commission ?? 0),
    0
  );
  const currency = payments[0]?.currency ?? payouts[0]?.currency ?? "TJS";

  return (
    <section id="finance" className="admin-section scroll-mt-28">
      <AdminSectionHead title={m(locale, "admin.financeSection")} subtitle={m(locale, "admin.financeSubtitle")} />

      <div className="admin-finance-summary">
        <article className="admin-kpi-card admin-kpi-card--visual admin-kpi-card--brand">
          <div className="admin-kpi-card__label">{m(locale, "admin.financePayments")}</div>
          <div className="admin-kpi-card__value">{formatMoney(paymentsTotal, currency)}</div>
          <div className="admin-kpi-card__meta">
            {paidPayments.length} {m(locale, "status.PAID")} · {m(locale, "admin.financeRecentCount", { count: payments.length })}
          </div>
        </article>
        <article className="admin-kpi-card admin-kpi-card--visual">
          <div className="admin-kpi-card__label">{m(locale, "admin.commission")}</div>
          <div className="admin-kpi-card__value">{formatMoney(commissionTotal, currency)}</div>
          <div className="admin-kpi-card__meta">{m(locale, "admin.financeCommissionHint")}</div>
        </article>
        <article className="admin-kpi-card admin-kpi-card--visual">
          <div className="admin-kpi-card__label">{m(locale, "admin.financePayouts")}</div>
          <div className="admin-kpi-card__value admin-kpi-card__value--info">{formatMoney(payoutsTotal, currency)}</div>
          <div className="admin-kpi-card__meta">{m(locale, "admin.financeRecentCount", { count: payouts.length })}</div>
        </article>
        <article className="admin-kpi-card admin-kpi-card--visual">
          <div className="admin-kpi-card__label">{m(locale, "admin.financeRefunds")}</div>
          <div className="admin-kpi-card__value admin-kpi-card__value--warning">{formatMoney(refundsTotal, currency)}</div>
          <div className="admin-kpi-card__meta">{m(locale, "admin.financeRecentCount", { count: refunds.length })}
          </div>
        </article>
      </div>

      {pendingPayments.length > 0 ? (
        <div className="admin-finance-queue admin-finance-queue--warning">
          <div className="admin-finance-queue__head">
            <h3 className="admin-finance-queue__title">{m(locale, "admin.financePendingTitle")}</h3>
            <span className="admin-finance-queue__count">{pendingPayments.length}</span>
          </div>
          <div className="admin-finance-queue__list">
            {pendingPayments.slice(0, 5).map((p) => (
              <FinanceRecord
                key={`pending-${p.id}`}
                locale={locale}
                tone="inflow"
                amount={`${p.amount} ${p.currency}`}
                badge={<StatusBadge variant={paymentStatusVariant(p.status)}>{p.status}</StatusBadge>}
                primary={p.booking?.room?.hotel?.name ?? "—"}
                secondary={`${p.provider}/${p.method}`}
                meta={`${m(locale, "admin.financeGuest")}: ${p.booking?.user?.name ?? "—"} · #${p.bookingId}`}
                date={p.createdAt}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="admin-finance-grid">
        <FinanceColumn
          locale={locale}
          title={m(locale, "admin.financePayments")}
          empty={m(locale, "admin.financeEmptyPayments")}
          tone="inflow"
          count={payments.length}
        >
          {payments.map((p) => (
            <FinanceRecord
              key={p.id}
              locale={locale}
              tone="inflow"
              amount={`${p.amount} ${p.currency}`}
              badge={<StatusBadge variant={paymentStatusVariant(p.status)}>{p.status}</StatusBadge>}
              primary={p.booking?.room?.hotel?.name ?? "—"}
              secondary={`${p.provider}/${p.method}`}
              meta={`${m(locale, "admin.financeGuest")}: ${p.booking?.user?.name ?? "—"} · #${p.bookingId}`}
              date={p.createdAt}
            />
          ))}
        </FinanceColumn>

        <FinanceColumn
          locale={locale}
          title={m(locale, "admin.financePayouts")}
          empty={m(locale, "admin.financeEmptyPayouts")}
          tone="outflow"
          count={payouts.length}
        >
          {payouts.map((po) => (
            <FinanceRecord
              key={po.id}
              locale={locale}
              tone="outflow"
              amount={`${po.amount} ${po.currency}`}
              badge={<span className="admin-finance-entry__status">{po.status}</span>}
              primary={`${m(locale, "admin.financeOwner")}: ${po.owner?.name ?? "—"}`}
              secondary={po.booking?.room?.hotel?.name ?? "—"}
              meta={`${m(locale, "admin.financeBooking")} #${po.bookingId}`}
              date={po.createdAt}
            />
          ))}
        </FinanceColumn>

        <FinanceColumn
          locale={locale}
          title={m(locale, "admin.financeRefunds")}
          empty={m(locale, "admin.financeEmptyRefunds")}
          tone="refund"
          count={refunds.length}
        >
          {refunds.map((r) => (
            <FinanceRecord
              key={r.id}
              locale={locale}
              tone="refund"
              amount={`${r.amount} ${r.currency}`}
              badge={<span className="admin-finance-entry__status">{r.status}</span>}
              primary={`${m(locale, "admin.financePayment")} #${r.paymentId}`}
              secondary={r.reason ?? "—"}
              meta={m(locale, "admin.financeReason")}
              date={r.createdAt}
            />
          ))}
        </FinanceColumn>
      </div>
    </section>
  );
}

function FinanceColumn({
  title,
  empty,
  tone,
  count,
  children
}: {
  locale: Locale;
  title: string;
  empty: string;
  tone: "inflow" | "outflow" | "refund";
  count: number;
  children: ReactNode;
}) {
  return (
    <div className={`admin-finance-column admin-finance-column--${tone}`}>
      <h3 className="admin-finance-column__title">{title}</h3>
      <div className="admin-finance-column__list">
        {count > 0 ? children : <div className="admin-empty-inline">{empty}</div>}
      </div>
    </div>
  );
}

function FinanceRecord({
  locale,
  tone,
  amount,
  badge,
  primary,
  secondary,
  meta,
  date
}: {
  locale: Locale;
  tone: "inflow" | "outflow" | "refund";
  amount: string;
  badge: ReactNode;
  primary: string;
  secondary: string;
  meta: string;
  date?: Date;
}) {
  return (
    <article className={`admin-finance-entry admin-finance-entry--${tone}`}>
      <div className="admin-finance-entry__top">
        <div className="admin-finance-entry__amount">{amount}</div>
        {badge}
      </div>
      <div className="admin-finance-entry__primary">{primary}</div>
      <div className="admin-finance-entry__secondary">{secondary}</div>
      <div className="admin-finance-entry__meta">{meta}</div>
      {date ? <div className="admin-finance-entry__date">{formatDateTimeShort(locale, date)}</div> : null}
    </article>
  );
}
