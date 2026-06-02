import { addDays, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth/requireOwner";
import { OwnerEmptyState } from "@/components/dashboard/OwnerEmptyState";
import { getLocale } from "@/lib/i18n/get-locale";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { formatDateTimeShort } from "@/lib/i18n/format";
import {
  StatusBadge,
  bookingStatusVariant,
  hotelStatusVariant,
  paymentStatusVariant
} from "@/components/ui/StatusBadge";
import { DataToolbar } from "@/components/ui/DataToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSiteContent } from "@/lib/site-content";
import { getOwnerPaymentMethods } from "@/lib/owner-payment-methods";
import { Card } from "@/shared/ui";
import { buildOwnerPricingInsights } from "@/lib/services/ownerInsights";
import { BookingChatLauncher } from "@/components/chat/BookingChatPanel";
import { RoomPhotoCarousel } from "@/components/RoomPhotoCarousel";
import { OwnerDashboardKpis } from "@/components/owner/OwnerDashboardKpis";
import { OfflineBookingForm } from "@/components/owner/OfflineBookingForm";
import { OfflineBookingsList } from "@/components/owner/OfflineBookingsList";
import { OwnerCalendar } from "@/components/owner/OwnerCalendar";
import { OwnerBookingConfirmButton } from "@/components/owner/OwnerBookingConfirmButton";
import { OwnerHelpTips } from "@/components/owner/OwnerHelpTips";
import ReviewReplyForm from "@/components/ReviewReplyForm";
import { getOwnerDashboardKpis } from "@/lib/services/ownerDashboardKpis";
import { getOwnerCalendarData } from "@/lib/services/ownerCalendar";
import { getOwnerOnboardingSteps } from "@/lib/services/ownerOnboarding";
import { OwnerOnboardingPanel } from "@/components/owner/OwnerOnboardingPanel";
import { BOOKING_SOURCE, getBookingGuestLabel } from "@/lib/domain/booking";
import { AppImage } from "@/components/ui/AppImage";
import { OwnerRoomTypesPanel } from "@/components/owner/OwnerRoomTypesPanel";
import { OwnerAssignRoomSelect } from "@/components/owner/OwnerAssignRoomSelect";
import { ownerBookingWhere, ownerOfflineBookingWhere } from "@/lib/pms/ownerQueries";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";
import { bookingHotel, bookingRoomTitle } from "@/lib/pms/bookingContext";
import { OwnerMobileDashboard } from "@/components/owner/mobile/OwnerMobileDashboard";
import { OfflineBookingSyncSettings } from "@/components/owner/OfflineBookingSyncSettings";
import { OfflineBookingStaffSearch } from "@/components/owner/OfflineBookingStaffSearch";
import { getOwnerPmsSettings } from "@/lib/pms/ownerPmsSettings";
import { toOfflineOwnerView } from "@/lib/pms/offlinePrivacy";

export const dynamic = "force-dynamic";

const PROPERTY_TYPES = ["HOTEL", "HOSTEL", "GUESTHOUSE", "APARTMENT", "ECO"] as const;

type OwnerSection =
  | "overview"
  | "properties"
  | "rooms"
  | "bookings"
  | "offline-bookings"
  | "calendar"
  | "notifications"
  | "reviews"
  | "finances"
  | "statistics"
  | "help";

const VALID_OWNER_SECTIONS = new Set<OwnerSection>([
  "overview",
  "properties",
  "rooms",
  "bookings",
  "offline-bookings",
  "calendar",
  "notifications",
  "reviews",
  "finances",
  "statistics",
  "help"
]);

function looksLikeTestValue(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return true;
  const lower = s.toLowerCase();
  if (["qa", "dsh", "test", "demo"].includes(lower)) return true;
  if (/^\d{1,4}$/.test(s)) return true;
  if (s.length <= 2) return true;
  return false;
}

function safeText(v: unknown, fallback: string) {
  return looksLikeTestValue(v) ? fallback : String(v ?? "").trim();
}

function propTypeLabel(locale: Locale, t: string) {
  return m(locale, `owner.propType.${t}`);
}

function tStatus(locale: Locale, status: string) {
  return m(locale, `status.${status}`);
}

function toUtcDayStart(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0));
}

function dayKey(input: Date): string {
  return input.toISOString().slice(0, 10);
}

export default async function OwnerDashboardPage({
  searchParams
}: {
  searchParams?:
    | Promise<{
        section?: string;
        page?: string;
        q?: string;
        status?: string;
        paymentStatus?: string;
        availability?: string;
        hotelId?: string;
        error?: string;
        created?: string;
        updated?: string;
        roomId?: string;
        checkIn?: string;
        checkOut?: string;
        onboarding?: string;
        sync?: string;
      }>
    | {
        section?: string;
        page?: string;
        q?: string;
        status?: string;
        paymentStatus?: string;
        availability?: string;
        hotelId?: string;
        error?: string;
        created?: string;
        updated?: string;
        roomId?: string;
        checkIn?: string;
        checkOut?: string;
        onboarding?: string;
        sync?: string;
      };
}) {
  const user = await requireOwner();
  const locale = getLocale();
  const params = searchParams ? await searchParams : undefined;
  const onboardingSteps = await getOwnerOnboardingSteps(user.id);
  const showOnboardingWelcome = (params?.onboarding ?? "") === "1";
  const raw = params?.section;
  const activeSection: OwnerSection =
    raw && VALID_OWNER_SECTIONS.has(raw as OwnerSection) ? (raw as OwnerSection) : "overview";

  const pageSize = 20;
  const page = Math.max(1, Number(params?.page ?? "1") || 1);
  const q = (params?.q ?? "").trim();
  const status = (params?.status ?? "").trim();
  const paymentStatus = (params?.paymentStatus ?? "").trim();
  const availability = (params?.availability ?? "").trim();
  const hotelId = Number(params?.hotelId ?? "") || 0;
  const ownerError = (params?.error ?? "").trim();
  const offlineCreated = (params?.created ?? "").trim() === "1";
  const offlineUpdated = (params?.updated ?? "").trim() === "1";
  const offlineSyncSaved = (params?.sync ?? "").trim() === "1";

  const since30 = subDays(new Date(), 30);
  const content = await getSiteContent();
  const ownerPaymentMethods = await getOwnerPaymentMethods(user.id);

  let hotels: any[] = [];
  let rooms: any[] = [];
  let roomTypes: any[] = [];
  let assignRooms: { id: number; title: string; roomNumber?: string | null; roomTypeId: number | null }[] = [];
  let bookings: any[] = [];
  let notes: any[] = [];
  let overrides: any[] = [];
  let calendarBookings: any[] = [];
  let offlineBookings: any[] = [];
  let calendarCells: Record<string, import("@/lib/services/ownerCalendar").CalendarCellKind> = {};
  let calendarCellMeta: Record<string, import("@/lib/services/ownerCalendar").CalendarCellMeta> = {};
  let calendarTypeRows: import("@/lib/services/ownerCalendar").RoomTypeCalendarRow[] = [];
  let calendarDaysFromService: { key: string; day: number; month: number }[] = [];
  let ownerReviews: any[] = [];
  let ownerPayouts: any[] = [];
  let dashboardKpis: Awaited<ReturnType<typeof getOwnerDashboardKpis>> | null = null;
  let unreadCount = 0;
  let pendingCount = 0;
  let recentBookings: any[] = [];
  let revenueAgg: any = { _sum: { totalPrice: 0 } };

  let totalRows = 0;
  let totalPages = 1;

  if (activeSection === "overview") {
    [hotels, pendingCount, revenueAgg, recentBookings, dashboardKpis] = await Promise.all([
      prisma.hotel.findMany({ where: { ownerId: user.id }, include: { rooms: true } }),
      prisma.booking.count({ where: { room: { hotel: { ownerId: user.id } }, status: "PENDING_OWNER" } }),
      prisma.booking.aggregate({
        where: {
          room: { hotel: { ownerId: user.id } },
          status: "CONFIRMED",
          paymentStatus: "PAID",
          createdAt: { gte: since30 }
        },
        _sum: { totalPrice: true }
      }),
      prisma.booking.findMany({
        where: { room: { hotel: { ownerId: user.id } } },
        select: { roomId: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 200
      }),
      getOwnerDashboardKpis(user.id)
    ]);
  } else if (activeSection === "properties") {
    hotels = await prisma.hotel.findMany({ where: { ownerId: user.id }, include: { rooms: true }, orderBy: { createdAt: "desc" } });
  } else if (activeSection === "rooms") {
    hotels = await prisma.hotel.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" } });
    roomTypes = await prisma.roomType.findMany({
      where: { hotel: { ownerId: user.id } },
      include: { _count: { select: { rooms: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
    const where = {
      hotel: { ownerId: user.id },
      ...(hotelId ? { hotelId } : {}),
      ...(availability ? { availability: availability === "1" } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { roomNumber: { contains: q } },
              { hotel: { name: { contains: q } } }
            ]
          }
        : {})
    } as any;
    totalRows = await prisma.room.count({ where });
    totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    rooms = await prisma.room.findMany({
      where,
      include: { hotel: true, roomType: true, photos: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ hotelId: "asc" }, { roomNumber: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize
    });
  } else if (activeSection === "bookings") {
    const where = {
      AND: [
        ownerBookingWhere(user.id),
        ...(status ? [{ status }] : []),
        ...(paymentStatus ? [{ paymentStatus }] : []),
        ...(q
          ? [
              {
                OR: [
                  { phone: { contains: q } },
                  { user: { name: { contains: q } } },
                  { room: { hotel: { name: { contains: q } } } },
                  { roomType: { name: { contains: q } } }
                ]
              }
            ]
          : [])
      ]
    } as any;
    totalRows = await prisma.booking.count({ where });
    totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    bookings = await prisma.booking.findMany({
      where,
      include: { ...bookingWithHotelInclude, user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
    assignRooms = await prisma.room.findMany({
      where: { hotel: { ownerId: user.id }, roomTypeId: { not: null } },
      select: { id: true, title: true, roomNumber: true, roomTypeId: true },
      orderBy: [{ roomNumber: "asc" }, { id: "asc" }]
    });
  } else if (activeSection === "offline-bookings") {
    hotels = await prisma.hotel.findMany({ where: { ownerId: user.id }, include: { rooms: true }, orderBy: { createdAt: "desc" } });
    roomTypes = await prisma.roomType.findMany({
      where: { hotel: { ownerId: user.id } },
      include: { hotel: true },
      orderBy: [{ hotelId: "asc" }, { name: "asc" }]
    });
    rooms = await prisma.room.findMany({
      where: { hotel: { ownerId: user.id } },
      include: { hotel: true },
      orderBy: [{ roomNumber: "asc" }, { id: "asc" }]
    });
    const where = ownerOfflineBookingWhere(user.id);
    totalRows = await prisma.booking.count({ where });
    totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    offlineBookings = await prisma.booking.findMany({
      where,
      include: { ...bookingWithHotelInclude, user: true },
      orderBy: { checkIn: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
  } else if (activeSection === "notifications") {
    unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
        createdAt: { gte: subDays(new Date(), 7) }
      }
    });
    const where = { userId: user.id, createdAt: { gte: subDays(new Date(), 7) } } as any;
    totalRows = await prisma.notification.count({ where });
    totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    notes = await prisma.notification.findMany({
      where,
      include: { booking: { include: { user: true, ...bookingWithHotelInclude } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
  } else if (activeSection === "reviews") {
    ownerReviews = await prisma.review.findMany({
      where: { booking: ownerBookingWhere(user.id) },
      include: {
        booking: {
          include: {
            user: true,
            ...bookingWithHotelInclude
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  } else if (activeSection === "finances") {
    [ownerPayouts, revenueAgg, dashboardKpis] = await Promise.all([
      prisma.payout.findMany({
        where: { ownerId: user.id },
        include: { booking: { include: bookingWithHotelInclude } },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      prisma.booking.aggregate({
        where: {
          room: { hotel: { ownerId: user.id } },
          status: "CONFIRMED",
          paymentStatus: "PAID",
          createdAt: { gte: since30 }
        },
        _sum: { totalPrice: true, commission: true }
      }),
      getOwnerDashboardKpis(user.id)
    ]);
  } else if (activeSection === "statistics" || activeSection === "help") {
    [hotels, dashboardKpis, pendingCount, recentBookings] = await Promise.all([
      prisma.hotel.findMany({ where: { ownerId: user.id }, include: { rooms: true } }),
      getOwnerDashboardKpis(user.id),
      prisma.booking.count({
        where: { AND: [ownerBookingWhere(user.id), { status: "PENDING_OWNER" }] }
      }),
      prisma.booking.findMany({
        where: ownerBookingWhere(user.id),
        select: { roomId: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 200
      })
    ]);
  } else if (activeSection === "calendar") {
    const cal = await getOwnerCalendarData(user.id, 30);
    hotels = await prisma.hotel.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" } });
    rooms = cal.rooms;
    calendarCells = cal.cells;
    calendarCellMeta = cal.cellMeta;
    calendarTypeRows = cal.typeRows ?? [];
    calendarDaysFromService = cal.days;
    calendarBookings = cal.bookings ?? [];
    const where = {
      room: { hotel: { ownerId: user.id } },
      date: { gte: new Date(), lt: addDays(new Date(), 30) }
    } as any;
    totalRows = await prisma.roomDateOverride.count({ where });
    totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    overrides = await prisma.roomDateOverride.findMany({
      where,
      include: { room: { include: { hotel: true } } },
      orderBy: { date: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    });
  }

  const hasHotels = hotels.length > 0;
  const totalRooms = hotels.reduce((acc, hotel) => acc + (hotel.rooms?.length ?? 0), 0);
  const bookingConversion = totalRooms ? Math.round((pendingCount / Math.max(totalRooms, 1)) * 100) : 0;
  const aiPriceRecommendation =
    pendingCount >= 5
      ? m(locale, "owner.aiPricingHighDemand")
      : m(locale, "owner.aiPricingStableDemand");
  const aiHotelRecommendations = buildOwnerPricingInsights(hotels, recentBookings);
  const calendarDays =
    activeSection === "calendar" && calendarDaysFromService.length
      ? calendarDaysFromService
      : activeSection === "calendar"
        ? Array.from({ length: 30 }, (_, i) => {
            const d = addDays(toUtcDayStart(new Date()), i);
            return { key: dayKey(d), day: d.getUTCDate(), month: d.getUTCMonth() + 1 };
          })
        : [];
  const roomOptions = rooms.map((r: { id: number; title: string; hotel: { name: string } }) => ({
    id: r.id,
    title: r.title,
    hotel: { name: r.hotel.name }
  }));

  const createHotelFormInner = (
    <form action="/api/owner/hotels" method="post" encType="multipart/form-data" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.fieldName")}</label>
            <input
              name="name"
              required
              placeholder={m(locale, "owner.fieldNamePh")}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.coverImage")}</label>
            <input
              name="coverFile"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-green-800 file:px-3 file:py-1.5 file:text-white"
            />
            <p className="mt-1.5 text-xs text-slate-500">{m(locale, "owner.coverImageHelp")}</p>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.fieldType")}</label>
            <select
              name="propertyType"
              defaultValue="HOTEL"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {propTypeLabel(locale, t)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.fieldDescription")}</label>
            <textarea
              name="description"
              required
              rows={4}
              placeholder={m(locale, "owner.fieldDescriptionPh")}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.fieldCity")}</label>
            <input
              name="city"
              required
              placeholder={m(locale, "owner.fieldCityPh")}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.fieldAddress")}</label>
            <input
              name="address"
              required
              placeholder={m(locale, "owner.fieldAddressPh")}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{m(locale, "owner.fieldLat")}</label>
            <input
              name="latitude"
              type="number"
              step="any"
              placeholder="38.56"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{m(locale, "owner.fieldLng")}</label>
            <input
              name="longitude"
              type="number"
              step="any"
              placeholder="68.78"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
            />
          </div>
        </div>
      <button
        type="submit"
        className="h-12 w-full rounded-2xl bg-green-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 md:w-auto"
      >
        {m(locale, "owner.saveHotel")}
      </button>
    </form>
  );

  const createHotelForm = (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-100">{m(locale, "owner.createHotelTitle")}</h3>
          <p className="mt-1 text-sm text-slate-300">{m(locale, "owner.createHotelLead")}</p>
        </div>
        <div className="inline-flex rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          {m(locale, "owner.propertiesTitle")}
        </div>
      </div>
      <div className="mt-2">{createHotelFormInner}</div>
    </Card>
  );

  const ownerPmsSettings =
    activeSection === "offline-bookings" ? await getOwnerPmsSettings(user.id) : null;

  const offlineBookingViews =
    activeSection === "offline-bookings"
      ? offlineBookings.map((b) => toOfflineOwnerView(b, true, true))
      : [];

  return (
    <div className="owner-page-root admin-page-root dashboard-skin space-y-12 pb-16 text-slate-100">
      <header className="hidden border-b border-white/10 pb-8 lg:block">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">{m(locale, "owner.pageTitle")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">{m(locale, "owner.pageSubtitle")}</p>
      </header>

      <section className="hidden liquid-glass rounded-2xl p-6 lg:block">
        <h2 className="text-lg font-bold text-slate-100">{m(locale, "dashboard.paymentMethods.title")}</h2>
        <p className="mt-1 text-sm text-slate-300">{m(locale, "dashboard.paymentMethods.desc")}</p>
        <form action="/api/owner/payment-methods" method="post" className="mt-4 space-y-3">
          <input
            name="methods"
            defaultValue={ownerPaymentMethods.join(", ")}
            placeholder={m(locale, "dashboard.paymentMethods.placeholder")}
            className="ds-input w-full text-sm"
          />
          <button type="submit" className="ds-primary-btn text-sm">
            {m(locale, "dashboard.paymentMethods.save")}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {content.paymentCatalog.methods.map((method) => (
            <span key={method} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-slate-200">
              {method}
            </span>
          ))}
        </div>
      </section>

      {activeSection === "overview" && dashboardKpis ? (
        <OwnerMobileDashboard
          locale={locale}
          kpis={dashboardKpis}
          pendingOnlineBookings={dashboardKpis.pendingOnlineBookings}
        />
      ) : null}

      {activeSection === "overview" && (
        <>
          <OwnerOnboardingPanel locale={locale} initialSteps={onboardingSteps} showWelcome={showOnboardingWelcome} />
          {!hasHotels && (
            <div className="scroll-mt-28">
              <OwnerEmptyState />
            </div>
          )}

          <section id="overview" className="scroll-mt-28 space-y-4 hidden lg:block" data-reveal data-stagger="40">
            <div className="flex items-center gap-2">
              <span className="h-8 w-1 rounded-full bg-amber-400" aria-hidden />
              <h2 className="text-lg font-bold text-slate-100">{m(locale, "owner.overview")}</h2>
            </div>
            <div className="surface-1 rounded-3xl p-6 sm:p-7 space-y-4">
              {dashboardKpis ? <OwnerDashboardKpis locale={locale} kpis={dashboardKpis} /> : null}
              <div className="flex flex-wrap gap-2 text-sm">
                <a href="/dashboard/owner?section=offline-bookings" className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-600">
                  {m(locale, "owner.quick.offlineBooking")}
                </a>
                <a href="/dashboard/owner?section=calendar" className="rounded-xl border border-white/15 px-4 py-2 text-slate-100 hover:bg-white/5">
                  {m(locale, "owner.quick.calendar")}
                </a>
                <a href="/dashboard/messages" className="rounded-xl border border-white/15 px-4 py-2 text-slate-100 hover:bg-white/5">
                  {m(locale, "owner.quick.messages")}
                </a>
                <a href="/dashboard/owner?section=calendar" className="rounded-xl border border-white/15 px-4 py-2 text-slate-100 hover:bg-white/5">
                  {m(locale, "owner.quick.editPrices")}
                </a>
                <a href="/dashboard/owner?section=finances" className="rounded-xl border border-white/15 px-4 py-2 text-slate-100 hover:bg-white/5">
                  {m(locale, "owner.quick.payouts")}
                </a>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="space-y-2 border-emerald-300/30 bg-emerald-500/10">
                <h3 className="text-base font-semibold text-emerald-200">{m(locale, "owner.aiPricing")}</h3>
                <p className="text-sm text-slate-200">{aiPriceRecommendation}</p>
                <p className="text-xs text-slate-400">{m(locale, "owner.aiPricingHint")}</p>
                {aiHotelRecommendations.length > 0 && (
                  <ul className="space-y-1 pt-2 text-xs text-emerald-100">
                    {aiHotelRecommendations.map((rec) => (
                      <li key={rec.hotelId}>
                        {rec.hotelName}: {rec.suggestedDelta >= 0 ? "+" : ""}{rec.suggestedDelta}% ({rec.pressure.toFixed(2)} спрос/номер)
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card className="space-y-2">
                <h3 className="text-base font-semibold text-slate-100">{m(locale, "owner.conversionTitle")}</h3>
                <ul className="space-y-1 text-sm text-slate-300">
                  <li>{m(locale, "owner.viewsProxy")}: {hotels.length * 24}</li>
                  <li>{m(locale, "owner.clicksProxy")}: {hotels.length * 7}</li>
                  <li>{m(locale, "owner.pendingBookings")}: {pendingCount}</li>
                  <li>{m(locale, "owner.conversionProxy")}: {bookingConversion}%</li>
                </ul>
              </Card>
            </div>
          </section>
        </>
      )}

      {activeSection === "properties" && (
        <section id="properties" className="scroll-mt-28 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-8 w-1 rounded-full bg-emerald-600" aria-hidden />
            <h2 className="text-xl font-bold text-slate-100">{m(locale, "owner.propertiesTitle")}</h2>
          </div>
          <p className="text-sm text-slate-300">{m(locale, "owner.propertiesHint")}</p>

          {ownerError === "hotel_limit" && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100" role="alert">
              {m(locale, "owner.errHotelLimit")}
            </div>
          )}
          {ownerError === "hotel_cover" && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100" role="alert">
              {m(locale, "owner.errHotelCover")}
            </div>
          )}
          {ownerError === "hotel_cover_storage" && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100" role="alert">
              Не удалось сохранить фото на сервере. В Vercel подключите Storage → Blob и добавьте{" "}
              <code className="rounded bg-black/20 px-1">BLOB_READ_WRITE_TOKEN</code>, затем redeploy.
            </div>
          )}
          {ownerError === "hotel_cover_upload" && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100" role="alert">
              Ошибка загрузки обложки. Попробуйте JPG/PNG/WebP до 5 МБ.
            </div>
          )}
          {ownerError === "hotel_server" && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-100" role="alert">
              Ошибка сервера при сохранении объекта. Проверьте Vercel Logs для /api/owner/hotels.
            </div>
          )}
          {ownerError === "hotel" && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100" role="alert">
              {m(locale, "owner.errHotel")}
            </div>
          )}

          {hasHotels && (
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100" role="status">
              {m(locale, "owner.oneHotelRule")}
            </div>
          )}

          {!hasHotels && createHotelForm}

          {hasHotels && (
            <div className="space-y-8">
              {hotels.map((h) => (
                <div
                  key={h.id}
                  className="glass-panel rounded-2xl p-6 shadow-2xl shadow-emerald-950/15 ring-1 ring-white/10 transition-shadow hover:shadow-emerald-950/25"
                >
                  {h.coverImageUrl ? (
                    <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-2xl bg-slate-900/40 ring-1 ring-white/10">
                      <AppImage src={h.coverImageUrl} alt="" fill className="object-cover" sizes="400px" />
                    </div>
                  ) : null}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-semibold text-slate-100">
                        {safeText(h.name, m(locale, "owner.demoHidden"))}
                      </div>
                      <div className="mt-1 text-sm text-slate-300">{safeText(h.city, m(locale, "owner.fieldCityPh"))}</div>
                    </div>
                    <StatusBadge variant={hotelStatusVariant(h.status)}>{tStatus(locale, h.status)}</StatusBadge>
                  </div>

                  <form action={`/api/owner/hotels/${h.id}`} method="post" encType="multipart/form-data" className="space-y-6">
                    <section className="rounded-2xl border border-white/10 bg-slate-950/30 p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-100">{m(locale, "owner.sectionBasic")}</div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.fieldName")}</label>
                          <input
                            name="name"
                            defaultValue={looksLikeTestValue(h.name) ? "" : h.name}
                            placeholder={m(locale, "owner.fieldNamePh")}
                            required
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                          />
                          <div className="mt-1.5 text-xs text-slate-500">{m(locale, "owner.fieldNameHelp")}</div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.coverImage")}</label>
                          <input
                            name="coverFile"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-green-800 file:px-3 file:py-1.5 file:text-white"
                          />
                          <div className="mt-1.5 text-xs text-slate-500">{m(locale, "owner.coverImageEditHelp")}</div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.fieldType")}</label>
                          <select
                            name="propertyType"
                            defaultValue={h.propertyType}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                          >
                            {PROPERTY_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {propTypeLabel(locale, t)}
                              </option>
                            ))}
                          </select>
                          <div className="mt-1.5 text-xs text-slate-500">{m(locale, "owner.fieldTypeHelp")}</div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.fieldDescription")}</label>
                          <textarea
                            name="description"
                            defaultValue={looksLikeTestValue(h.description) ? "" : h.description}
                            placeholder={m(locale, "owner.fieldDescriptionPh")}
                            required
                            rows={4}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                          />
                          <div className="mt-1.5 text-xs text-slate-500">{m(locale, "owner.fieldDescriptionHelp")}</div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-5">
                      <div className="mb-4 text-sm font-semibold text-slate-900">{m(locale, "owner.sectionLocation")}</div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.fieldCity")}</label>
                          <input
                            name="city"
                            defaultValue={looksLikeTestValue(h.city) ? "" : h.city}
                            placeholder={m(locale, "owner.fieldCityPh")}
                            required
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.fieldAddress")}</label>
                          <input
                            name="address"
                            defaultValue={looksLikeTestValue(h.address) ? "" : h.address}
                            placeholder={m(locale, "owner.fieldAddressPh")}
                            required
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                          />
                          <div className="mt-1.5 text-xs text-slate-500">{m(locale, "owner.fieldAddressHelp")}</div>
                        </div>

                        <div className="md:col-span-2">
                          <div className="mb-1.5 text-sm font-semibold text-slate-800">{m(locale, "owner.fieldCoords")}</div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {m(locale, "owner.fieldLat")}
                              </label>
                              <input
                                name="latitude"
                                type="number"
                                step="any"
                                defaultValue={h.latitude}
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {m(locale, "owner.fieldLng")}
                              </label>
                              <input
                                name="longitude"
                                type="number"
                                step="any"
                                defaultValue={h.longitude}
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                              />
                            </div>
                          </div>
                          <div className="mt-1.5 text-xs text-slate-500">{m(locale, "owner.fieldCoordsHelp")}</div>
                        </div>
                      </div>
                    </section>

                    <button
                      type="submit"
                      className="h-12 w-full rounded-2xl bg-green-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.99] md:w-auto"
                    >
                      {m(locale, "owner.saveHotel")}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeSection === "rooms" && (
        <section id="rooms" className="scroll-mt-28 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-8 w-1 rounded-full bg-emerald-500" aria-hidden />
            <h2 className="text-xl font-bold text-slate-100">{m(locale, "owner.sectionRooms")}</h2>
          </div>
          <OwnerRoomTypesPanel locale={locale} hotels={hotels.map((h) => ({ id: h.id, name: h.name }))} />

          <DataToolbar
            section="rooms"
            submitLabel={m(locale, "search.search")}
            fields={[
              { kind: "search", name: "q", placeholder: m(locale, "admin.searchPlaceholder") },
              {
                kind: "select",
                name: "hotelId",
                label: m(locale, "owner.objects"),
                options: [
                  { value: "", label: m(locale, "admin.filterAll") },
                  ...hotels.map((h) => ({ value: String(h.id), label: `${h.name} · ${h.city}` }))
                ]
              },
              {
                kind: "select",
                name: "availability",
                label: m(locale, "owner.available"),
                options: [
                  { value: "", label: m(locale, "admin.filterAll") },
                  { value: "1", label: m(locale, "owner.availableYes") },
                  { value: "0", label: m(locale, "owner.availableNo") }
                ]
              }
            ]}
          />

          {!rooms.length ? (
            <EmptyState title={m(locale, "owner.roomsEmpty")} description={m(locale, "owner.roomsEmptyHint")} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {rooms.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-100">
                  <RoomPhotoCarousel
                    urls={(r.photos as { url: string }[] | undefined)?.map((p) => p.url) ?? []}
                    title={safeText(r.title, m(locale, "owner.roomCardTitle"))}
                    variant="light"
                  />

                  <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-slate-900">
                        {r.roomNumber ? `${r.roomNumber} · ` : ""}
                        {safeText(r.title, m(locale, "owner.roomCardTitle"))}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {safeText(r.hotel.name, m(locale, "owner.fieldNamePh"))} · {safeText(r.hotel.city, m(locale, "owner.fieldCityPh"))}
                        {r.roomType?.name ? ` · ${r.roomType.name}` : ""}
                      </div>
                    </div>
                    <StatusBadge variant={r.availability ? "success" : "neutral"}>
                      {r.availability ? m(locale, "owner.availableYes") : m(locale, "owner.availableNo")}
                    </StatusBadge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{m(locale, "owner.priceNight")}</div>
                      <div className="mt-0.5 font-semibold text-slate-900">{Number(r.price)} TJS</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{m(locale, "owner.capacity")}</div>
                      <div className="mt-0.5 font-semibold text-slate-900">{r.capacity}</div>
                    </div>
                  </div>

                  <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-green-900">{m(locale, "owner.roomEditTitle")}</summary>
                    {(r.photos as { id: number; url: string }[] | undefined)?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(r.photos as { id: number; url: string }[]).map((p) => (
                          <form
                            key={p.id}
                            action={`/api/owner/rooms/${r.id}`}
                            method="post"
                            className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200"
                          >
                            <AppImage src={p.url} alt="" fill className="object-cover" sizes="64px" />
                            <input type="hidden" name="intent" value="delete_photo" />
                            <input type="hidden" name="photoId" value={p.id} />
                            <button
                              type="submit"
                              className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center bg-red-600 text-xs font-bold text-white hover:bg-red-700"
                              aria-label="Удалить фото"
                            >
                              ×
                            </button>
                          </form>
                        ))}
                      </div>
                    ) : null}
                    <form action={`/api/owner/rooms/${r.id}`} method="post" encType="multipart/form-data" className="mt-4 space-y-4">
                      <input type="hidden" name="intent" value="update" />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.roomTitle")}</label>
                          <input
                            name="title"
                            defaultValue={looksLikeTestValue(r.title) ? "" : r.title}
                            placeholder={m(locale, "owner.roomTitle")}
                            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.priceNight")}</label>
                          <input
                            name="price"
                            type="number"
                            min={0}
                            step={1}
                            defaultValue={Number(r.price)}
                            placeholder={m(locale, "owner.priceNightPh")}
                            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.capacity")}</label>
                          <input
                            name="capacity"
                            type="number"
                            min={1}
                            defaultValue={r.capacity}
                            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.weekendPrice")}</label>
                          <input
                            name="weekendPrice"
                            type="number"
                            min={0}
                            step={1}
                            defaultValue={r.weekendPrice != null ? Number(r.weekendPrice) : undefined}
                            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.minNights")}</label>
                          <input
                            name="minNights"
                            type="number"
                            min={1}
                            defaultValue={Math.max(1, Number(r.minNights ?? 1) || 1)}
                            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.extraGuestPrice")}</label>
                          <input
                            name="extraGuestPrice"
                            type="number"
                            min={0}
                            step={1}
                            defaultValue={r.extraGuestPrice != null ? Number(r.extraGuestPrice) : undefined}
                            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                          />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <input type="checkbox" name="availability" value="1" defaultChecked={r.availability} className="h-4 w-4 rounded border-slate-300 text-green-800" />
                            {m(locale, "owner.available")}
                          </label>
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.amenities")}</label>
                          <input
                            name="amenities"
                            defaultValue={(() => {
                              try {
                                const arr = JSON.parse(r.amenities);
                                return Array.isArray(arr) ? arr.join(", ") : String(r.amenities);
                              } catch {
                                return String(r.amenities ?? "");
                              }
                            })()}
                            placeholder={m(locale, "owner.roomAmenitiesPh")}
                            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1.5 block text-sm font-semibold text-slate-800">Добавить фото номера</label>
                          <input
                            name="roomPhotos"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            capture="environment"
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-green-800 file:px-3 file:py-1.5 file:text-white"
                          />
                          <p className="mt-1 text-xs text-slate-500">Можно выбрать несколько файлов (до 5 МБ каждый).</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className="h-11 rounded-2xl bg-green-800 px-5 text-sm font-semibold text-white hover:bg-green-700 active:scale-[0.99]">
                          {m(locale, "owner.saveRoom")}
                        </button>
                        <button
                          formAction={`/api/owner/rooms/${r.id}`}
                          formMethod="post"
                          name="intent"
                          value="archive"
                          className="h-11 rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-800 hover:bg-red-100 active:scale-[0.99]"
                        >
                          {m(locale, "owner.archiveRoom")}
                        </button>
                      </div>
                    </form>
                  </details>
                </div>
              ))}
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} />

          {hotels.length > 0 && (
            <details className="rounded-3xl border border-dashed border-green-300 bg-green-50/40 p-6">
              <summary className="cursor-pointer list-none text-sm font-semibold text-green-900">{m(locale, "owner.roomAddTitle")}</summary>
              <form action="/api/owner/rooms" method="post" encType="multipart/form-data" className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.objects")}</label>
                  <select
                    name="hotelId"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                  >
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {safeText(h.name, m(locale, "owner.fieldNamePh"))} · {safeText(h.city, m(locale, "owner.fieldCityPh"))}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.roomTitle")}</label>
                  <input
                    name="title"
                    required
                    placeholder={m(locale, "owner.roomTitle")}
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.priceNight")}</label>
                  <input
                    name="price"
                    type="number"
                    min={0}
                    step={1}
                    required
                    placeholder={m(locale, "owner.priceNightPh")}
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.capacity")}</label>
                  <input name="capacity" type="number" min={1} defaultValue={2} className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.weekendPrice")}</label>
                  <input name="weekendPrice" type="number" min={0} step={1} className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.minNights")}</label>
                  <input name="minNights" type="number" min={1} defaultValue={1} className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.extraGuestPrice")}</label>
                  <input name="extraGuestPrice" type="number" min={0} step={1} className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">{m(locale, "owner.amenities")}</label>
                  <input name="amenities" placeholder={m(locale, "owner.roomAmenitiesPh")} className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">Фото номера</label>
                  <input
                    name="roomPhotos"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    capture="environment"
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-green-800 file:px-3 file:py-1.5 file:text-white"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Несколько фото — на карточке номера и на сайте показываются слайдером (стрелки и свайп на телефоне).
                  </p>
                </div>
                <button type="submit" className="h-12 rounded-2xl bg-green-800 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.99] md:col-span-2">
                  {m(locale, "owner.addRoomCta")}
                </button>
              </form>
            </details>
          )}
        </section>
      )}

      {activeSection === "bookings" && (
        <section id="bookings" className="scroll-mt-28 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-8 w-1 rounded-full bg-teal-500" aria-hidden />
            <h2 className="text-xl font-bold text-slate-900">{m(locale, "owner.bookingsTitle")}</h2>
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
                  { value: "WAIT_PROOF", label: tStatus(locale, "WAIT_PROOF") },
                  { value: "ON_REVIEW", label: tStatus(locale, "ON_REVIEW") },
                  { value: "PENDING_OWNER", label: tStatus(locale, "PENDING_OWNER") },
                  { value: "PENDING_PAYMENT", label: tStatus(locale, "PENDING_PAYMENT") },
                  { value: "CONFIRMED", label: tStatus(locale, "CONFIRMED") },
                  { value: "COMPLETED", label: tStatus(locale, "COMPLETED") },
                  { value: "CANCELLED", label: tStatus(locale, "CANCELLED") },
                  { value: "REJECTED", label: tStatus(locale, "REJECTED") },
                  { value: "EXPIRED", label: tStatus(locale, "EXPIRED") }
                ]
              },
              {
                kind: "select",
                name: "paymentStatus",
                label: m(locale, "admin.filterPayment"),
                options: [
                  { value: "", label: m(locale, "admin.filterAll") },
                  { value: "PENDING", label: tStatus(locale, "PENDING") },
                  { value: "PAID", label: tStatus(locale, "PAID") },
                  { value: "FAILED", label: tStatus(locale, "FAILED") },
                  { value: "REFUNDED", label: tStatus(locale, "REFUNDED") }
                ]
              }
            ]}
          />
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 text-sm shadow-sm ring-1 ring-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{getBookingGuestLabel(b)}</span>
                  <StatusBadge variant={b.source === BOOKING_SOURCE.OWNER_MANUAL ? "neutral" : bookingStatusVariant(b.status)}>
                    {b.source === BOOKING_SOURCE.OWNER_MANUAL
                      ? m(locale, "owner.bookingBadge.offline")
                      : m(locale, "owner.bookingBadge.online")}
                  </StatusBadge>
                  <StatusBadge variant={bookingStatusVariant(b.status)}>{tStatus(locale, b.status)}</StatusBadge>
                  <StatusBadge variant={paymentStatusVariant(b.paymentStatus)}>{tStatus(locale, b.paymentStatus)}</StatusBadge>
                </div>
                <div className="mt-2 text-slate-600">
                  {bookingHotel(b).name} · {bookingRoomTitle(b)} · {b.checkIn.toISOString().slice(0, 10)} — {b.checkOut.toISOString().slice(0, 10)} · {b.phone}
                </div>
                {b.roomTypeId ? (
                  <OwnerAssignRoomSelect
                    locale={locale}
                    bookingId={b.id}
                    roomTypeId={b.roomTypeId}
                    assignedRoomId={b.assignedRoomId ?? b.roomId}
                    rooms={assignRooms.filter((r) => r.roomTypeId === b.roomTypeId)}
                  />
                ) : null}
                {b.status === "ON_REVIEW" && (
                  <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-50/60 p-3">
                    <div className="text-xs font-semibold text-amber-900">Чек:</div>
                    {b.proofReviewDeadlineAt ? (
                      <div className="mt-1 text-xs text-amber-900/90">
                        Нужно подтвердить/отклонить до:{" "}
                        <span className="font-semibold">
                          {new Date(b.proofReviewDeadlineAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ) : null}
                    {b.paymentProofUrl ? (
                      <a href={b.paymentProofUrl} className="mt-1 block truncate text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline">
                        {b.paymentProofUrl}
                      </a>
                    ) : (
                      <div className="mt-1 text-sm text-amber-900/80">Ссылка не указана</div>
                    )}
                    <div className="mt-3 rounded-lg border border-slate-200/70 bg-white/60 p-3">
                      <div className="text-xs font-semibold text-slate-700">Документ гостя:</div>
                      {b.guestDocumentUrl ? (
                        <a
                          href={b.guestDocumentUrl}
                          className="mt-1 block truncate text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          открыть документ
                        </a>
                      ) : (
                        <div className="mt-1 text-sm text-slate-600">Документ не загружен</div>
                      )}
                    </div>
                    <div className="mt-3 rounded-lg border border-slate-200/80 bg-white/70 p-3 text-xs text-slate-700">
                      Подтверждение или отклонение чека выполняет администратор TajStay. Вы можете обсудить детали с гостем в чате ниже.
                    </div>
                  </div>
                )}
                {b.status === "PENDING_OWNER" && (
                  <div className="mt-3">
                    {b.payOnArrival ? (
                      <div className="flex flex-wrap gap-2">
                        <div className="w-full rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-sm text-slate-700">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Документ гостя</div>
                          {b.guestDocumentUrl ? (
                            <a
                              href={b.guestDocumentUrl}
                              className="mt-1 inline-block font-semibold text-emerald-800 underline underline-offset-4"
                              target="_blank"
                              rel="noreferrer"
                            >
                              открыть документ
                            </a>
                          ) : (
                            <div className="mt-1">Пока не загружен</div>
                          )}
                        </div>
                        <OwnerBookingConfirmButton bookingId={b.id} locale={locale} />
                        <form action={`/api/owner/bookings/${b.id}/reject`} method="post">
                          <button type="submit" className="rounded-lg border border-red-600 px-3 py-1.5 text-red-700">
                            {m(locale, "owner.decline")}
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-sm text-slate-700">
                        Ожидаем оплату и чек от гостя. Подтверждение доступно после проверки чека (статус: ON_REVIEW).
                      </div>
                    )}
                  </div>
                )}
                {b.userId ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Чат с гостем</span>
                    <BookingChatLauncher
                      bookingId={b.id}
                      currentUserId={user.id}
                      currentUserRole="OWNER"
                      locale={locale}
                      bookingStatus={b.status}
                      paymentStatus={b.paymentStatus}
                      checkInIso={b.checkIn.toISOString()}
                      paymentCode={b.publicCode ?? undefined}
                      title="Диалог по брони"
                      hotelName={bookingHotel(b).name}
                      roomTitle={bookingRoomTitle(b)}
                      openLabel="Открыть чат"
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {!bookings.length && <EmptyState title={m(locale, "owner.bookingsEmpty")} />}
          <Pagination page={page} totalPages={totalPages} />
        </section>
      )}

      {activeSection === "offline-bookings" && (
        <section id="offline-bookings" className="scroll-mt-28 space-y-4">
          <div className="flex items-center gap-2 lg:flex">
            <span className="h-8 w-1 rounded-full bg-orange-500" aria-hidden />
            <h2 className="text-xl font-bold text-slate-100">{m(locale, "owner.offline.title")}</h2>
          </div>
          <p className="text-sm text-slate-300">{m(locale, "owner.offline.hint")}</p>

          <div className="offline-privacy-banner" role="note">
            <div className="offline-privacy-banner__title">{m(locale, "owner.offline.privacyBannerTitle")}</div>
            <p className="offline-privacy-banner__text">{m(locale, "owner.offline.privacyBannerOwner")}</p>
          </div>

          {ownerPmsSettings ? (
            <OfflineBookingSyncSettings locale={locale} settings={ownerPmsSettings} saved={offlineSyncSaved} />
          ) : null}

          <OfflineBookingStaffSearch locale={locale} />

          {offlineUpdated ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100" role="status">
              {m(locale, "owner.offline.updated")}
            </div>
          ) : null}
          <OfflineBookingForm
            locale={locale}
            roomTypes={roomTypes.map((rt) => ({ id: rt.id, name: rt.name, hotel: rt.hotel }))}
            rooms={rooms.map((r) => ({
              id: r.id,
              title: r.title,
              roomNumber: r.roomNumber,
              roomTypeId: r.roomTypeId,
              hotel: r.hotel
            }))}
            error={ownerError}
            created={offlineCreated}
            defaultRoomId={Number(params?.roomId ?? "") || undefined}
            defaultCheckIn={(params?.checkIn ?? "").trim() || undefined}
            defaultCheckOut={(params?.checkOut ?? "").trim() || undefined}
          />
          {offlineBookingViews.length ? (
            <OfflineBookingsList
              locale={locale}
              bookings={offlineBookingViews}
              canViewPii
              canViewFinances
              canEditStatus
            />
          ) : (
            <EmptyState title={m(locale, "owner.offline.empty")} description={m(locale, "owner.offline.emptyHint")} />
          )}
          <Pagination page={page} totalPages={totalPages} />
        </section>
      )}

      {activeSection === "notifications" && (
        <section id="notifications" className="scroll-mt-28 space-y-4">
          <h2 className="flex flex-wrap items-center justify-between gap-3 text-xl font-bold text-slate-900">
            <span className="flex items-center gap-2">
              <span className="h-8 w-1 rounded-full bg-cyan-500" aria-hidden />
              {m(locale, "owner.notifications")}
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">{unreadCount}</span>
            )}
          </h2>
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl border bg-white p-4 text-sm">
                {n.booking ? (
                  <>
                    {getBookingGuestLabel(n.booking)} · {bookingHotel(n.booking).name} · {n.booking.checkIn.toISOString().slice(0, 10)} —{" "}
                    {n.booking.checkOut.toISOString().slice(0, 10)} · {n.booking.phone} · {tStatus(locale, n.booking.paymentStatus)}
                  </>
                ) : (
                  <span className="text-slate-600">
                    [{n.type}] · {m(locale, "admin.systemNote")}
                  </span>
                )}
                <div className="mt-1 text-xs text-slate-500">{formatDateTimeShort(locale, n.createdAt)}</div>
              </div>
            ))}
          </div>
          {!notes.length && <EmptyState title={m(locale, "owner.notificationsEmpty")} />}
          <Pagination page={page} totalPages={totalPages} />
        </section>
      )}

      {activeSection === "calendar" && (
        <section id="calendar" className="scroll-mt-28 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-8 w-1 rounded-full bg-violet-500" aria-hidden />
            <h2 className="text-xl font-bold text-slate-900">{m(locale, "owner.calendarTitle")}</h2>
          </div>
          <p className="text-sm text-slate-600">{m(locale, "owner.calendarHint")}</p>

          {!rooms.length ? (
            <EmptyState title={m(locale, "owner.calendarEmpty")} />
          ) : (
            <>
              <form action="/api/owner/overrides" method="post" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
                <select name="roomId" className="rounded-xl border px-3 py-2 md:col-span-2">
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.hotel.name} · {r.title}
                    </option>
                  ))}
                </select>
                <input name="date" type="date" className="rounded-xl border px-3 py-2" required />
                <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm md:col-span-1">
                  <input type="checkbox" name="isBlocked" defaultChecked={false} />
                  {m(locale, "owner.block")}
                </label>
                <input
                  name="customPrice"
                  type="number"
                  min={0}
                  step={1}
                  placeholder={m(locale, "owner.priceIfOpen")}
                  className="rounded-xl border px-3 py-2 md:col-span-1"
                />
                <button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2 font-medium text-white md:col-span-5">
                  {m(locale, "owner.saveOverride")}
                </button>
              </form>

              <div className="rounded-2xl border bg-white p-4">
                <div className="text-sm font-semibold">{m(locale, "owner.overridesTitle")}</div>
                <div className="mt-3 space-y-2">
                  {overrides.length ? (
                    overrides.map((o) => (
                      <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3 text-sm">
                        <div>
                          <div className="font-semibold">{o.room.hotel.name}</div>
                          <div className="text-slate-500">{o.room.title}</div>
                        </div>
                        <div className="text-right">
                          <div>{o.date.toISOString().slice(0, 10)}</div>
                          <div className="text-slate-700">
                            {o.isBlocked ? m(locale, "owner.blocked") : `${m(locale, "owner.price")}: ${o.customPrice ?? "—"} TJS`}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">{m(locale, "owner.overridesEmpty")}</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="text-sm font-semibold">{m(locale, "owner.calendarOccupiedTitle")}</div>
                <div className="mt-3 space-y-2">
                  {calendarBookings.length ? (
                    calendarBookings.map((b) => (
                      <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3 text-sm">
                        <div>
                          <div className="font-semibold">{b.room?.hotel?.name ?? "—"}</div>
                          <div className="text-slate-500">{b.room?.title ?? getBookingGuestLabel(b)}</div>
                          <div className="mt-1 text-xs text-slate-500">{getBookingGuestLabel(b)} · {b.phone}</div>
                        </div>
                        <div className="text-right">
                          <div>
                            {b.checkIn.toISOString().slice(0, 10)} — {b.checkOut.toISOString().slice(0, 10)}
                          </div>
                          <div className="text-xs text-slate-600">{tStatus(locale, b.status)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">{m(locale, "owner.calendarOccupiedEmpty")}</p>
                  )}
                </div>
              </div>

              <OwnerCalendar
                locale={locale}
                rooms={rooms}
                typeRows={calendarTypeRows}
                days={calendarDays}
                cells={calendarCells}
                cellMeta={calendarCellMeta}
                hotels={hotels.map((h: { id: number; name: string }) => ({ id: h.id, name: h.name }))}
              />
              <Pagination page={page} totalPages={totalPages} />
            </>
          )}
        </section>
      )}

      {activeSection === "reviews" && (
        <section id="reviews" className="scroll-mt-28 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-8 w-1 rounded-full bg-amber-400" aria-hidden />
            <h2 className="text-xl font-bold text-slate-900">{m(locale, "owner.reviewsSection.title")}</h2>
          </div>
          <p className="text-sm text-slate-600">{m(locale, "owner.reviewsSection.hint")}</p>
          <div className="space-y-4">
            {ownerReviews.map((r) => (
              <div key={r.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">{bookingHotel(r.booking).name}</div>
                    <div className="text-sm text-slate-500">{bookingRoomTitle(r.booking)}</div>
                  </div>
                  <div className="text-amber-500" aria-label={m(locale, "home.reviewsStarsAria", { n: r.rating })}>
                    {"★".repeat(r.rating)}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-700">{r.comment}</p>
                {r.reply ? (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="font-semibold text-slate-800">{m(locale, "guestDash.ownerReply")}</div>
                    <p className="mt-1 whitespace-pre-wrap text-slate-600">{r.reply}</p>
                  </div>
                ) : (
                  <ReviewReplyForm
                    reviewId={r.id}
                    labels={{
                      title: m(locale, "guestDash.ownerReply"),
                      placeholder: m(locale, "owner.reviewsSection.replyPlaceholder"),
                      saving: m(locale, "owner.reviewsSection.saving"),
                      submit: m(locale, "admin.save"),
                      error: m(locale, "auth.errorGeneric")
                    }}
                  />
                )}
              </div>
            ))}
            {!ownerReviews.length && <EmptyState title={m(locale, "owner.reviewsSection.empty")} />}
          </div>
        </section>
      )}

      {activeSection === "finances" && (
        <section id="finances" className="scroll-mt-28 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-8 w-1 rounded-full bg-emerald-500" aria-hidden />
            <h2 className="text-xl font-bold text-slate-900">{m(locale, "owner.finances.title")}</h2>
          </div>
          <p className="text-sm text-slate-600">{m(locale, "owner.finances.hint")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500">{m(locale, "owner.finances.revenueMonth")}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {dashboardKpis?.revenueMonth ?? Number(revenueAgg._sum?.totalPrice ?? 0)} TJS
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm text-sm text-slate-600">
              {m(locale, "owner.finances.commissionNote")}
              {revenueAgg._sum?.commission != null ? (
                <p className="mt-2 text-slate-800">
                  {m(locale, "owner.finances.commissionTotal")}: {Number(revenueAgg._sum.commission)} TJS
                </p>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">{m(locale, "owner.finances.payoutsTitle")}</h3>
            <div className="mt-3 space-y-2">
              {ownerPayouts.map((po) => (
                <div key={po.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                  <div>
                    <div className="font-semibold">{bookingHotel(po.booking).name}</div>
                    <div className="text-slate-500">{bookingRoomTitle(po.booking)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{Number(po.amount)} {po.currency}</div>
                    <div className="text-xs text-slate-500">{po.status}</div>
                  </div>
                </div>
              ))}
              {!ownerPayouts.length && <p className="text-sm text-slate-500">{m(locale, "owner.finances.payoutsEmpty")}</p>}
            </div>
          </div>
        </section>
      )}

      {activeSection === "statistics" && (
        <section id="statistics" className="scroll-mt-28 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-8 w-1 rounded-full bg-indigo-500" aria-hidden />
            <h2 className="text-xl font-bold text-slate-900">{m(locale, "owner.statisticsSection.title")}</h2>
          </div>
          <p className="text-sm text-slate-600">{m(locale, "owner.statisticsSection.hint")}</p>
          {dashboardKpis ? <OwnerDashboardKpis locale={locale} kpis={dashboardKpis} /> : null}
          <Card className="space-y-2">
            <h3 className="text-base font-semibold text-slate-100">{m(locale, "owner.conversionTitle")}</h3>
            <ul className="space-y-1 text-sm text-slate-300">
              <li>{m(locale, "owner.viewsProxy")}: {hotels.length * 24}</li>
              <li>{m(locale, "owner.clicksProxy")}: {hotels.length * 7}</li>
              <li>{m(locale, "owner.pendingBookings")}: {pendingCount}</li>
              <li>{m(locale, "owner.conversionProxy")}: {bookingConversion}%</li>
            </ul>
          </Card>
        </section>
      )}

      {activeSection === "help" && (
        <section id="help" className="scroll-mt-28 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-8 w-1 rounded-full bg-teal-500" aria-hidden />
            <h2 className="text-xl font-bold text-slate-900">{m(locale, "owner.help.title")}</h2>
          </div>
          <p className="text-sm text-slate-600">{m(locale, "owner.help.hint")}</p>
          <OwnerHelpTips locale={locale} />
        </section>
      )}
    </div>
  );
}
