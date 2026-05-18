import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { AdminBookingPayCountdown } from "@/components/admin/AdminBookingPayCountdown";
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
import { DataToolbar } from "@/components/ui/DataToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { scoreHotelRisk } from "@/lib/services/riskScoring";
import { deriveEscrowState } from "@/lib/domain/booking";
import { notificationText } from "@/lib/notifications/text";

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
                : securityError === "security-update-store-perm"
                  ? "Не удалось сохранить secret word: сервер не имеет прав на запись в папку `data/`."
                  : securityError === "security-update-store-missing"
                    ? "Не удалось сохранить secret word: не найден путь для `data/`."
                    : securityError === "security-update-store"
                      ? "Не удалось сохранить secret word на сервере."
            : securityError
              ? `Security update failed: ${securityError}`
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
      })
    ]);
    [hotelTotal, hotelApproved, userTotal, bookingTotal, bookingAgg, riskNotes] = analytics as any;
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
    <div className="dashboard-skin space-y-12 pb-16 text-slate-100">
      <header className="border-b border-white/10 pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">{m(locale, "admin.pageTitle")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">{m(locale, "admin.pageSubtitle")}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="glass-panel rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-100">{m(locale, "admin.guideOwnersTitle")}</h3>
          <p className="mt-2 text-sm text-slate-300">{m(locale, "admin.guideOwnersText")}</p>
        </article>
        <article className="glass-panel rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-100">{m(locale, "admin.guidePropertiesTitle")}</h3>
          <p className="mt-2 text-sm text-slate-300">{m(locale, "admin.guidePropertiesText")}</p>
        </article>
        <article className="glass-panel rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-100">{m(locale, "admin.guideContentTitle")}</h3>
          <p className="mt-2 text-sm text-slate-300">{m(locale, "admin.guideContentText")}</p>
        </article>
      </section>

      {activeSection === "dashboard" && <section id="dashboard" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-8 w-1 rounded-full bg-emerald-600" aria-hidden />
          <h2 className="text-lg font-bold text-slate-100">{m(locale, "admin.analytics")}</h2>
        </div>
        <div className="liquid-glass rounded-2xl p-6 shadow-md shadow-emerald-900/10">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="quiet-card rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{m(locale, "admin.hotelsTotal")}</div>
              <div className="mt-2 text-3xl font-bold text-slate-100">
                {hotelApproved}
                <span className="text-lg font-medium text-slate-400"> / {hotelTotal}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">{m(locale, "admin.hotelsSub")}</div>
            </div>
            <div className="quiet-card rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{m(locale, "admin.users")}</div>
              <div className="mt-2 text-3xl font-bold text-slate-100">{userTotal}</div>
            </div>
            <div className="quiet-card rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{m(locale, "admin.bookingsTotal")}</div>
              <div className="mt-2 text-3xl font-bold text-slate-100">{bookingTotal}</div>
            </div>
            <div className="quiet-card rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{m(locale, "admin.revenue30")}</div>
              <div className="mt-2 text-3xl font-bold text-slate-100">{Number(bookingAgg._sum.totalPrice ?? 0)} TJS</div>
              <div className="mt-1 text-xs text-slate-400">
                {m(locale, "admin.commission")}: {Number(bookingAgg._sum.commission ?? 0)} TJS
              </div>
            </div>
          </div>
        </div>
        {riskNotes.length > 0 && (
          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-100">Risk history (auto flags)</h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-200">
              {riskNotes.map((note) => (
                <li key={note.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  {note.type} · {formatDateTimeShort(locale, note.createdAt)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>}

      {activeSection === "content" && <section id="content" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-8 w-1 rounded-full bg-emerald-500" aria-hidden />
          <h2 className="text-lg font-bold text-slate-100">{m(locale, "admin.contentSection")}</h2>
        </div>
        <form
          action="/api/admin/content/home-banner"
          method="post"
          className="glass-panel grid gap-3 rounded-2xl p-6 shadow-sm md:grid-cols-2"
        >
          <label className="text-sm text-slate-200">
            {m(locale, "admin.bannerTitle")}
            <input
              name="title"
              defaultValue={content!.homeBanner.title}
              required
              className="ds-input mt-1 w-full px-3 py-2.5"
            />
          </label>
          <label className="text-sm text-slate-200">
            {m(locale, "admin.bannerButton")}
            <input
              name="ctaText"
              defaultValue={content!.homeBanner.ctaText}
              required
              className="ds-input mt-1 w-full px-3 py-2.5"
            />
          </label>
          <label className="text-sm text-slate-200 md:col-span-2">
            {m(locale, "admin.bannerSubtitle")}
            <textarea
              name="subtitle"
              defaultValue={content!.homeBanner.subtitle}
              required
              rows={3}
              className="ds-input mt-1 w-full px-3 py-2.5"
            />
          </label>
          <label className="text-sm text-slate-200 md:col-span-2">
            {m(locale, "admin.bannerLink")}
            <input
              name="ctaHref"
              defaultValue={content!.homeBanner.ctaHref}
              className="ds-input mt-1 w-full px-3 py-2.5"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200 md:col-span-2">
            <input type="checkbox" name="enabled" defaultChecked={content!.homeBanner.enabled} />
            {m(locale, "admin.bannerEnabled")}
          </label>
          <button className="ds-primary-btn rounded-xl px-4 py-2.5 text-sm md:col-span-2">
            {m(locale, "admin.saveContent")}
          </button>
        </form>

        <div className="glass-panel rounded-2xl p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-100">{m(locale, "admin.brandSection")}</div>
          <p className="mt-1 text-sm text-slate-300">{m(locale, "admin.brandHint")}</p>
          <form action="/api/admin/content/brand" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-200 md:col-span-2">
              {m(locale, "admin.brandSiteName")}
              <input
                name="siteName"
                defaultValue={content!.brand.siteName}
                className="ds-input mt-1 w-full px-3 py-2.5"
              />
            </label>
            <label className="text-sm text-slate-200">
              {m(locale, "admin.brandLogoMain")}
              <input
                name="logoMainUrl"
                defaultValue={content!.brand.logoMainUrl}
                className="ds-input mt-1 w-full px-3 py-2.5"
              />
            </label>
            <label className="text-sm text-slate-200">
              {m(locale, "admin.brandLogoMark")}
              <input
                name="logoMarkUrl"
                defaultValue={content!.brand.logoMarkUrl}
                className="ds-input mt-1 w-full px-3 py-2.5"
              />
            </label>
            <label className="text-sm text-slate-200 md:col-span-2">
              {m(locale, "admin.brandFavicon")}
              <input
                name="faviconUrl"
                defaultValue={content!.brand.faviconUrl}
                className="ds-input mt-1 w-full px-3 py-2.5"
              />
            </label>
            <button className="ds-primary-btn rounded-xl px-4 py-2.5 text-sm md:col-span-2">
              {m(locale, "admin.saveBrand")}
            </button>
          </form>
        </div>

        <div className="glass-panel rounded-2xl p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-100">Payment methods catalog</div>
          <p className="mt-1 text-sm text-slate-300">
            Global list of cards and wallets that hotel owners can select for guests.
          </p>
          <form action="/api/admin/content/payment-methods" method="post" className="mt-4 space-y-3">
            <input
              name="methods"
              defaultValue={content!.paymentCatalog.methods.join(", ")}
              className="ds-input w-full px-3 py-2.5"
              placeholder="Visa, Mastercard, Humo, Alif Mobi..."
            />
            <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600">
              Save payment catalog
            </button>
          </form>
        </div>

        <div className="glass-panel rounded-2xl p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-100">Контакты поддержки</div>
          <p className="mt-1 text-sm text-slate-300">Телефон, соцсети и часы работы для страниц `/contacts` и футера.</p>
          <form action="/api/admin/content/support" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-200 md:col-span-2">
              Заголовок блока
              <input name="supportTitle" defaultValue={content!.support.supportTitle} className="ds-input mt-1 w-full px-3 py-2.5" />
            </label>
            <label className="text-sm text-slate-200">
              Email
              <input name="email" defaultValue={content!.support.email} className="ds-input mt-1 w-full px-3 py-2.5" placeholder="support@tajstay.tj" />
            </label>
            <label className="text-sm text-slate-200">
              Телефон
              <input name="phone" defaultValue={content!.support.phone} className="ds-input mt-1 w-full px-3 py-2.5" placeholder="+992 ..." />
            </label>
            <label className="text-sm text-slate-200">
              WhatsApp (ссылка или номер)
              <input name="whatsapp" defaultValue={content!.support.whatsapp} className="ds-input mt-1 w-full px-3 py-2.5" placeholder="https://wa.me/992..." />
            </label>
            <label className="text-sm text-slate-200">
              Telegram (ссылка)
              <input name="telegram" defaultValue={content!.support.telegram} className="ds-input mt-1 w-full px-3 py-2.5" placeholder="https://t.me/..." />
            </label>
            <label className="text-sm text-slate-200">
              Instagram (ссылка)
              <input name="instagram" defaultValue={content!.support.instagram} className="ds-input mt-1 w-full px-3 py-2.5" placeholder="https://instagram.com/..." />
            </label>
            <label className="text-sm text-slate-200">
              Часы работы
              <input name="workingHours" defaultValue={content!.support.workingHours} className="ds-input mt-1 w-full px-3 py-2.5" placeholder="Ежедневно 09:00–21:00" />
            </label>
            <button className="ds-primary-btn rounded-xl px-4 py-2.5 text-sm md:col-span-2">Сохранить контакты</button>
          </form>
        </div>

        <div className="glass-panel rounded-2xl p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-100">Юридические страницы</div>
          <p className="mt-1 text-sm text-slate-300">Редактирование “Политики конфиденциальности” и “Условий”.</p>
          <form action="/api/admin/content/legal" method="post" className="mt-4 space-y-3">
            <label className="text-sm text-slate-200">
              Политика конфиденциальности (текст)
              <textarea
                name="privacyText"
                defaultValue={content!.legal.privacyText}
                rows={8}
                className="ds-input mt-1 h-auto w-full px-3 py-2.5"
              />
            </label>
            <label className="text-sm text-slate-200">
              Условия использования (текст)
              <textarea
                name="termsText"
                defaultValue={content!.legal.termsText}
                rows={8}
                className="ds-input mt-1 h-auto w-full px-3 py-2.5"
              />
            </label>
            <button className="ds-primary-btn rounded-xl px-4 py-2.5 text-sm">Сохранить страницы</button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Admin security (login and password)</div>
          <p className="mt-1 text-sm text-slate-600">
            Change admin login (phone/email), password, and secret word. Passwords and secret word are stored hashed.
          </p>
          {securityError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {securityMessage}
            </div>
          )}
          {securityOk && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Security updated successfully.
            </div>
          )}
          <form action="/api/admin/security/update" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              New phone login
              <input name="phone" defaultValue={admin.phone} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            </label>
            <label className="text-sm text-slate-700">
              New email login
              <input name="email" type="email" defaultValue={admin.email ?? ""} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            </label>
            <label className="text-sm text-slate-700">
              Current password (required)
              <input name="currentPassword" type="password" required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            </label>
            <label className="text-sm text-slate-700">
              Secret word (required)
              <input name="secretWord" type="password" required={!isDev} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              {isDev && <div className="mt-1 text-xs text-slate-500">Dev default: `tajstay-secret`. Можно оставить пустым.</div>}
            </label>
            <label className="text-sm text-slate-700">
              New password
              <input name="newPassword" type="password" minLength={6} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            </label>
            <label className="text-sm text-slate-700">
              New secret word
              <input name="newSecretWord" type="password" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            </label>
            <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 md:col-span-2">
              Save admin security
            </button>
          </form>
        </div>
      </section>}

      {activeSection === "applications" && <section id="applications" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-8 w-1 rounded-full bg-amber-500" aria-hidden />
          <h2 className="text-lg font-bold text-slate-900">{m(locale, "admin.applications")}</h2>
        </div>
        {!ownerApplications.length ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-slate-500">
            {m(locale, "admin.applicationsEmpty")}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {ownerApplications.map((app) => (
              <div
                key={app.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="font-semibold text-slate-900">{app.fullName}</div>
                  <StatusBadge variant="warning">{tStatus("PENDING")}</StatusBadge>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {app.businessName} · {app.phone} · {app.email}
                </div>
                <div className="mt-1 text-xs text-slate-500">{m(locale, "admin.owner")}: {app.user.name} (id {app.userId})</div>
                {app.documentUrl && (
                  <div className="mt-3">
                    <a className="text-sm font-medium text-emerald-700 underline underline-offset-2" href={app.documentUrl} target="_blank" rel="noreferrer">
                      {m(locale, "admin.document")}
                    </a>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <form action={`/api/admin/owner-applications/${app.id}/approve`} method="post">
                    <button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600">
                      {m(locale, "admin.approve")}
                    </button>
                  </form>
                  <form action={`/api/admin/owner-applications/${app.id}/reject`} method="post" className="flex flex-wrap items-end gap-2">
                    <textarea
                      name="comment"
                      required
                      placeholder={m(locale, "admin.rejectReason")}
                      className="min-h-[60px] min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <button type="submit" className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100">
                      {m(locale, "admin.reject")}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>}

      {activeSection === "hotels" && <section id="hotels" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-8 w-1 rounded-full bg-violet-500" aria-hidden />
          <h2 className="text-lg font-bold text-slate-900">{m(locale, "admin.moderateHotels")}</h2>
        </div>
        <DataToolbar
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
        <div className="grid gap-4 lg:grid-cols-2">
          {hotels.map((hotel) => (
            (() => {
              const risk = scoreHotelRisk({
                status: hotel.status,
                rating: hotel.rating,
                coverImageUrl: hotel.coverImageUrl,
                ownerVerified: hotel.owner.verified,
                createdAt: hotel.createdAt
              });
              return (
            <div
              key={hotel.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{hotel.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {hotel.city} · {hotel.owner.name}
                  </div>
                  <div className="mt-2">
                    <StatusBadge variant={hotelStatusVariant(hotel.status)}>{tStatus(hotel.status)}</StatusBadge>
                    <span
                      className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        risk.level === "HIGH"
                          ? "bg-red-100 text-red-700"
                          : risk.level === "MEDIUM"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      Risk {risk.level} ({risk.score})
                    </span>
                  </div>
                  {risk.reasons.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">Signals: {risk.reasons.join(", ")}</div>
                  )}
                  {risk.level === "HIGH" && <div className="mt-1 text-xs font-semibold text-red-600">AUTO FLAGGED FOR MANUAL REVIEW</div>}
                </div>
                <form action="/api/admin/hotels/moderate" method="post" className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input type="hidden" name="id" value={hotel.id} />
                  <select name="status" defaultValue={hotel.status} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="PENDING">{tStatus("PENDING")}</option>
                    <option value="APPROVED">{tStatus("APPROVED")}</option>
                    <option value="REJECTED">{tStatus("REJECTED")}</option>
                  </select>
                  <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
                    {m(locale, "admin.save")}
                  </button>
                </form>
              </div>
            </div>
              );
            })()
          ))}
        </div>
        {!hotels.length && <EmptyState title={m(locale, "admin.emptyResults")} description={m(locale, "admin.emptyResultsHint")} />}
        <Pagination page={page} totalPages={totalPages} />
      </section>}

      {activeSection === "users" && <section id="users" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-8 w-1 rounded-full bg-slate-500" aria-hidden />
          <h2 className="text-lg font-bold text-slate-900">{m(locale, "admin.usersSection")}</h2>
        </div>
        <DataToolbar
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
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_1.4fr] gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
            <div>{m(locale, "admin.name")}</div>
            <div>{m(locale, "profile.email")}</div>
            <div>{m(locale, "profile.phone")}</div>
            <div>{m(locale, "admin.management")}</div>
          </div>
          <ul className="divide-y divide-slate-100">
            {users.map((u) => (
              <li key={u.id} className="px-4 py-4 transition-colors hover:bg-slate-50/80 md:px-5">
                <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_1.4fr] md:items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{u.name}</span>
                    <StatusBadge variant={roleVariant(u.role)}>{tRole(u.role)}</StatusBadge>
                    {u.isBanned && <StatusBadge variant="danger">{m(locale, "admin.ban")}</StatusBadge>}
                  </div>
                  <div className="text-sm text-slate-600">{u.email ?? "—"}</div>
                  <div className="text-sm text-slate-600">{u.phone}</div>
                  <div>
                    <form action="/api/admin/users/update" method="post" className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
                        <option value="GUEST">{tRole("GUEST")}</option>
                        <option value="OWNER">{tRole("OWNER")}</option>
                        <option value="ADMIN">{tRole("ADMIN")}</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600">
                        <input type="checkbox" name="isBanned" defaultChecked={u.isBanned} />
                        {m(locale, "admin.ban")}
                      </label>
                      <button className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white" type="submit">
                        {m(locale, "admin.save")}
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {!users.length && <EmptyState title={m(locale, "admin.emptyResults")} description={m(locale, "admin.emptyResultsHint")} />}
        <Pagination page={page} totalPages={totalPages} />
      </section>}

      {activeSection === "owner-access" && <section id="owner-access" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-8 w-1 rounded-full bg-emerald-500" aria-hidden />
          <h2 className="text-lg font-bold text-slate-900">{m(locale, "admin.ownerAccessSection")}</h2>
        </div>
        <p className="text-sm text-slate-600">{m(locale, "admin.ownerAccessHint")}</p>
        {effectiveResetToken && effectiveResetUser ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            <div className="font-semibold">{m(locale, "admin.resetLinkReady")}</div>
            <div className="mt-2 break-all rounded-xl bg-white px-3 py-2 font-mono text-[12px] text-slate-800 ring-1 ring-emerald-100">
              {`/auth/reset-password#token=${effectiveResetToken}`}
            </div>
          </div>
        ) : null}
        <DataToolbar
          section="owner-access"
          submitLabel={m(locale, "search.search")}
          fields={[{ kind: "search", name: "q", placeholder: m(locale, "admin.searchPlaceholderOwners") }]}
        />
        <div className="space-y-4">
          {users.map((u) => (
            <div key={u.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="font-semibold text-slate-900">{u.name}</div>
                <StatusBadge variant={roleVariant(u.role)}>{tRole(u.role)}</StatusBadge>
              </div>
              <form action="/api/admin/users/credentials" method="post" className="grid gap-3 md:grid-cols-3">
                <input type="hidden" name="id" value={u.id} />
                <label className="text-sm text-slate-700">
                  {m(locale, "admin.loginPhone")}
                  <input
                    name="phone"
                    type="text"
                    defaultValue={u.phone}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  {m(locale, "profile.email")}
                  <input
                    name="email"
                    type="email"
                    defaultValue={u.email ?? ""}
                    placeholder="owner@example.com"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  />
                </label>
                <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 md:col-span-3">
                  {m(locale, "admin.saveOwnerAccess")}
                </button>
              </form>
              <form action="/api/admin/users/reset-password" method="post" className="mt-3">
                <input type="hidden" name="id" value={u.id} />
                <button type="submit" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  {m(locale, "admin.generateResetLink")}
                </button>
              </form>
            </div>
          ))}
          {!users.length && <EmptyState title={m(locale, "admin.ownerAccessEmpty")} />}
        </div>
        <Pagination page={page} totalPages={totalPages} />
      </section>}

      {activeSection === "bookings" && <section id="bookings" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-8 w-1 rounded-full bg-teal-500" aria-hidden />
          <h2 className="text-lg font-bold text-slate-900">{m(locale, "admin.bookingsSection")}</h2>
        </div>
        <DataToolbar
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
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-slate-800">#{b.id}</span>
                {b.publicCode ? (
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">{b.publicCode}</span>
                ) : null}
                <span className="font-semibold text-slate-900">{b.user.name}</span>
                <StatusBadge variant={bookingStatusVariant(b.status)}>{tStatus(b.status)}</StatusBadge>
                <StatusBadge variant={paymentStatusVariant(b.paymentStatus)}>{tStatus(b.paymentStatus)}</StatusBadge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>
                  {b.room.hotel.name} · {b.checkIn.toISOString().slice(0, 10)} — {b.checkOut.toISOString().slice(0, 10)} · {b.phone}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Таймер</span>
                  <AdminBookingPayCountdown
                    expiresAtIso={b.expiresAt ? b.expiresAt.toISOString() : null}
                    active={b.status === "WAITING_PAYMENT" || b.status === "WAIT_PROOF"}
                  />
                </span>
              </div>
              <div className="mt-1 text-sm font-medium text-slate-800">
                {Number(b.totalPrice)} TJS · {m(locale, "admin.commission")} {Number(b.commission)} TJS
              </div>
              <div className="mt-1 text-xs text-slate-500">Escrow: {deriveEscrowState({ status: b.status, paymentStatus: b.paymentStatus })}</div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/chat/booking/${b.id}`}
                  className="inline-flex items-center rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500"
                >
                  Открыть чат
                </Link>
                {b.publicCode ? (
                  <Link
                    href={`/payment/${encodeURIComponent(b.publicCode)}`}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                  >
                    Страница оплаты
                  </Link>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                <form action="/api/admin/bookings/payment" method="post" className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={b.id} />
                  <select name="paymentStatus" defaultValue={b.paymentStatus} className="rounded-xl border border-slate-200 px-2 py-1.5 text-sm">
                    <option value="PENDING">{tStatus("PENDING")}</option>
                    <option value="PAID">{tStatus("PAID")}</option>
                    <option value="FAILED">{tStatus("FAILED")}</option>
                    <option value="REFUNDED">{tStatus("REFUNDED")}</option>
                  </select>
                  <button className="rounded-xl bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white" type="submit">
                    {m(locale, "admin.updatePayment")}
                  </button>
                </form>
                <form action="/api/admin/bookings/complete" method="post">
                  <input type="hidden" name="id" value={b.id} />
                  <button className="rounded-xl bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm" type="submit">
                    {m(locale, "admin.confirmBooking")}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
        {!bookings.length && <EmptyState title={m(locale, "admin.emptyResults")} description={m(locale, "admin.emptyResultsHint")} />}
        <Pagination page={page} totalPages={totalPages} />
      </section>}

      {activeSection === "finance" && (
        <section id="finance" className="scroll-mt-28 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-8 w-1 rounded-full bg-emerald-600" aria-hidden />
            <h2 className="text-lg font-bold text-slate-900">Finance</h2>
          </div>
          <p className="text-sm text-slate-600">
            Auditable records: payments, payouts, refunds. This is the backbone of a real marketplace.
          </p>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Payments</div>
              <div className="mt-3 space-y-2 text-xs">
                {payments.map((p) => (
                  <div key={p.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-slate-900">
                        {p.amount} {p.currency}
                      </div>
                      <div className="text-slate-600">{p.status}</div>
                    </div>
                    <div className="mt-1 text-slate-600">
                      {p.booking?.room?.hotel?.name ?? "—"} · {p.provider}/{p.method}
                    </div>
                    <div className="mt-1 text-slate-500">
                      Guest: {p.booking?.user?.name ?? "—"} · #{p.bookingId}
                    </div>
                  </div>
                ))}
                {!payments.length && <div className="text-slate-500">No payments yet.</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Payouts</div>
              <div className="mt-3 space-y-2 text-xs">
                {payouts.map((po) => (
                  <div key={po.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-slate-900">
                        {po.amount} {po.currency}
                      </div>
                      <div className="text-slate-600">{po.status}</div>
                    </div>
                    <div className="mt-1 text-slate-600">
                      Owner: {po.owner?.name ?? "—"} · {po.booking?.room?.hotel?.name ?? "—"}
                    </div>
                    <div className="mt-1 text-slate-500">Booking #{po.bookingId}</div>
                  </div>
                ))}
                {!payouts.length && <div className="text-slate-500">No payouts yet.</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Refunds</div>
              <div className="mt-3 space-y-2 text-xs">
                {refunds.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-slate-900">
                        {r.amount} {r.currency}
                      </div>
                      <div className="text-slate-600">{r.status}</div>
                    </div>
                    <div className="mt-1 text-slate-600">Payment #{r.paymentId}</div>
                    <div className="mt-1 text-slate-500">Reason: {r.reason ?? "—"}</div>
                  </div>
                ))}
                {!refunds.length && <div className="text-slate-500">No refunds yet.</div>}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeSection === "notifications" && <section id="notifications" className="scroll-mt-28 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-8 w-1 rounded-full bg-cyan-500" aria-hidden />
            <h2 className="text-lg font-bold text-slate-900">{m(locale, "admin.notifications")}</h2>
          </div>
          {unreadCount > 0 && (
            <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white shadow-sm">{unreadCount} {m(locale, "admin.unread")}</span>
          )}
          <form action="/api/admin/notifications/cleanup" method="post" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
            <input
              type="number"
              min={1}
              max={3650}
              defaultValue={30}
              name="days"
              className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            />
            <button type="submit" className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500">
              {m(locale, "admin.deleteOld")}
            </button>
          </form>
        </div>
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 text-sm shadow-sm">
              <div className="font-semibold text-slate-800">{notificationText(locale, n.type, n.booking?.publicCode ?? null)}</div>
              <div className="mt-1 text-xs text-slate-500">{formatDateTimeShort(locale, n.createdAt)}</div>
              {n.booking ? (
                <div className="mt-2 text-slate-600">
                  {n.booking.user.name} · {n.booking.room.hotel.name} · {n.booking.checkIn.toISOString().slice(0, 10)} —{" "}
                  {n.booking.checkOut.toISOString().slice(0, 10)} · {n.booking.phone} ·{" "}
                  <StatusBadge variant={paymentStatusVariant(n.booking.paymentStatus)}>{tStatus(n.booking.paymentStatus)}</StatusBadge>
                </div>
              ) : (
                <div className="mt-2 text-slate-500">{m(locale, "admin.systemNote")} ({m(locale, "admin.noBookingLink")})</div>
              )}
            </div>
          ))}
        </div>
        {!notes.length && <EmptyState title={m(locale, "admin.emptyResults")} description={m(locale, "admin.emptyResultsHint")} />}
        <Pagination page={page} totalPages={totalPages} />
      </section>}

      {activeSection === "complaints" && <section id="complaints" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-8 w-1 rounded-full bg-red-400" aria-hidden />
          <h2 className="text-lg font-bold text-slate-900">{m(locale, "admin.complaints")}</h2>
        </div>
        <DataToolbar
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
        <div className="space-y-3">
          {complaints.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{c.user.name}</span>
                <StatusBadge variant={complaintStatusVariant(c.status)}>{tStatus(c.status)}</StatusBadge>
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {c.booking.room.hotel.name} · {c.booking.phone} · {c.booking.checkIn.toISOString().slice(0, 10)} —{" "}
                {c.booking.checkOut.toISOString().slice(0, 10)}
              </div>
              <div className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{c.message}</div>
              {c.status !== "RESOLVED" && (
                <form action="/api/admin/complaints/resolve" method="post" className="mt-4">
                  <input type="hidden" name="id" value={c.id} />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white" type="submit">
                    {m(locale, "admin.resolve")}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
        {!complaints.length && <EmptyState title={m(locale, "admin.complaintsEmpty")} />}
        <Pagination page={page} totalPages={totalPages} />
      </section>}
    </div>
  );
}
