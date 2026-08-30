import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  ClipboardList,
  MessageSquareWarning,
  ShieldAlert
} from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { formatDateTimeShort } from "@/lib/i18n/format";
import { WorkspaceKpiBar } from "@/components/ds/WorkspaceKpiBar";

export type AdminDashboardStats = {
  hotelTotal: number;
  hotelApproved: number;
  userTotal: number;
  usersGuest: number;
  usersOwner: number;
  usersAdmin: number;
  bookingTotal: number;
  bookingConfirmed: number;
  bookingPending: number;
  bookingCancelled: number;
  revenue30: number;
  commission30: number;
  pendingApplications: number;
  pendingHotels: number;
  openComplaints: number;
  unreadNotifications: number;
  bookingsOnReview: number;
};

type RiskNote = {
  id: number;
  type: string;
  createdAt: Date;
};

type Props = {
  locale: Locale;
  stats: AdminDashboardStats;
  riskNotes: RiskNote[];
  basePath: string;
};

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString()} TJS`;
}

export function AdminDashboardOverview({ locale, stats, riskNotes, basePath }: Props) {
  const hotelPending = Math.max(0, stats.hotelTotal - stats.hotelApproved);
  const commissionShare =
    stats.revenue30 > 0 ? Math.min(100, Math.round((stats.commission30 / stats.revenue30) * 100)) : 0;

  const attentionItems = [
    stats.pendingApplications > 0
      ? {
          href: `${basePath}?section=applications`,
          label: m(locale, "admin.attentionApplications"),
          hint: m(locale, "admin.attentionApplicationsHint"),
          count: stats.pendingApplications,
          tone: "warning" as const,
          Icon: ClipboardList
        }
      : null,
    stats.pendingHotels > 0
      ? {
          href: `${basePath}?section=hotels&status=PENDING`,
          label: m(locale, "admin.attentionHotels"),
          hint: m(locale, "admin.attentionHotelsHint"),
          count: stats.pendingHotels,
          tone: "accent" as const,
          Icon: Building2
        }
      : null,
    stats.bookingsOnReview > 0
      ? {
          href: `${basePath}?section=bookings&paymentStatus=ON_REVIEW`,
          label: m(locale, "admin.attentionPayments"),
          hint: m(locale, "admin.attentionPaymentsHint"),
          count: stats.bookingsOnReview,
          tone: "info" as const,
          Icon: ShieldAlert
        }
      : null,
    stats.openComplaints > 0
      ? {
          href: `${basePath}?section=complaints&status=PENDING`,
          label: m(locale, "admin.attentionComplaints"),
          hint: m(locale, "admin.attentionComplaintsHint"),
          count: stats.openComplaints,
          tone: "danger" as const,
          Icon: MessageSquareWarning
        }
      : null,
    stats.unreadNotifications > 0
      ? {
          href: `${basePath}?section=notifications`,
          label: m(locale, "admin.attentionNotifications"),
          hint: m(locale, "admin.attentionNotificationsHint"),
          count: stats.unreadNotifications,
          tone: "info" as const,
          Icon: AlertTriangle
        }
      : null
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    hint: string;
    count: number;
    tone: "warning" | "danger" | "info" | "accent";
    Icon: typeof ClipboardList;
  }>;

  const attentionTotal = attentionItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <section id="dashboard" className="scroll-mt-28 space-y-4">
      <div className="admin-section-head">
        <span className="admin-section-head__bar" aria-hidden />
        <h2 className="admin-section-head__title">{m(locale, "admin.commandOverview")}</h2>
      </div>

      <div className="admin-kpi-grid">
        <article className="admin-kpi-card admin-kpi-card--visual">
          <div className="admin-kpi-card__label">{m(locale, "admin.hotelsTotal")}</div>
          <div className="admin-kpi-card__value">
            {stats.hotelApproved}
            <span className="admin-kpi-card__value-sub"> / {stats.hotelTotal}</span>
          </div>
          <WorkspaceKpiBar
            segments={[
              { value: stats.hotelApproved, tone: "success", label: m(locale, "admin.kpiHotelsApproved") },
              { value: hotelPending, tone: "warning", label: m(locale, "admin.kpiHotelsPending") }
            ]}
          />
        </article>

        <article className="admin-kpi-card admin-kpi-card--visual">
          <div className="admin-kpi-card__label">{m(locale, "admin.users")}</div>
          <div className="admin-kpi-card__value">{stats.userTotal.toLocaleString()}</div>
          <WorkspaceKpiBar
            segments={[
              { value: stats.usersGuest, tone: "info", label: m(locale, "admin.kpiUsersGuests") },
              { value: stats.usersOwner, tone: "success", label: m(locale, "admin.kpiUsersOwners") },
              { value: stats.usersAdmin, tone: "neutral", label: m(locale, "admin.kpiUsersAdmins") }
            ]}
          />
        </article>

        <article className="admin-kpi-card admin-kpi-card--visual admin-kpi-card--brand">
          <div className="admin-kpi-card__label">{m(locale, "admin.bookingsTotal")}</div>
          <div className="admin-kpi-card__value">{stats.bookingTotal.toLocaleString()}</div>
          <WorkspaceKpiBar
            segments={[
              { value: stats.bookingConfirmed, tone: "success", label: m(locale, "admin.kpiBookingsConfirmed") },
              { value: stats.bookingPending, tone: "warning", label: m(locale, "admin.kpiBookingsPending") },
              { value: stats.bookingCancelled, tone: "danger", label: m(locale, "admin.kpiBookingsCancelled") }
            ]}
          />
        </article>

        <article className="admin-kpi-card admin-kpi-card--visual">
          <div className="admin-kpi-card__label">{m(locale, "admin.revenue30")}</div>
          <div className="admin-kpi-card__value">{formatMoney(stats.revenue30)}</div>
          <div className="admin-kpi-card__meta">
            {m(locale, "admin.commission")}: {formatMoney(stats.commission30)}
            {commissionShare > 0 ? ` · ${commissionShare}%` : ""}
          </div>
          {stats.revenue30 > 0 ? (
            <WorkspaceKpiBar
              single
              segments={[
                { value: stats.revenue30 - stats.commission30, tone: "success", label: m(locale, "admin.kpiRevenueGross") },
                { value: stats.commission30, tone: "info", label: m(locale, "admin.commission") }
              ]}
            />
          ) : null}
        </article>
      </div>

      <div className="admin-attention-panel">
        <div className="admin-attention-panel__head">
          <h3 className="admin-attention-panel__title">{m(locale, "admin.attentionTitle")}</h3>
          {attentionTotal > 0 ? <span className="admin-attention-panel__count">{attentionTotal}</span> : null}
        </div>
        {attentionItems.length ? (
          <ul className="admin-attention-list">
            {attentionItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="admin-attention-item">
                  <span className={`admin-attention-item__icon admin-attention-item__icon--${item.tone}`}>
                    <item.Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="admin-attention-item__body">
                    <span className="admin-attention-item__label">{item.label}</span>
                    <div className="admin-attention-item__hint">{item.hint}</div>
                    <span className="admin-attention-item__action">{m(locale, "admin.attentionOpen")}</span>
                  </span>
                  <span className="admin-attention-item__badge">{item.count}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--admin-text-muted)]" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="admin-attention-empty">{m(locale, "admin.attentionEmpty")}</div>
        )}
      </div>

      {riskNotes.length > 0 && (
        <div className="admin-risk-panel">
          <h3 className="admin-risk-panel__title">{m(locale, "admin.riskHistoryTitle")}</h3>
          <ul className="admin-risk-list">
            {riskNotes.map((note) => (
              <li key={note.id} className="admin-risk-list__item">
                {note.type} · {formatDateTimeShort(locale, note.createdAt)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
