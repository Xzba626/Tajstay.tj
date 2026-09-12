import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { resolveIdentityCapabilities, signInMethodLabel } from "@/lib/auth/identityMethods";
import { parseOwnerApplicationMeta } from "@/lib/owner/applicationMeta";
import { AdminBookingPayCountdown } from "@/components/admin/AdminBookingPayCountdown";
import { AdminOwnerApplicationActions } from "@/components/admin/AdminOwnerApplicationActions";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { formatDateTimeShort } from "@/lib/i18n/format";
import {
  StatusBadge,
  bookingStatusVariant,
  complaintStatusVariant,
  hotelStatusVariant,
  paymentStatusVariant,
  roleVariant
} from "@/components/ui/StatusBadge";
import { getSiteContent } from "@/lib/site-content";
import { AdminDataToolbar } from "@/components/admin/AdminDataToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { scoreHotelRisk } from "@/lib/services/riskScoring";
import { deriveEscrowState } from "@/lib/domain/booking";
import { notificationText } from "@/lib/notifications/text";
import { AdminDashboardOverview } from "@/components/admin/AdminDashboardOverview";
import { AdminFinanceSection } from "@/components/admin/AdminFinanceSection";
import { AdminSectionHead } from "@/components/admin/AdminSectionHead";
import { AdminSectionStats } from "@/components/admin/AdminSectionStats";
import { AdminRecordCard } from "@/components/admin/AdminRecordCard";
import { AdminNativeForm } from "@/components/admin/AdminNativeForm";
import { AdminSubmitButton } from "@/components/admin/AdminSubmitButton";
import { isAdminSecurityResetConfigured } from "@/lib/admin-security";
import { getPlatformSetting } from "@/lib/services/subscription";
import { formatStayDay } from "@/lib/i18n/format";

export const dynamic = "force-dynamic";

type AdminSection =
  | "dashboard"
  | "content"
  | "applications"
  | "hotels"
  | "users"
  | "owner-access"
  | "bookings"
  | "finance"
  | "notifications"
  | "complaints";

const VALID_SECTIONS = new Set<AdminSection>([
  "dashboard",
  "content",
  "applications",
  "hotels",
  "users",
  "owner-access",
  "bookings",
  "finance",
  "notifications",
  "complaints"
]);

export default async function AdminDashboardPage({
  searchParams
}: {
  searchParams?:
    | Promise<{ section?: string; page?: string; q?: string; status?: string; role?: string; paymentStatus?: string; resetToken?: string; resetUser?: string; error?: string; ok?: string; form?: string }>
    | { section?: string; page?: string; q?: string; status?: string; role?: string; paymentStatus?: string; resetToken?: string; resetUser?: string; error?: string; ok?: string; form?: string };
}) {
  const admin = await requireAdmin();
  const locale = getLocale();
  const params = searchParams ? await searchParams : undefined;
  const sectionParam = params?.section;
  const activeSection: AdminSection = sectionParam && VALID_SECTIONS.has(sectionParam as AdminSection) ? (sectionParam as AdminSection) : "dashboard";
  const tStatus = (status: string) => m(locale, `status.${status}`);
  const tRole = (role: string) => m(locale, `roles.${role}`);

  const pageSize = 20;
  const page = Math.max(1, Number(params?.page ?? "1") || 1);
  const q = (params?.q ?? "").trim();
  const status = (params?.status ?? "").trim();
  const role = (params?.role ?? "").trim();
  const paymentStatus = (params?.paymentStatus ?? "").trim();
  const securityError = (params?.error ?? "").trim();
  const securityOk = (params?.ok ?? "").trim();
  // Which content card actually submitted - scopes the ok/error message to that one card instead
  // of every card on this page sharing one generic status (previously caused a save on one form,
  // e.g. brand or payment catalog, to show its "saved" toast under an unrelated card like Security).
  const contentForm = (params?.form ?? "").trim();
  const adminSecurityResetAvailable = isAdminSecurityResetConfigured();
  const securityMessage =
    securityError === "security-required"
      ? m(locale, "admin.securityRequiredMsg")
      : securityError === "security-password"
        ? m(locale, "admin.securityPasswordMsg")
        : securityError === "security-update"
          ? m(locale, "admin.securityUpdateMsg")
          : securityError === "security-update-unique"
            ? m(locale, "admin.securityUniqueMsg")
            : securityError === "security-update-notfound"
              ? m(locale, "admin.securityNotFoundMsg")
              : securityError === "security-reset-denied"
                ? m(locale, "admin.securityResetDeniedMsg")
                : securityError === "security-reset-password"
                  ? m(locale, "admin.securityResetPasswordMsg")
                  : securityError === "security-reset-failed"
                    ? m(locale, "admin.securityResetFailedMsg")
                    : securityError === "recovery_rate_limited"
                      ? m(locale, "admin.recoveryRateLimitedMsg")
                      : securityError === "recovery_no_email"
                        ? m(locale, "admin.recoveryNoEmailMsg")
                        : securityError === "recovery_delivery"
                          ? m(locale, "admin.recoveryDeliveryMsg")
                          : securityError === "recovery_banned"
                            ? m(locale, "admin.recoveryBannedMsg")
                            : securityError === "recovery_no_password_credential"
                              ? m(locale, "admin.noPasswordCredentialHint")
                              : securityError === "credentials_disabled"
                                ? m(locale, "admin.credentialsDisabledMsg")
                                : securityError && contentForm !== "home-banner" && contentForm !== "support" && contentForm !== "legal"
                                  ? `Security update failed: ${securityError}`
                                  : "";
  const securityOkMessage =
    securityOk === "security-reset"
      ? m(locale, "admin.securityResetOkMsg")
      : securityOk === "security-updated"
        ? m(locale, "admin.securityUpdatedOkMsg")
        : securityOk === "recovery_sent"
          ? m(locale, "admin.recoverySentOkMsg")
          : "";

  // Generic content-card save status (home banner / support / legal), scoped by `form` to the
  // card that actually submitted - see contentForm above.
  function contentStatusFor(formKey: "home-banner" | "support" | "legal") {
    if (contentForm !== formKey) return { ok: false, error: false, message: "" };
    if (securityOk === "content-saved") return { ok: true, error: false, message: m(locale, "admin.contentSavedMsg") };
    if (securityError === "content-save") return { ok: false, error: true, message: m(locale, "admin.contentSaveFailedMsg") };
    if (securityError === "content-required") return { ok: false, error: true, message: m(locale, "admin.contentRequiredMsg") };
    return { ok: false, error: false, message: "" };
  }

  // We keep list item typing flexible because each section uses different Prisma includes.
  let hotels: any[] = [];
  let users: any[] = [];
  let bookings: any[] = [];
  let payments: any[] = [];
  let payouts: any[] = [];
  let refunds: any[] = [];
  let platformSetting: Awaited<ReturnType<typeof getPlatformSetting>> | null = null;
  let hotelSubscriptions: any[] = [];
  let notes: any[] = [];
  let complaints: any[] = [];
  let unreadCount = 0;
  let riskNotes: any[] = [];
  let ownerApplications: any[] = [];
  let content: Awaited<ReturnType<typeof getSiteContent>> | null = null;

  let hotelTotal = 0;
  let hotelApproved = 0;
  let userTotal = 0;
  let bookingTotal = 0;
  let bookingAgg: { _sum: { totalPrice: unknown; commission: unknown } } = { _sum: { totalPrice: 0, commission: 0 } };

  let totalRows = 0;
  let totalPages = 1;

  let pendingApplications = 0;
  let pendingHotels = 0;
  let openComplaints = 0;
  let unreadNotifications = 0;
  let bookingsOnReview = 0;
  let usersGuest = 0;
  let usersOwner = 0;
  let usersAdmin = 0;
  let bookingConfirmed = 0;
  let bookingPending = 0;
  let bookingCancelled = 0;

  if (activeSection === "dashboard") {
    const analytics = await Promise.all([
      prisma.hotel.count(),
      prisma.hotel.count({ where: { status: "APPROVED" } }),
      prisma.user.count(),
      prisma.booking.count(),
      // CANONICAL DEFINITION — "Оборот 30 дней" / "30-day volume" (admin.revenue30):
      //   sum(totalPrice) for bookings whose CREATION date (Booking.createdAt — the only
      //   period-anchor timestamp this model has; there is no confirmedAt/paidAt field) falls
      //   in the trailing 30 days, EXCLUDING statuses that never became real committed demand
      //   (CANCELLED, REJECTED, EXPIRED). WAITING_PAYMENT/PENDING_OWNER/ON_REVIEW/WAIT_PROOF are
      //   INCLUDED — this is booking-creation volume/demand, not confirmed-and-paid revenue, and
      //   is deliberately labeled "volume"/"оборот", never "revenue"/"выручка", for that reason.
      //   commission30 (shown as a separate, explicitly labeled sub-metric) is the actual
      //   platform-revenue figure — the two must never be presented as the same number.
      //   If a stricter "paid/confirmed-only" GMV is ever needed, it requires a real paidAt/
      //   confirmedAt column (schema change) — do not approximate one from existing fields.
      prisma.booking.aggregate({
        _sum: { totalPrice: true, commission: true },
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          status: { notIn: ["CANCELLED", "REJECTED", "EXPIRED"] }
        }
      }),
      prisma.notification.findMany({
        where: {
          userId: admin.id,
          type: { startsWith: "RISK_FLAG_HOTEL:" }
        },
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      prisma.ownerApplication.count({ where: { status: OWNER_APPLICATION_STATUS.PENDING } }),
      prisma.hotel.count({ where: { status: "PENDING" } }),
      prisma.complaint.count({ where: { status: { not: "RESOLVED" } } }),
      prisma.notification.count({
        where: {
          userId: admin.id,
          isRead: false,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      }),
      prisma.booking.count({ where: { paymentStatus: "ON_REVIEW" } }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.booking.groupBy({ by: ["status"], _count: { _all: true } })
    ]);
    const bookingStatusGroups = analytics.pop() as Array<{ status: string; _count: { _all: number } }>;
    const userRoleGroups = analytics.pop() as Array<{ role: string; _count: { _all: number } }>;
    [
      hotelTotal,
      hotelApproved,
      userTotal,
      bookingTotal,
      bookingAgg,
      riskNotes,
      pendingApplications,
      pendingHotels,
      openComplaints,
      unreadNotifications,
      bookingsOnReview
    ] = analytics as any;

    const sumBookingStatus = (statuses: string[]) =>
      bookingStatusGroups
        .filter((row) => statuses.includes(row.status))
        .reduce((sum, row) => sum + row._count._all, 0);

    // Buckets must cover every BOOKING_STATUS value (src/lib/domain/booking.ts) exactly once —
    // "PENDING" was never a real status (leftover from an older model) and WAITING_PAYMENT (the
    // 2026 chat-first lifecycle's initial state) was missing entirely, so bookings sitting in it
    // counted toward the headline total but vanished from every donut segment.
    bookingConfirmed = sumBookingStatus(["CONFIRMED", "COMPLETED", "CHECKED_IN"]);
    bookingPending = sumBookingStatus(["WAITING_PAYMENT", "PENDING_OWNER", "ON_REVIEW", "WAIT_PROOF"]);
    bookingCancelled = sumBookingStatus(["CANCELLED", "REJECTED", "EXPIRED"]);

    usersGuest = userRoleGroups.find((row) => row.role === "GUEST")?._count._all ?? 0;
    usersOwner = userRoleGroups.find((row) => row.role === "OWNER")?._count._all ?? 0;
    usersAdmin = userRoleGroups.find((row) => row.role === "ADMIN")?._count._all ?? 0;
  } else if (activeSection === "content") {
    content = await getSiteContent();
  } else if (activeSection === "applications") {
    ownerApplications = await prisma.ownerApplication.findMany({
      where: { status: OWNER_APPLICATION_STATUS.PENDING },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    });
  } else if (activeSection === "hotels") {
    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [{ name: { contains: q } }, { city: { contains: q } }, { owner: { name: { contains: q } } }]
          }
        : {})
    } as any;
    totalRows = await prisma.hotel.count({ where });
    totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    hotels = await prisma.hotel.findMany({
      where,
      include: { owner: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
  } else if (activeSection === "users") {
    const where = {
      ...(role ? { role } : {}),
      ...(q
        ? {
            OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }]
          }
        : {})
    } as any;
    totalRows = await prisma.user.count({ where });
    totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
  } else if (activeSection === "owner-access") {
    const where = {
      role: "OWNER",
      ...(q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] } : {})
    } as any;
    totalRows = await prisma.user.count({ where });
    totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    users = await prisma.user.findMany({
      where,
      include: { accounts: { select: { provider: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
  } else if (activeSection === "bookings") {
    const where = {
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(q
        ? {
            OR: [{ phone: { contains: q } }, { user: { name: { contains: q } } }, { room: { hotel: { name: { contains: q } } } }]
          }
        : {})
    } as any;
    totalRows = await prisma.booking.count({ where });
    totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    bookings = await prisma.booking.findMany({
      where,
      include: { room: { include: { hotel: true } }, user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
  } else if (activeSection === "finance") {
    [payments, payouts, refunds, platformSetting, hotelSubscriptions] = await Promise.all([
      prisma.payment.findMany({
        include: { booking: { include: { room: { include: { hotel: true } }, user: true } } },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      prisma.payout.findMany({
        include: { booking: { include: { room: { include: { hotel: true } } } }, owner: true },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      prisma.refund.findMany({
        include: { payment: { include: { booking: { include: { user: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      getPlatformSetting(),
      prisma.hotelSubscription.findMany({
        include: { hotel: { select: { id: true, name: true, ownerId: true, owner: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 50
      })
    ]);
  } else if (activeSection === "notifications") {
    unreadCount = await prisma.notification.count({
      where: {
        userId: admin.id,
        isRead: false,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    });
    totalRows = await prisma.notification.count();
    totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    notes = await prisma.notification.findMany({
      include: {
        booking: { include: { user: true, room: { include: { hotel: true } } } },
        user: true
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
  } else if (activeSection === "complaints") {
    const where = {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ message: { contains: q } }, { user: { name: { contains: q } } }, { booking: { phone: { contains: q } } }] } : {})
    } as any;
    totalRows = await prisma.complaint.count({ where });
    totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    complaints = await prisma.complaint.findMany({
      where,
      include: { user: true, booking: { include: { room: { include: { hotel: true } } } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
  }

  return (
    <div className="admin-command-center space-y-4 pb-4 lg:space-y-10 lg:pb-10">
      <header className="admin-page-header">
        <h1 className="admin-page-header__title">{m(locale, "admin.pageTitle")}</h1>
        <p className="admin-page-header__subtitle">{m(locale, "admin.pageSubtitle")}</p>
      </header>

      {activeSection === "dashboard" && (
        <AdminDashboardOverview
          locale={locale}
          basePath="/dashboard/admin"
          stats={{
            hotelTotal,
            hotelApproved,
            userTotal,
            usersGuest,
            usersOwner,
            usersAdmin,
            bookingTotal,
            bookingConfirmed,
            bookingPending,
            bookingCancelled,
            revenue30: Number(bookingAgg._sum.totalPrice ?? 0),
            commission30: Number(bookingAgg._sum.commission ?? 0),
            pendingApplications,
            pendingHotels,
            openComplaints,
            unreadNotifications,
            bookingsOnReview
          }}
          riskNotes={riskNotes}
        />
      )}

      {activeSection === "content" && <section id="content" className="admin-section scroll-mt-28">
        <AdminSectionHead title={m(locale, "admin.contentSection")} subtitle={m(locale, "admin.contentSectionHint")} />
        <AdminNativeForm
          action="/api/admin/content/home-banner"
          method="post"
          className="admin-panel admin-form-grid admin-form-grid--2"
        >
          {contentStatusFor("home-banner").message && (
            <div
              className={`admin-alert md:col-span-2 ${contentStatusFor("home-banner").error ? "admin-alert--error" : "admin-alert--success"}`}
            >
              {contentStatusFor("home-banner").message}
            </div>
          )}
          <label className="admin-field">
            {m(locale, "admin.bannerTitle")}
            <input name="title" defaultValue={content!.homeBanner.title} required />
          </label>
          <label className="admin-field">
            {m(locale, "admin.bannerButton")}
            <input name="ctaText" defaultValue={content!.homeBanner.ctaText} required />
          </label>
          <label className="admin-field md:col-span-2">
            {m(locale, "admin.bannerSubtitle")}
            <textarea name="subtitle" defaultValue={content!.homeBanner.subtitle} required rows={3} />
          </label>
          <label className="admin-field md:col-span-2">
            {m(locale, "admin.bannerLink")}
            <input name="ctaHref" defaultValue={content!.homeBanner.ctaHref} />
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="enabled" defaultChecked={content!.homeBanner.enabled} />
            {m(locale, "admin.bannerEnabled")}
          </label>
          <AdminSubmitButton className="md:col-span-2" loadingLabel={m(locale, "admin.processing")}>
            {m(locale, "admin.saveContent")}
          </AdminSubmitButton>
        </AdminNativeForm>

        <div className="admin-panel">
          <div className="text-sm font-semibold">{m(locale, "admin.supportContactsTitle")}</div>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{m(locale, "admin.supportContactsHint")}</p>
          {contentStatusFor("support").message && (
            <div className={`admin-alert mt-3 ${contentStatusFor("support").error ? "admin-alert--error" : "admin-alert--success"}`}>
              {contentStatusFor("support").message}
            </div>
          )}
          <AdminNativeForm action="/api/admin/content/support" method="post" className="admin-form-grid admin-form-grid--2 mt-4">
            <label className="admin-field md:col-span-2">
              {m(locale, "admin.supportTitleLabel")}
              <input name="supportTitle" defaultValue={content!.support.supportTitle} />
            </label>
            <label className="admin-field">
              Email
              <input name="email" defaultValue={content!.support.email} placeholder="support@tajstay.tj" />
            </label>
            <label className="admin-field">
              {m(locale, "profile.phone")}
              <input name="phone" defaultValue={content!.support.phone} placeholder="+992 ..." />
            </label>
            <label className="admin-field">
              WhatsApp
              <input name="whatsapp" defaultValue={content!.support.whatsapp} placeholder="https://wa.me/992..." />
            </label>
            <label className="admin-field">
              Telegram
              <input name="telegram" defaultValue={content!.support.telegram} placeholder="https://t.me/..." />
            </label>
            <label className="admin-field">
              Instagram
              <input name="instagram" defaultValue={content!.support.instagram} placeholder="https://instagram.com/..." />
            </label>
            <label className="admin-field">
              {m(locale, "admin.supportWorkingHours")}
              <input name="workingHours" defaultValue={content!.support.workingHours} placeholder="09:00–21:00" />
            </label>
            <AdminSubmitButton className="md:col-span-2" loadingLabel={m(locale, "admin.processing")}>
              {m(locale, "admin.supportContactsSave")}
            </AdminSubmitButton>
          </AdminNativeForm>
        </div>

        <div className="admin-panel">
          <div className="text-sm font-semibold">{m(locale, "admin.legalPagesTitle")}</div>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{m(locale, "admin.legalPagesHint")}</p>
          {contentStatusFor("legal").message && (
            <div className={`admin-alert mt-3 ${contentStatusFor("legal").error ? "admin-alert--error" : "admin-alert--success"}`}>
              {contentStatusFor("legal").message}
            </div>
          )}
          <AdminNativeForm action="/api/admin/content/legal" method="post" className="mt-4 space-y-3">
            <label className="admin-field">
              {m(locale, "admin.legalPrivacyLabel")}
              <textarea name="privacyText" defaultValue={content!.legal.privacyText} rows={8} />
            </label>
            <label className="admin-field">
              {m(locale, "admin.legalTermsLabel")}
              <textarea name="termsText" defaultValue={content!.legal.termsText} rows={8} />
            </label>
            <AdminSubmitButton loadingLabel={m(locale, "admin.processing")}>{m(locale, "admin.legalPagesSave")}</AdminSubmitButton>
          </AdminNativeForm>
        </div>

        <div className="admin-panel">
          <div className="text-sm font-semibold">{m(locale, "admin.securitySectionTitle")}</div>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{m(locale, "admin.securitySectionHint")}</p>
          <p className="mt-2 text-xs text-[var(--admin-text-muted)]">{m(locale, "admin.securityCurrentPasswordHint")}</p>
          {securityError && <div className="admin-alert admin-alert--error mt-3">{securityMessage}</div>}
          {securityOk && securityOkMessage && <div className="admin-alert admin-alert--success mt-3">{securityOkMessage}</div>}
          <AdminNativeForm action="/api/admin/security/update" method="post" className="admin-form-grid admin-form-grid--2 mt-4">
            <label className="admin-field">
              {m(locale, "admin.securityNewPhone")}
              <input name="phone" defaultValue={admin.phone} />
            </label>
            <label className="admin-field">
              {m(locale, "admin.securityNewEmail")}
              <input name="email" type="email" defaultValue={admin.email ?? ""} />
            </label>
            <label className="admin-field md:col-span-2">
              {m(locale, "admin.securityCurrentPassword")}
              <input name="currentPassword" type="password" required autoComplete="current-password" />
            </label>
            <label className="admin-field md:col-span-2">
              {m(locale, "admin.securityNewPassword")}
              <input name="newPassword" type="password" minLength={6} autoComplete="new-password" />
            </label>
            <AdminSubmitButton className="md:col-span-2" loadingLabel={m(locale, "admin.processing")}>
              {m(locale, "admin.securitySave")}
            </AdminSubmitButton>
          </AdminNativeForm>

          {adminSecurityResetAvailable && (
            <div className="mt-8 border-t border-[var(--admin-border)] pt-6">
              <div className="text-sm font-semibold">{m(locale, "admin.securityEmergencyTitle")}</div>
              <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{m(locale, "admin.securityEmergencyHint")}</p>
              <AdminNativeForm action="/api/admin/security/reset" method="post" className="admin-form-grid admin-form-grid--2 mt-4">
                <label className="admin-field md:col-span-2">
                  {m(locale, "admin.securityEmergencyResetSecret")}
                  <input name="resetSecret" type="password" required />
                </label>
                <label className="admin-field">
                  {m(locale, "admin.securityNewPhone")}
                  <input name="phone" defaultValue={admin.phone} />
                </label>
                <label className="admin-field">
                  {m(locale, "admin.securityNewEmail")}
                  <input name="email" type="email" defaultValue={admin.email ?? ""} />
                </label>
                <label className="admin-field md:col-span-2">
                  {m(locale, "admin.securityNewPassword")}
                  <input name="newPassword" type="password" required minLength={6} />
                </label>
                <AdminSubmitButton variant="warning" className="md:col-span-2" loadingLabel={m(locale, "admin.processing")}>
                  {m(locale, "admin.securityEmergencyCta")}
                </AdminSubmitButton>
              </AdminNativeForm>
            </div>
          )}
        </div>
      </section>}

      {activeSection === "applications" && <section id="applications" className="admin-section scroll-mt-28">
        <AdminSectionHead
          title={m(locale, "admin.applications")}
          subtitle={m(locale, "admin.applicationsSubtitle")}
          meta={
            ownerApplications.length > 0 ? (
              <AdminSectionStats
                stats={[
                  {
                    label: m(locale, "admin.applications"),
                    value: ownerApplications.length,
                    hint: m(locale, "admin.sectionPendingCount").replace("{count}", String(ownerApplications.length)),
                    tone: "warning"
                  }
                ]}
              />
            ) : null
          }
        />
        {!ownerApplications.length ? (
          <div className="admin-empty-inline">{m(locale, "admin.applicationsEmpty")}</div>
        ) : (
          <div className="admin-record-grid admin-record-grid--2">
            {ownerApplications.map((app) => {
              const meta = parseOwnerApplicationMeta(app.applicationMeta);
              const photoUrl = meta?.uploads?.facade || meta?.uploads?.room || meta?.uploads?.bathroom;
              return (
              <AdminRecordCard key={app.id} highlight="warning">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded photo from arbitrary storage, next/image domain allowlist not worth it for an internal tool
                  <img
                    src={photoUrl}
                    alt={app.businessName}
                    className="mb-3 h-36 w-full rounded-xl object-cover"
                  />
                ) : null}
                <div className="admin-record-card__title-row">
                  <div className="admin-record-card__title">{app.businessName}</div>
                  <StatusBadge variant="warning">{tStatus("PENDING")}</StatusBadge>
                </div>
                <div className="admin-record-card__meta">
                  {meta?.city ?? "—"}
                  {meta?.address ? ` · ${meta.address}` : ""}
                  <br />
                  {app.fullName} · {app.phone} · {app.email}
                </div>
                <AdminOwnerApplicationActions
                  applicationId={app.id}
                  labels={{
                    approve: m(locale, "admin.approve"),
                    reject: m(locale, "admin.reject"),
                    rejectReason: m(locale, "admin.rejectReason"),
                    confirmApproveTitle: m(locale, "admin.confirmApproveTitle"),
                    confirmApproveDesc: m(locale, "admin.confirmApproveDesc"),
                    confirmApproveCta: m(locale, "admin.confirmApproveCta"),
                    cancel: m(locale, "admin.cancel"),
                    processing: m(locale, "admin.processing")
                  }}
                />
              </AdminRecordCard>
              );
            })}
          </div>
        )}
      </section>}

      {activeSection === "hotels" && <section id="hotels" className="admin-section scroll-mt-28">
        <AdminSectionHead
          title={m(locale, "admin.moderateHotels")}
          subtitle={m(locale, "admin.emptyResultsHint")}
          meta={
            <AdminSectionStats
              stats={[
                { label: m(locale, "admin.hotelsTotal"), value: totalRows || hotels.length, hint: m(locale, "admin.hotelsSub") },
                {
                  label: tStatus("PENDING"),
                  value: hotels.filter((h) => h.status === "PENDING").length,
                  tone: hotels.some((h) => h.status === "PENDING") ? "warning" : "default"
                }
              ]}
            />
          }
        />
        <AdminDataToolbar
          section="hotels"
          submitLabel={m(locale, "search.search")}
          fields={[
            { kind: "search", name: "q", placeholder: m(locale, "admin.searchPlaceholder") },
            {
              kind: "select",
              name: "status",
              label: m(locale, "admin.filterStatus"),
              options: [
                { value: "", label: m(locale, "admin.filterAll") },
                { value: "PENDING", label: tStatus("PENDING") },
                { value: "APPROVED", label: tStatus("APPROVED") },
                { value: "REJECTED", label: tStatus("REJECTED") }
              ]
            }
          ]}
        />
        <div className="admin-record-grid admin-record-grid--2">
          {hotels.map((hotel) => {
              const risk = scoreHotelRisk({
                status: hotel.status,
                rating: hotel.rating,
                coverImageUrl: hotel.coverImageUrl,
                ownerVerified: hotel.owner.verified,
                createdAt: hotel.createdAt
              });
              return (
            <AdminRecordCard
              key={hotel.id}
              highlight={risk.level === "HIGH" ? "danger" : risk.level === "MEDIUM" ? "warning" : "default"}
              footer={
                <AdminNativeForm action="/api/admin/hotels/moderate" method="post" className="admin-record-card__actions admin-record-card__actions--column">
                  <input type="hidden" name="id" value={hotel.id} />
                  <input
                    type="text"
                    name="reason"
                    placeholder={m(locale, "admin.hotelModerationReasonPh")}
                    className="admin-field admin-field--full"
                  />
                  <div className="flex gap-2">
                    <select name="status" defaultValue={hotel.status} className="admin-field min-w-[8rem]">
                      <option value="PENDING">{tStatus("PENDING")}</option>
                      <option value="APPROVED">{tStatus("APPROVED")}</option>
                      <option value="REJECTED">{tStatus("REJECTED")}</option>
                    </select>
                    <AdminSubmitButton loadingLabel={m(locale, "admin.processing")}>{m(locale, "admin.save")}</AdminSubmitButton>
                  </div>
                </AdminNativeForm>
              }
            >
              <div className="admin-record-card__title-row">
                <div className="admin-record-card__title">{hotel.name}</div>
                <StatusBadge variant={hotelStatusVariant(hotel.status)}>{tStatus(hotel.status)}</StatusBadge>
              </div>
              <div className="admin-record-card__meta">
                {hotel.city} · {hotel.owner.name}
              </div>
              <div className="admin-chip-row mt-2">
                <span
                  className={`admin-risk-chip ${
                    risk.level === "HIGH" ? "admin-risk-chip--high" : risk.level === "MEDIUM" ? "admin-risk-chip--medium" : "admin-risk-chip--low"
                  }`}
                >
                  {m(locale, "admin.riskLevel").replace("{level}", risk.level).replace("{score}", String(risk.score))}
                </span>
              </div>
              {risk.reasons.length > 0 && (
                <div className="mt-1 text-xs text-[var(--admin-text-muted)]">
                  {m(locale, "admin.riskSignals")}: {risk.reasons.join(", ")}
                </div>
              )}
              {risk.level === "HIGH" && (
                <div className="mt-1 text-xs font-semibold text-red-600">{m(locale, "admin.riskAutoFlag")}</div>
              )}
            </AdminRecordCard>
              );
            })}
        </div>
        {!hotels.length && <EmptyState title={m(locale, "admin.emptyResults")} description={m(locale, "admin.emptyResultsHint")} />}
        <Pagination page={page} totalPages={totalPages} />
      </section>}

      {activeSection === "users" && <section id="users" className="admin-section scroll-mt-28">
        <AdminSectionHead
          title={m(locale, "admin.usersSection")}
          meta={
            <AdminSectionStats
              stats={[{ label: m(locale, "admin.users"), value: totalRows || users.length, hint: m(locale, "admin.kpiRegistered") }]}
            />
          }
        />
        <AdminDataToolbar
          section="users"
          submitLabel={m(locale, "search.search")}
          fields={[
            { kind: "search", name: "q", placeholder: m(locale, "admin.searchPlaceholderUsers") },
            {
              kind: "select",
              name: "role",
              label: m(locale, "admin.filterRole"),
              options: [
                { value: "", label: m(locale, "admin.filterAll") },
                { value: "GUEST", label: tRole("GUEST") },
                { value: "OWNER", label: tRole("OWNER") },
                { value: "ADMIN", label: tRole("ADMIN") }
              ]
            }
          ]}
        />
        <div className="admin-record-grid admin-users-grid">
          {users.map((u) => (
            <AdminRecordCard key={u.id} highlight={u.isBanned ? "danger" : "default"}>
              <div className="admin-record-card__title-row">
                <span className="admin-record-card__title">{u.name}</span>
                <div className="admin-chip-row">
                  <StatusBadge variant={roleVariant(u.role)}>{tRole(u.role)}</StatusBadge>
                  {u.isBanned ? <StatusBadge variant="danger">{m(locale, "admin.ban")}</StatusBadge> : null}
                </div>
              </div>
              <div className="admin-record-card__meta">
                {u.email ?? "—"} · {u.phone}
              </div>
              <AdminNativeForm action="/api/admin/users/update" method="post" className="admin-record-card__actions admin-form-grid admin-form-grid--2 mt-3">
                <input type="hidden" name="id" value={u.id} />
                <label className="admin-field">
                  {m(locale, "admin.filterRole")}
                  <select name="role" defaultValue={u.role}>
                    <option value="GUEST">{tRole("GUEST")}</option>
                    <option value="OWNER">{tRole("OWNER")}</option>
                    <option value="ADMIN">{tRole("ADMIN")}</option>
                  </select>
                </label>
                <label className="admin-field flex items-end gap-2 pb-1">
                  <input type="checkbox" name="isBanned" defaultChecked={u.isBanned} />
                  {m(locale, "admin.ban")}
                </label>
                <AdminSubmitButton variant="primary" className="admin-btn--sm md:col-span-2" loadingLabel={m(locale, "admin.processing")}>
                  {m(locale, "admin.save")}
                </AdminSubmitButton>
              </AdminNativeForm>
            </AdminRecordCard>
          ))}
        </div>
        {!users.length && <EmptyState title={m(locale, "admin.emptyResults")} description={m(locale, "admin.emptyResultsHint")} />}
        <Pagination page={page} totalPages={totalPages} />
      </section>}

      {activeSection === "owner-access" && <section id="owner-access" className="admin-section scroll-mt-28">
        <AdminSectionHead title={m(locale, "admin.ownerAccessSection")} subtitle={m(locale, "admin.ownerAccessHint")} />
        {(securityError === "credentials_disabled" ||
          securityError === "recovery_delivery" ||
          securityError === "recovery_no_email" ||
          securityError === "recovery_rate_limited" ||
          securityError === "recovery_banned" ||
          securityError === "recovery_no_password_credential" ||
          securityError === "recovery_failed") && securityMessage ? (
          <div className="admin-alert admin-alert--error">{securityMessage}</div>
        ) : null}
        {securityOk === "recovery_sent" && securityOkMessage ? (
          <div className="admin-alert admin-alert--success">{securityOkMessage}</div>
        ) : null}
        <AdminDataToolbar
          section="owner-access"
          submitLabel={m(locale, "search.search")}
          fields={[{ kind: "search", name: "q", placeholder: m(locale, "admin.searchPlaceholderOwners") }]}
        />
        <div className="admin-record-grid">
          {users.map((u) => {
            const identity = resolveIdentityCapabilities(u);
            return (
              <AdminRecordCard key={u.id}>
                <div className="admin-record-card__title-row">
                  <div className="admin-record-card__title">{u.name}</div>
                  <StatusBadge variant={roleVariant(u.role)}>{tRole(u.role)}</StatusBadge>
                </div>
                <div className="admin-record-card__meta mt-2 space-y-1">
                  <div>
                    {m(locale, "admin.loginMethod")}: {identity.methods.map(signInMethodLabel).join(", ")}
                  </div>
                  {identity.methods.includes("phone") ? <div>{m(locale, "admin.loginPhone")}: {u.phone}</div> : null}
                  <div>
                    {u.email?.trim() ? `${m(locale, "profile.email")}: ${u.email}` : m(locale, "admin.emailNotSet")}
                  </div>
                </div>
                {identity.canResetPassword ? (
                  <>
                    <p className="mt-3 text-xs text-[var(--admin-text-muted)]">{m(locale, "admin.credentialsDisabledHint")}</p>
                    <AdminNativeForm action="/api/admin/users/reset-password" method="post" className="mt-3">
                      <input type="hidden" name="id" value={u.id} />
                      <AdminSubmitButton variant="secondary" className="admin-btn--sm" loadingLabel={m(locale, "admin.processing")}>
                        {m(locale, "admin.generateResetLink")}
                      </AdminSubmitButton>
                    </AdminNativeForm>
                  </>
                ) : (
                  // Google/Telegram-only account: User.password is a random, unusable placeholder
                  // hash (schema requires it non-null) — there is no real TajStay password to
                  // reset, so offering that action would be confusing, not helpful.
                  <p className="mt-3 text-xs text-[var(--admin-text-muted)]">{m(locale, "admin.noPasswordCredentialHint")}</p>
                )}
              </AdminRecordCard>
            );
          })}
          {!users.length && <EmptyState title={m(locale, "admin.ownerAccessEmpty")} />}
        </div>
        <Pagination page={page} totalPages={totalPages} />
      </section>}

      {activeSection === "bookings" && <section id="bookings" className="admin-section scroll-mt-28">
        <AdminSectionHead
          title={m(locale, "admin.bookingsSection")}
          meta={
            <AdminSectionStats
              stats={[
                { label: m(locale, "admin.bookingsTotal"), value: totalRows || bookings.length },
                {
                  label: tStatus("ON_REVIEW"),
                  value: bookings.filter((b) => b.paymentStatus === "ON_REVIEW" || b.status === "ON_REVIEW").length,
                  tone: bookings.some((b) => b.paymentStatus === "ON_REVIEW") ? "info" : "default"
                }
              ]}
            />
          }
        />
        <AdminDataToolbar
          section="bookings"
          submitLabel={m(locale, "search.search")}
          fields={[
            { kind: "search", name: "q", placeholder: m(locale, "admin.searchPlaceholderBookings") },
            {
              kind: "select",
              name: "status",
              label: m(locale, "admin.filterStatus"),
              options: [
                { value: "", label: m(locale, "admin.filterAll") },
                { value: "PENDING_OWNER", label: tStatus("PENDING_OWNER") },
                { value: "PENDING_PAYMENT", label: tStatus("PENDING_PAYMENT") },
                { value: "WAITING_PAYMENT", label: tStatus("WAITING_PAYMENT") },
                { value: "WAIT_PROOF", label: tStatus("WAIT_PROOF") },
                { value: "ON_REVIEW", label: tStatus("ON_REVIEW") },
                { value: "EXPIRED", label: tStatus("EXPIRED") },
                { value: "CONFIRMED", label: tStatus("CONFIRMED") },
                { value: "COMPLETED", label: tStatus("COMPLETED") },
                { value: "CANCELLED", label: tStatus("CANCELLED") },
                { value: "REJECTED", label: tStatus("REJECTED") }
              ]
            },
            {
              kind: "select",
              name: "paymentStatus",
              label: m(locale, "admin.filterPayment"),
              options: [
                { value: "", label: m(locale, "admin.filterAll") },
                { value: "PENDING", label: tStatus("PENDING") },
                { value: "PAID", label: tStatus("PAID") },
                { value: "FAILED", label: tStatus("FAILED") },
                { value: "REFUNDED", label: tStatus("REFUNDED") }
              ]
            }
          ]}
        />
        <div className="admin-record-grid admin-record-grid--2">
          {bookings.map((b) => (
            <AdminRecordCard
              key={b.id}
              footer={
                <>
                  <div className="admin-record-card__actions">
                    <Link href={`/chat/booking/${b.id}`} className="admin-btn admin-btn--primary admin-btn--sm">
                      {m(locale, "admin.openChat")}
                    </Link>
                    {b.publicCode ? (
                      <Link
                        href={`/payment/${encodeURIComponent(b.publicCode)}`}
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                      >
                        {m(locale, "admin.paymentPage")}
                      </Link>
                    ) : null}
                  </div>
                  <div className="admin-record-card__actions mt-2">
                    <AdminNativeForm action="/api/admin/bookings/payment" method="post" className="admin-record-card__actions">
                      <input type="hidden" name="id" value={b.id} />
                      <select name="paymentStatus" defaultValue={b.paymentStatus} className="admin-field min-w-[6rem]">
                        <option value="PENDING">{tStatus("PENDING")}</option>
                        <option value="PAID">{tStatus("PAID")}</option>
                        <option value="FAILED">{tStatus("FAILED")}</option>
                        <option value="REFUNDED">{tStatus("REFUNDED")}</option>
                      </select>
                      <AdminSubmitButton variant="primary" className="admin-btn--sm" loadingLabel={m(locale, "admin.processing")}>
                        {m(locale, "admin.updatePayment")}
                      </AdminSubmitButton>
                    </AdminNativeForm>
                    <AdminNativeForm action="/api/admin/bookings/complete" method="post">
                      <input type="hidden" name="id" value={b.id} />
                      <AdminSubmitButton variant="warning" className="admin-btn--sm" loadingLabel={m(locale, "admin.processing")}>
                        {m(locale, "admin.confirmBooking")}
                      </AdminSubmitButton>
                    </AdminNativeForm>
                  </div>
                </>
              }
            >
              <div className="admin-record-card__title-row">
                <span className="font-mono text-sm font-semibold">#{b.id}</span>
                {b.publicCode ? <span className="rounded-md bg-[var(--admin-surface-muted)] px-2 py-0.5 font-mono text-xs">{b.publicCode}</span> : null}
                <span className="admin-record-card__title">{b.user.name}</span>
                <StatusBadge variant={bookingStatusVariant(b.status)}>{tStatus(b.status)}</StatusBadge>
                <StatusBadge variant={paymentStatusVariant(b.paymentStatus)}>{tStatus(b.paymentStatus)}</StatusBadge>
              </div>
              <div className="admin-record-card__meta">
                {b.room.hotel.name} · {b.checkIn.toISOString().slice(0, 10)} — {b.checkOut.toISOString().slice(0, 10)} · {b.phone}
                <span className="ml-2 inline-flex items-center gap-1">
                  {m(locale, "admin.payTimer")}:{" "}
                  <AdminBookingPayCountdown
                    expiresAtIso={b.expiresAt ? b.expiresAt.toISOString() : null}
                    active={b.status === "WAITING_PAYMENT" || b.status === "WAIT_PROOF"}
                  />
                </span>
              </div>
              <div className="mt-1 text-sm font-medium">
                {Number(b.totalPrice)} TJS · {m(locale, "admin.commission")} {Number(b.commission)} TJS
              </div>
              <div className="mt-1 text-xs text-[var(--admin-text-muted)]">
                {m(locale, "admin.escrowLabel")}: {deriveEscrowState({ status: b.status, paymentStatus: b.paymentStatus })}
              </div>
            </AdminRecordCard>
          ))}
        </div>
        {!bookings.length && <EmptyState title={m(locale, "admin.emptyResults")} description={m(locale, "admin.emptyResultsHint")} />}
        <Pagination page={page} totalPages={totalPages} />
      </section>}

      {activeSection === "finance" && (
        <>
          <section className="admin-section scroll-mt-28 space-y-3">
            <AdminSectionHead title={m(locale, "admin.subscriptionPricing")} />
            <AdminNativeForm
              action="/api/admin/subscription/price"
              method="post"
              className="admin-panel admin-panel--flat flex flex-wrap items-end gap-3"
            >
              <label className="admin-field w-32">
                {m(locale, "admin.subscriptionMonthlyPrice")}
                <input
                  type="number"
                  name="subscriptionMonthlyPriceTjs"
                  min={0}
                  step="any"
                  defaultValue={platformSetting ? Number(platformSetting.subscriptionMonthlyPriceTjs) : 99}
                />
              </label>
              <AdminSubmitButton loadingLabel={m(locale, "admin.processing")}>{m(locale, "admin.save")}</AdminSubmitButton>
              <span className="text-sm text-[var(--admin-text-muted)]">{m(locale, "admin.subscriptionFreeFirstMonth")}</span>
            </AdminNativeForm>

            {hotelSubscriptions.length > 0 && (
              <div className="admin-record-grid">
                {hotelSubscriptions.map((sub) => (
                  <AdminRecordCard key={sub.id}>
                    <div className="admin-record-card__title-row">
                      <div className="admin-record-card__title">{sub.hotel.name}</div>
                      <StatusBadge
                        variant={
                          sub.status === "ACTIVE"
                            ? "success"
                            : sub.status === "PAST_DUE" || sub.status === "SUSPENDED"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        {m(locale, `owner.subscriptionStatus.${sub.status}`)}
                      </StatusBadge>
                    </div>
                    <div className="admin-record-card__meta">
                      {sub.hotel.owner.name} ·{" "}
                      {sub.status === "TRIAL"
                        ? m(locale, "owner.subscriptionTrialUntil", { date: formatStayDay(locale, sub.trialEndAt) })
                        : sub.currentPeriodEnd
                          ? m(locale, "owner.subscriptionActiveUntil", { date: formatStayDay(locale, sub.currentPeriodEnd) })
                          : ""}
                    </div>
                  </AdminRecordCard>
                ))}
              </div>
            )}
          </section>
          <AdminFinanceSection locale={locale} payments={payments} payouts={payouts} refunds={refunds} />
        </>
      )}

      {activeSection === "notifications" && <section id="notifications" className="admin-section scroll-mt-28">
        <AdminSectionHead
          title={m(locale, "admin.notifications")}
          meta={
            unreadCount > 0 ? (
              <span className="admin-attention-panel__count">{unreadCount}</span>
            ) : (
              <AdminSectionStats stats={[{ label: m(locale, "admin.notifications"), value: totalRows || notes.length }]} />
            )
          }
        />
        <AdminNativeForm action="/api/admin/notifications/cleanup" method="post" className="admin-panel admin-panel--flat flex flex-wrap items-center gap-2">
          <input type="number" min={1} max={3650} defaultValue={30} name="days" className="w-24 admin-field" />
          <AdminSubmitButton variant="destructive" className="admin-btn--sm" loadingLabel={m(locale, "admin.processing")}>
            {m(locale, "admin.deleteOld")}
          </AdminSubmitButton>
        </AdminNativeForm>
        <div className="admin-record-grid">
          {notes.map((n) => (
            <AdminRecordCard key={n.id}>
              <div className="admin-record-card__title">{notificationText(locale, n.type, n.booking?.publicCode ?? null)}</div>
              <div className="admin-record-card__meta">{formatDateTimeShort(locale, n.createdAt)}</div>
              {n.booking ? (
                <div className="mt-2 text-sm">
                  {n.booking.user.name} · {n.booking.room.hotel.name} · {n.booking.checkIn.toISOString().slice(0, 10)} —{" "}
                  {n.booking.checkOut.toISOString().slice(0, 10)} · {n.booking.phone} ·{" "}
                  <StatusBadge variant={paymentStatusVariant(n.booking.paymentStatus)}>{tStatus(n.booking.paymentStatus)}</StatusBadge>
                </div>
              ) : (
                <div className="mt-2 text-sm text-[var(--admin-text-muted)]">
                  {m(locale, "admin.systemNote")} ({m(locale, "admin.noBookingLink")})
                </div>
              )}
            </AdminRecordCard>
          ))}
        </div>
        {!notes.length && <EmptyState title={m(locale, "admin.emptyResults")} description={m(locale, "admin.emptyResultsHint")} />}
        <Pagination page={page} totalPages={totalPages} />
      </section>}

      {activeSection === "complaints" && <section id="complaints" className="admin-section scroll-mt-28">
        <AdminSectionHead
          title={m(locale, "admin.complaints")}
          meta={
            <AdminSectionStats
              stats={[
                {
                  label: m(locale, "admin.complaints"),
                  value: totalRows || complaints.length,
                  tone: complaints.some((c) => c.status !== "RESOLVED") ? "danger" : "default"
                }
              ]}
            />
          }
        />
        <AdminDataToolbar
          section="complaints"
          submitLabel={m(locale, "search.search")}
          fields={[
            { kind: "search", name: "q", placeholder: m(locale, "admin.searchPlaceholderComplaints") },
            {
              kind: "select",
              name: "status",
              label: m(locale, "admin.filterStatus"),
              options: [
                { value: "", label: m(locale, "admin.filterAll") },
                { value: "PENDING", label: tStatus("PENDING") },
                { value: "OPEN", label: tStatus("OPEN") },
                { value: "RESOLVED", label: tStatus("RESOLVED") }
              ]
            }
          ]}
        />
        <div className="admin-record-grid">
          {complaints.map((c) => (
            <AdminRecordCard
              key={c.id}
              highlight={c.status !== "RESOLVED" ? "danger" : "default"}
              footer={
                c.status !== "RESOLVED" ? (
                  <AdminNativeForm action="/api/admin/complaints/resolve" method="post">
                    <input type="hidden" name="id" value={c.id} />
                    <AdminSubmitButton loadingLabel={m(locale, "admin.processing")}>{m(locale, "admin.resolve")}</AdminSubmitButton>
                  </AdminNativeForm>
                ) : undefined
              }
            >
              <div className="admin-record-card__title-row">
                <span className="admin-record-card__title">{c.user.name}</span>
                <StatusBadge variant={complaintStatusVariant(c.status)}>{tStatus(c.status)}</StatusBadge>
              </div>
              <div className="admin-record-card__meta">
                {c.booking.room.hotel.name} · {c.booking.phone} · {c.booking.checkIn.toISOString().slice(0, 10)} —{" "}
                {c.booking.checkOut.toISOString().slice(0, 10)}
              </div>
              <div className="mt-3 whitespace-pre-wrap rounded-lg bg-[var(--admin-surface-muted)] p-3 text-sm">{c.message}</div>
            </AdminRecordCard>
          ))}
        </div>
        {!complaints.length && <EmptyState title={m(locale, "admin.complaintsEmpty")} />}
        <Pagination page={page} totalPages={totalPages} />
      </section>}
    </div>
  );
}
