import { prisma } from "@/lib/prisma";
import { requireModerator } from "@/lib/auth/requireModerator";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { formatBookingStatus } from "@/lib/i18n/bookingStatus";
import { formatDateTimeShort } from "@/lib/i18n/format";
import { StatusBadge, bookingStatusVariant } from "@/components/ui/StatusBadge";
import { DataToolbar } from "@/components/ui/DataToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { OwnerCalendar } from "@/components/owner/OwnerCalendar";
import { OfflineBookingForm } from "@/components/owner/OfflineBookingForm";
import { OfflineBookingsList } from "@/components/owner/OfflineBookingsList";
import { OwnerBookingConfirmButton } from "@/components/owner/OwnerBookingConfirmButton";
import { OwnerAssignRoomSelect } from "@/components/owner/OwnerAssignRoomSelect";
import Link from "next/link";
import { moderatorBookingWhere, moderatorHotelWhere, moderatorOfflineBookingWhere } from "@/lib/pms/moderatorQueries";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";
import { bookingHotel, bookingRoomTitle } from "@/lib/pms/bookingContext";
import { getModeratorCalendarData } from "@/lib/services/ownerCalendar";
import { getBookingGuestLabel, BOOKING_STATUS } from "@/lib/domain/booking";
import { toOfflineOwnerView } from "@/lib/pms/offlinePrivacy";

export const dynamic = "force-dynamic";

const API_BASE = "/api/moderator";
const DASHBOARD_BASE = "/dashboard/moderator";

type ModeratorSection = "bookings" | "calendar" | "offline-bookings";

const VALID_SECTIONS = new Set<ModeratorSection>(["bookings", "calendar", "offline-bookings"]);

export default async function ModeratorDashboardPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | undefined>> | Record<string, string | undefined>;
}) {
  const user = await requireModerator();
  const locale = getLocale();
  const params = searchParams ? await searchParams : undefined;
  const raw = params?.section;
  const activeSection: ModeratorSection =
    raw && VALID_SECTIONS.has(raw as ModeratorSection) ? (raw as ModeratorSection) : "bookings";

  const pageSize = 20;
  const page = Math.max(1, Number(params?.page ?? "1") || 1);
  const q = (params?.q ?? "").trim();
  const status = (params?.status ?? "").trim();
  const offlineCreated = (params?.created ?? "").trim() === "1";
  const offlineError = (params?.error ?? "").trim();

  const hotels = await prisma.hotel.findMany({
    where: moderatorHotelWhere(user.id),
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true }
  });

  if (!hotels.length) {
    return (
      <EmptyState
        title={m(locale, "moderator.noHotelsTitle")}
        description={m(locale, "moderator.noHotelsDescription")}
      />
    );
  }

  if (activeSection === "calendar") {
    const cal = await getModeratorCalendarData(user.id, 30);
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{m(locale, "moderator.navCalendar")}</h2>
          <p className="mt-1 text-sm text-white/55">{m(locale, "moderator.calendarHint")}</p>
        </div>
        <OwnerCalendar
          locale={locale}
          rooms={cal.rooms}
          typeRows={cal.typeRows ?? []}
          days={cal.days}
          cells={cal.cells}
          cellMeta={cal.cellMeta}
          hotels={hotels}
          readOnly
          offlineBookingBasePath={`${DASHBOARD_BASE}?section=offline-bookings`}
        />
      </section>
    );
  }

  if (activeSection === "offline-bookings") {
    const [roomTypes, rooms, cal, totalRows, offlineBookings] = await Promise.all([
      prisma.roomType.findMany({
        where: { hotel: moderatorHotelWhere(user.id) },
        include: { hotel: true },
        orderBy: [{ hotelId: "asc" }, { name: "asc" }]
      }),
      prisma.room.findMany({
        where: { hotel: moderatorHotelWhere(user.id) },
        include: { hotel: true },
        orderBy: [{ roomNumber: "asc" }, { id: "asc" }]
      }),
      getModeratorCalendarData(user.id, 14),
      prisma.booking.count({ where: moderatorOfflineBookingWhere(user.id) }),
      prisma.booking.findMany({
        where: moderatorOfflineBookingWhere(user.id),
        include: { ...bookingWithHotelInclude, user: true },
        orderBy: { checkIn: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

    return (
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white">{m(locale, "moderator.navOfflineBookings")}</h2>
          <p className="mt-1 text-sm text-white/55">{m(locale, "moderator.offlineStaffHint")}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
          <p className="mb-3 text-sm font-semibold text-white">{m(locale, "moderator.offlineCalendarTitle")}</p>
          <OwnerCalendar
            locale={locale}
            rooms={cal.rooms}
            typeRows={cal.typeRows ?? []}
            days={cal.days}
            cells={cal.cells}
            cellMeta={cal.cellMeta}
            hotels={hotels}
            readOnly
            offlineBookingBasePath={`${DASHBOARD_BASE}?section=offline-bookings`}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-slate-900">{m(locale, "moderator.offlineFormTitle")}</p>
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
            created={offlineCreated}
            error={offlineError || undefined}
            defaultRoomId={Number(params?.roomId ?? "") || undefined}
            defaultCheckIn={params?.checkIn}
            defaultCheckOut={params?.checkOut}
            variant="staff"
            apiBase={API_BASE}
          />
        </div>

        {offlineBookings.length ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">{m(locale, "moderator.offlineRecentTitle")}</p>
            <OfflineBookingsList
              locale={locale}
              bookings={offlineBookings.map((b) => toOfflineOwnerView(b, true, false))}
              canViewPii
              canViewFinances={false}
              canEditStatus
              apiBase={API_BASE}
            />
            <Pagination page={page} totalPages={totalPages} />
          </div>
        ) : (
          <EmptyState title={m(locale, "moderator.offlineEmpty")} description={m(locale, "moderator.offlineStaffHint")} />
        )}
      </section>
    );
  }

  const where = {
    AND: [
      moderatorBookingWhere(user.id),
      ...(status ? [{ status }] : []),
      ...(q
        ? [
            {
              OR: [
                { phone: { contains: q } },
                { guestName: { contains: q, mode: "insensitive" as const } },
                { guestPhone: { contains: q } },
                { publicCode: { contains: q, mode: "insensitive" as const } },
                { user: { name: { contains: q, mode: "insensitive" as const } } }
              ]
            }
          ]
        : [])
    ]
  };

  const [totalRows, bookings, assignRooms] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: { ...bookingWithHotelInclude, user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.room.findMany({
      where: { hotel: moderatorHotelWhere(user.id), roomTypeId: { not: null } },
      select: { id: true, title: true, roomNumber: true, roomTypeId: true },
      orderBy: [{ roomNumber: "asc" }, { id: "asc" }]
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">{m(locale, "moderator.navBookings")}</h2>
        <p className="mt-1 text-sm text-white/55">{m(locale, "moderator.bookingsHint")}</p>
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
              { value: BOOKING_STATUS.PENDING_OWNER, label: formatBookingStatus(locale, BOOKING_STATUS.PENDING_OWNER) },
              { value: BOOKING_STATUS.CONFIRMED, label: formatBookingStatus(locale, BOOKING_STATUS.CONFIRMED) },
              { value: BOOKING_STATUS.CHECKED_IN, label: formatBookingStatus(locale, BOOKING_STATUS.CHECKED_IN) },
              { value: BOOKING_STATUS.COMPLETED, label: formatBookingStatus(locale, BOOKING_STATUS.COMPLETED) },
              { value: BOOKING_STATUS.CANCELLED, label: formatBookingStatus(locale, BOOKING_STATUS.CANCELLED) }
            ]
          }
        ]}
      />

      {!bookings.length ? (
        <EmptyState title={m(locale, "moderator.emptyBookings")} description={m(locale, "moderator.bookingsHint")} />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const hotel = bookingHotel(b);
            const guest = getBookingGuestLabel(b);
            return (
              <article key={b.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{hotel.name}</p>
                    <p className="text-sm text-white/60">
                      {bookingRoomTitle(b)} · {formatDateTimeShort(locale, b.checkIn)} —{" "}
                      {formatDateTimeShort(locale, b.checkOut)}
                    </p>
                    <p className="mt-1 text-sm text-white/75">{guest}</p>
                    {b.publicCode ? <p className="text-xs text-white/45">#{b.publicCode}</p> : null}
                  </div>
                  <StatusBadge variant={bookingStatusVariant(b.status)}>
                    {formatBookingStatus(locale, b.status)}
                  </StatusBadge>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {b.status === BOOKING_STATUS.PENDING_OWNER && b.payOnArrival ? (
                    <OwnerBookingConfirmButton bookingId={b.id} locale={locale} apiBase={API_BASE} />
                  ) : null}
                  {b.roomTypeId ? (
                    <OwnerAssignRoomSelect
                      locale={locale}
                      bookingId={b.id}
                      roomTypeId={b.roomTypeId}
                      rooms={assignRooms.filter((r) => r.roomTypeId === b.roomTypeId)}
                      assignedRoomId={b.assignedRoomId ?? b.roomId}
                      apiBase={API_BASE}
                    />
                  ) : null}
                  <Link
                    href={`/chat/booking/${b.id}`}
                    className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold text-emerald-100"
                  >
                    {m(locale, "moderator.openChat")}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} />
    </section>
  );
}
