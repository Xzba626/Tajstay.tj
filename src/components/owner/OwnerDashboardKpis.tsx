import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { OwnerDashboardKpis as Kpis } from "@/lib/services/ownerDashboardKpis";
import { AnalyticsDonut } from "@/components/ds/AnalyticsDonut";

export function OwnerDashboardKpis({ locale, kpis }: { locale: Locale; kpis: Kpis }) {
  const hotelTotal = kpis.activeHotels + kpis.hotelsPendingModeration;
  const opsTotal = kpis.bookingsToday + kpis.checkInsToday + kpis.checkOutsToday;

  return (
    <div className="owner-kpi-grid">
      <article className="owner-kpi-card owner-kpi-card--visual owner-kpi-card--brand">
        <div className="owner-kpi-card__label">{m(locale, "owner.kpi.activeHotels")}</div>
        <div className="owner-kpi-card__value">
          {kpis.activeHotels}
          {hotelTotal > 0 ? <span className="owner-kpi-card__value-sub"> / {hotelTotal}</span> : null}
        </div>
        <AnalyticsDonut
          ariaLabel={m(locale, "owner.kpi.activeHotels")}
          centerValue={String(kpis.activeHotels)}
          centerLabel={m(locale, "owner.kpi.activeHotels")}
          segments={[
            { value: kpis.activeHotels, tone: "success", label: m(locale, "admin.kpiHotelsApproved") },
            { value: kpis.hotelsPendingModeration, tone: "warning", label: m(locale, "admin.kpiHotelsPending") }
          ]}
        />
      </article>

      <article className="owner-kpi-card owner-kpi-card--visual">
        <div className="owner-kpi-card__label">{m(locale, "owner.kpi.pendingOnline")}</div>
        <div className="owner-kpi-card__value">{kpis.pendingOnlineBookings}</div>
        <div className="owner-kpi-card__meta">{m(locale, "owner.pendingBookings")}</div>
        <AnalyticsDonut
          ariaLabel={m(locale, "owner.kpi.pendingOnline")}
          centerValue={String(kpis.pendingOnlineBookings)}
          centerLabel={m(locale, "owner.pendingBookings")}
          segments={[
            { value: kpis.pendingOnlineBookings, tone: "warning", label: m(locale, "owner.pendingBookings") },
            { value: Math.max(0, kpis.bookingsToday), tone: "info", label: m(locale, "owner.kpi.bookingsToday") }
          ]}
        />
      </article>

      <article className="owner-kpi-card owner-kpi-card--visual">
        <div className="owner-kpi-card__label">{m(locale, "owner.overview")}</div>
        <div className="owner-kpi-card__value">{opsTotal}</div>
        <AnalyticsDonut
          ariaLabel={m(locale, "owner.overview")}
          centerValue={String(opsTotal)}
          centerLabel={m(locale, "owner.overview")}
          segments={[
            { value: kpis.bookingsToday, tone: "info", label: m(locale, "owner.kpi.bookingsToday") },
            { value: kpis.checkInsToday, tone: "success", label: m(locale, "owner.kpi.checkInsToday") },
            { value: kpis.checkOutsToday, tone: "neutral", label: m(locale, "owner.kpi.checkOutsToday") }
          ]}
        />
      </article>

      <article className="owner-kpi-card owner-kpi-card--visual owner-kpi-card--brand">
        <div className="owner-kpi-card__label">{m(locale, "owner.kpi.revenueMonth")}</div>
        <div className="owner-kpi-card__value">{Math.round(kpis.revenueMonth).toLocaleString()} TJS</div>
        <div className="owner-kpi-card__meta">
          {m(locale, "owner.kpi.unreadMessages")}: {kpis.unreadMessages}
        </div>
      </article>
    </div>
  );
}
