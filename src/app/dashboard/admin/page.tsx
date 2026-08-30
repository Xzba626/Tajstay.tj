import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth/requireAdmin";
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
import { AdminSectionHead } from "@/components/admin/AdminSectionHead";
import { AdminSectionStats } from "@/components/admin/AdminSectionStats";
import { AdminRecordCard } from "@/components/admin/AdminRecordCard";
import { AdminNativeForm } from "@/components/admin/AdminNativeForm";
import { AdminSubmitButton } from "@/components/admin/AdminSubmitButton";
import { isAdminSecurityResetConfigured } from "@/lib/admin-security";

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
    | Promise<{ section?: string; page?: string; q?: string; status?: string; role?: string; paymentStatus?: string; resetToken?: string; resetUser?: string; error?: string; ok?: string }>
    | { section?: string; page?: string; q?: string; status?: string; role?: string; paymentStatus?: string; resetToken?: string; resetUser?: string; error?: string; ok?: string };
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
  const resetToken = (params?.resetToken ?? "").trim();
  const resetUser = Number(params?.resetUser ?? "") || 0;
  const cookieStore = cookies();
  const cookieResetToken = (cookieStore.get("tajstay_admin_reset_token")?.value ?? "").trim();
  const cookieResetUser = Number(cookieStore.get("tajstay_admin_reset_user")?.value ?? "") || 0;
  const effectiveResetToken = cookieResetToken || resetToken;
  const effectiveResetUser = cookieResetUser || resetUser;
  const securityError = (params?.error ?? "").trim();
  const securityOk = (params?.ok ?? "").trim();
  const isDev = process.env.NODE_ENV !== "production";
  const adminSecurityResetAvailable = isAdminSecurityResetConfigured();
  const securityMessage =
    securityError === "security-required"
      ? "Введите текущий пароль и secret word."
      : securityError === "security-password"
        ? "Текущий пароль неверный."
        : securityError === "security-secret"
          ? "Secret word неверный."
          : securityError === "security-update"
            ? "Не удалось сохранить изменения."
            : securityError === "security-update-unique"
              ? "Не удалось сохранить: телефон или email уже используется другим пользователем."
              : securityError === "security-update-notfound"
                ? "Не удалось сохранить: администратор не найден."
                : securityError === "security-reset-denied"
                  ? "Неверный reset secret. Проверьте ADMIN_SECURITY_RESET_SECRET в Vercel."
                  : securityError === "security-reset-password"
                    ? "Укажите новый пароль (минимум 6 символов)."
                    : securityError === "security-reset-secret"
                      ? "Укажите новый secret word (минимум 4 символа)."
                      : securityError === "security-reset-failed"
                        ? "Не удалось выполнить emergency reset."
                        : securityError === "content-save"
                          ? "Не удалось сохранить контент сайта. Проверьте DATABASE_URL и выполните prisma migrate deploy на Vercel."
                          : securityError === "content-required"
                            ? "Заполните обязательные поля баннера."
                            : securityError
                              ? `Security update failed: ${securityError}`
                              : "";
  const securityOkMessage =
    securityOk === "security-reset"
      ? "Emergency reset выполнен. Войдите снова с новым паролем и secret word."
      : securityOk === "security-updated"
        ? "Security updated successfully."
        : securityOk === "content-saved"
          ? "Контент сайта сохранён."
          : "";

  // We keep list item typing flexible because each section uses different Prisma includes.
  let hotels: any[] = [];
  let users: any[] = [];
  let bookings: any[] = [];
  let payments: any[] = [];
  let payouts: any[] = [];
  let refunds: any[] = [];
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

  if (activeSection === "dashboard") {
    const analytics = await Promise.all([
      prisma.hotel.count(),
      prisma.hotel.count({ where: { status: "APPROVED" } }),
      prisma.user.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({
        _sum: { totalPrice: true, commission: true },
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
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
      prisma.booking.count({ where: { paymentStatus: "ON_REVIEW" } })
    ]);
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
    [payments, payouts, refunds] = await Promise.all([
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
    <div className="admin-command-center space-y-8 pb-8 lg:space-y-10 lg:pb-10">
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
            bookingTotal,
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
        <AdminSectionHead title={m(locale, "admin.contentSection")} subtitle={m(locale, "admin.brandHint")} />
        <AdminNativeForm
          action="/api/admin/content/home-banner"
          method="post"
          className="admin-panel admin-form-grid admin-form-grid--2"
        >
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
          <div className="text-sm font-semibold">{m(locale, "admin.brandSection")}</div>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{m(locale, "admin.brandHint")}</p>
          <AdminNativeForm action="/api/admin/content/brand" method="post" className="admin-form-grid admin-form-grid--2 mt-4">
            <label className="admin-field md:col-span-2">
              {m(locale, "admin.brandSiteName")}
              <input name="siteName" defaultValue={content!.brand.siteName} />
            </label>
            <label className="admin-field">
              {m(locale, "admin.brandLogoMain")}
              <input name="logoMainUrl" defaultValue={content!.brand.logoMainUrl} />
            </label>
            <label className="admin-field">
              {m(locale, "admin.brandLogoMark")}
              <input name="logoMarkUrl" defaultValue={content!.brand.logoMarkUrl} />
            </label>
            <label className="admin-field md:col-span-2">
              {m(locale, "admin.brandFavicon")}
              <input name="faviconUrl" defaultValue={content!.brand.faviconUrl} />
            </label>
            <AdminSubmitButton className="md:col-span-2" loadingLabel={m(locale, "admin.processing")}>
              {m(locale, "admin.saveBrand")}
            </AdminSubmitButton>
          </AdminNativeForm>
        </div>

        <div className="admin-panel">
          <div className="text-sm font-semibold">{m(locale, "admin.paymentCatalogTitle")}</div>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{m(locale, "admin.paymentCatalogHint")}</p>
          <AdminNativeForm action="/api/admin/content/payment-methods" method="post" className="mt-4 space-y-3">
            <input
              name="methods"
              defaultValue={content!.paymentCatalog.methods.join(", ")}
              placeholder={m(locale, "admin.paymentCatalogPlaceholder")}
            />
            <AdminSubmitButton loadingLabel={m(locale, "admin.processing")}>{m(locale, "admin.paymentCatalogSave")}</AdminSubmitButton>
          </AdminNativeForm>
        </div>

        <div className="admin-panel">
          <div className="text-sm font-semibold">{m(locale, "admin.supportContactsTitle")}</div>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{m(locale, "admin.supportContactsHint")}</p>
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
            <label className="admin-field">
              {m(locale, "admin.securityCurrentPassword")}
              <input name="currentPassword" type="password" required />
            </label>
            <label className="admin-field">
              {m(locale, "admin.securitySecretWord")}
              <input name="secretWord" type="password" required={!isDev} />
              {isDev && <div className="mt-1 text-xs">{m(locale, "admin.securityDevSecretHint")}</div>}
            </label>
            <label className="admin-field">
              {m(locale, "admin.securityNewPassword")}
              <input name="newPassword" type="password" minLength={6} />
            </label>
            <label className="admin-field">
              {m(locale, "admin.securityNewSecretWord")}
              <input name="newSecretWord" type="password" />
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
                <label className="admin-field">
                  {m(locale, "admin.securityNewPassword")}
                  <input name="newPassword" type="password" required minLength={6} />
                </label>
                <label className="admin-field">
                  {m(locale, "admin.securityNewSecretWord")}
                  <input name="newSecretWord" type="password" required minLength={4} />
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
            {ownerApplications.map((app) => (
              <AdminRecordCard key={app.id} highlight="warning">
                <div className="admin-record-card__title-row">
                  <div className="admin-record-card__title">{app.fullName}</div>
                  <StatusBadge variant="warning">{tStatus("PENDING")}</StatusBadge>
                </div>
                <div className="admin-record-card__meta">
                  {app.businessName} · {app.phone} · {app.email}
                  <br />
                  {m(locale, "admin.owner")}: {app.user.name} (id {app.userId})
                </div>
                {app.documentUrl && (
                  <div className="admin-record-card__actions">
                    <a className="admin-link text-sm" href={app.documentUrl} target="_blank" rel="noreferrer">
                      {m(locale, "admin.document")}
                    </a>
                  </div>
                )}
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
            ))}
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
                <AdminNativeForm action="/api/admin/hotels/moderate" method="post" className="admin-record-card__actions">
                  <input type="hidden" name="id" value={hotel.id} />
                  <select name="status" defaultValue={hotel.status} className="admin-field min-w-[8rem]">
                    <option value="PENDING">{tStatus("PENDING")}</option>
                    <option value="APPROVED">{tStatus("APPROVED")}</option>
                    <option value="REJECTED">{tStatus("REJECTED")}</option>
                  </select>
                  <AdminSubmitButton loadingLabel={m(locale, "admin.processing")}>{m(locale, "admin.save")}</AdminSubmitButton>
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
        <div className="admin-data-table" style={{ ["--admin-table-cols" as string]: "1.2fr 1fr 1fr 1.4fr" }}>
          <div className="admin-data-table__head">
            <div>{m(locale, "admin.name")}</div>
            <div>{m(locale, "profile.email")}</div>
            <div>{m(locale, "profile.phone")}</div>
            <div>{m(locale, "admin.management")}</div>
          </div>
          <ul className="admin-data-table__body">
            {users.map((u) => (
              <li key={u.id} className="admin-data-table__row">
                <div className="admin-data-table__cells">
                  <div>
                    <span className="admin-data-table__cell-label">{m(locale, "admin.name")}</span>
                    <div className="admin-chip-row">
                      <span className="font-medium">{u.name}</span>
                      <StatusBadge variant={roleVariant(u.role)}>{tRole(u.role)}</StatusBadge>
                      {u.isBanned && <StatusBadge variant="danger">{m(locale, "admin.ban")}</StatusBadge>}
                    </div>
                  </div>
                  <div>
                    <span className="admin-data-table__cell-label">{m(locale, "profile.email")}</span>
                    <div className="text-sm">{u.email ?? "—"}</div>
                  </div>
                  <div>
                    <span className="admin-data-table__cell-label">{m(locale, "profile.phone")}</span>
                    <div className="text-sm">{u.phone}</div>
                  </div>
                  <div>
                    <span className="admin-data-table__cell-label">{m(locale, "admin.management")}</span>
                    <AdminNativeForm action="/api/admin/users/update" method="post" className="admin-record-card__actions">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role} className="admin-field min-w-[6rem]">
                        <option value="GUEST">{tRole("GUEST")}</option>
                        <option value="OWNER">{tRole("OWNER")}</option>
                        <option value="ADMIN">{tRole("ADMIN")}</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" name="isBanned" defaultChecked={u.isBanned} />
                        {m(locale, "admin.ban")}
                      </label>
                      <AdminSubmitButton variant="primary" className="admin-btn--sm" loadingLabel={m(locale, "admin.processing")}>
                        {m(locale, "admin.save")}
                      </AdminSubmitButton>
                    </AdminNativeForm>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {!users.length && <EmptyState title={m(locale, "admin.emptyResults")} description={m(locale, "admin.emptyResultsHint")} />}
        <Pagination page={page} totalPages={totalPages} />
      </section>}

      {activeSection === "owner-access" && <section id="owner-access" className="admin-section scroll-mt-28">
        <AdminSectionHead title={m(locale, "admin.ownerAccessSection")} subtitle={m(locale, "admin.ownerAccessHint")} />
        {effectiveResetToken && effectiveResetUser ? (
          <div className="admin-alert admin-alert--success">
            <div className="font-semibold">{m(locale, "admin.resetLinkReady")}</div>
            <div className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-[12px] ring-1 ring-[var(--admin-accent-border)]">
              {`/auth/reset-password#token=${effectiveResetToken}`}
            </div>
          </div>
        ) : null}
        <AdminDataToolbar
          section="owner-access"
          submitLabel={m(locale, "search.search")}
          fields={[{ kind: "search", name: "q", placeholder: m(locale, "admin.searchPlaceholderOwners") }]}
        />
        <div className="admin-record-grid">
          {users.map((u) => (
            <AdminRecordCard key={u.id}>
              <div className="admin-record-card__title-row">
                <div className="admin-record-card__title">{u.name}</div>
                <StatusBadge variant={roleVariant(u.role)}>{tRole(u.role)}</StatusBadge>
              </div>
              <AdminNativeForm action="/api/admin/users/credentials" method="post" className="admin-form-grid admin-form-grid--2 mt-3">
                <input type="hidden" name="id" value={u.id} />
                <label className="admin-field">
                  {m(locale, "admin.loginPhone")}
                  <input name="phone" type="text" defaultValue={u.phone} required />
                </label>
                <label className="admin-field">
                  {m(locale, "profile.email")}
                  <input name="email" type="email" defaultValue={u.email ?? ""} placeholder="owner@example.com" />
                </label>
                <AdminSubmitButton className="md:col-span-2" loadingLabel={m(locale, "admin.processing")}>
                  {m(locale, "admin.saveOwnerAccess")}
                </AdminSubmitButton>
              </AdminNativeForm>
              <AdminNativeForm action="/api/admin/users/reset-password" method="post" className="mt-3">
                <input type="hidden" name="id" value={u.id} />
                <AdminSubmitButton variant="secondary" className="admin-btn--sm" loadingLabel={m(locale, "admin.processing")}>
                  {m(locale, "admin.generateResetLink")}
                </AdminSubmitButton>
              </AdminNativeForm>
            </AdminRecordCard>
          ))}
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
        <div className="admin-record-grid">
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
        <section id="finance" className="admin-section scroll-mt-28">
          <AdminSectionHead title={m(locale, "admin.financeSection")} subtitle={m(locale, "admin.financeSubtitle")} />
          <AdminSectionStats
            stats={[
              { label: m(locale, "admin.financePayments"), value: payments.length, tone: "accent" },
              { label: m(locale, "admin.financePayouts"), value: payouts.length, tone: "info" },
              { label: m(locale, "admin.financeRefunds"), value: refunds.length, tone: "warning" }
            ]}
          />

          <div className="admin-finance-grid">
            <div className="admin-finance-column">
              <h3 className="admin-finance-column__title">{m(locale, "admin.financePayments")}</h3>
              {payments.map((p) => (
                <div key={p.id} className="admin-finance-entry">
                  <div className="admin-finance-entry__top">
                    <div className="admin-finance-entry__amount">
                      {p.amount} {p.currency}
                    </div>
                    <StatusBadge variant={paymentStatusVariant(p.status)}>{p.status}</StatusBadge>
                  </div>
                  <div className="mt-1">{p.booking?.room?.hotel?.name ?? "—"} · {p.provider}/{p.method}</div>
                  <div className="mt-1 text-[var(--admin-text-muted)]">
                    {m(locale, "admin.financeGuest")}: {p.booking?.user?.name ?? "—"} · #{p.bookingId}
                  </div>
                </div>
              ))}
              {!payments.length && <div className="admin-empty-inline">{m(locale, "admin.financeEmptyPayments")}</div>}
            </div>

            <div className="admin-finance-column">
              <h3 className="admin-finance-column__title">{m(locale, "admin.financePayouts")}</h3>
              {payouts.map((po) => (
                <div key={po.id} className="admin-finance-entry">
                  <div className="admin-finance-entry__top">
                    <div className="admin-finance-entry__amount">
                      {po.amount} {po.currency}
                    </div>
                    <span>{po.status}</span>
                  </div>
                  <div className="mt-1">
                    {m(locale, "admin.financeOwner")}: {po.owner?.name ?? "—"} · {po.booking?.room?.hotel?.name ?? "—"}
                  </div>
                  <div className="mt-1 text-[var(--admin-text-muted)]">
                    {m(locale, "admin.financeBooking")} #{po.bookingId}
                  </div>
                </div>
              ))}
              {!payouts.length && <div className="admin-empty-inline">{m(locale, "admin.financeEmptyPayouts")}</div>}
            </div>

            <div className="admin-finance-column">
              <h3 className="admin-finance-column__title">{m(locale, "admin.financeRefunds")}</h3>
              {refunds.map((r) => (
                <div key={r.id} className="admin-finance-entry">
                  <div className="admin-finance-entry__top">
                    <div className="admin-finance-entry__amount">
                      {r.amount} {r.currency}
                    </div>
                    <span>{r.status}</span>
                  </div>
                  <div className="mt-1">
                    {m(locale, "admin.financePayment")} #{r.paymentId}
                  </div>
                  <div className="mt-1 text-[var(--admin-text-muted)]">
                    {m(locale, "admin.financeReason")}: {r.reason ?? "—"}
                  </div>
                </div>
              ))}
              {!refunds.length && <div className="admin-empty-inline">{m(locale, "admin.financeEmptyRefunds")}</div>}
            </div>
          </div>
        </section>
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
