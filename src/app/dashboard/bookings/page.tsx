import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { TripsTabNav, type TripsTabLabels } from "@/components/trips/TripsTabNav";
import { TripMockupCard } from "@/components/trips/TripMockupCard";
import { filterBookingsByTab, parseTripsTab, type TripsTab } from "@/lib/trips/classify";
import { tripsHubPath } from "@/lib/trips/urls";
import type { Locale } from "@/lib/i18n/locale";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

function tabLabels(locale: Locale): TripsTabLabels {
  return {
    active: m(locale, "tripsHub.tabActive"),
    pending: m(locale, "tripsHub.tabPending"),
    history: m(locale, "tripsHub.tabHistory"),
    cancelled: m(locale, "tripsHub.tabCancelled"),
    payments: m(locale, "tripsHub.tabPayments")
  };
}

function emptyMessage(locale: Locale, tab: TripsTab): string {
  const map: Record<TripsTab, string> = {
    active: m(locale, "tripsHub.emptyActive"),
    pending: m(locale, "tripsHub.emptyPending"),
    history: m(locale, "tripsHub.emptyHistory"),
    cancelled: m(locale, "tripsHub.emptyCancelled"),
    payments: m(locale, "tripsHub.emptyPayments")
  };
  return map[tab];
}

export default async function TripsHubPage({
  searchParams
}: {
  searchParams?: { tab?: string; notice?: string; error?: string };
}) {
  const locale = getLocale();
  const user = await requireUser();
  if (!user) redirect("/auth/sign-in?next=/dashboard/bookings");

  if (user.role === "OWNER") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-slate-300">
        <p className="text-lg">{m(locale, "tripsHub.ownerRedirect")}</p>
        <Link href="/dashboard/owner" className="mt-4 inline-block font-semibold text-emerald-300 underline">
          {m(locale, "profile.navOwner")}
        </Link>
      </div>
    );
  }

  if (user.role !== "GUEST" && user.role !== "ADMIN") {
    redirect(tripsHubPath("active"));
  }

  const tab = parseTripsTab(searchParams?.tab);
  const notice = (searchParams?.notice ?? "").trim();
  const docError = searchParams?.error === "document";

  const hotelSelect = {
    id: true,
    name: true,
    ownerId: true,
    coverImageUrl: true
  } as const;

  const bookings = await prisma.booking.findMany({
    where: user.role === "ADMIN" ? {} : { userId: user.id },
    include: {
      assignedRoom: { include: { hotel: { select: hotelSelect } } },
      room: { include: { hotel: { select: hotelSelect } } },
      roomType: { include: { hotel: { select: hotelSelect } } },
      review: true,
      ...(user.role === "ADMIN"
        ? { user: { select: { id: true, name: true, phone: true } } }
        : {}),
      chatMessages: {
        where: { deletedAt: null, isArchived: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const counts = {
    active: filterBookingsByTab(bookings, "active").length,
    pending: filterBookingsByTab(bookings, "pending").length,
    history: filterBookingsByTab(bookings, "history").length,
    cancelled: filterBookingsByTab(bookings, "cancelled").length,
    payments: filterBookingsByTab(bookings, "payments").length
  };

  const filtered = filterBookingsByTab(bookings, tab);
  const labels = tabLabels(locale);

  return (
    <div className="mockup-screen max-w-2xl">
      <h1 className="mockup-screen__title">{m(locale, "tripsHub.title")}</h1>
      <p className="mockup-screen__subtitle mb-4">
        {user.role === "ADMIN" ? m(locale, "tripsHub.subtitleAdmin") : m(locale, "tripsHub.subtitleGuest")}
      </p>

      {notice === "adminOnly" ? (
        <div className="mb-4 rounded-xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm text-brand-200" role="status">
          {m(locale, "guestDash.adminOnlyNotice")}
        </div>
      ) : null}
      {notice === "ownerOnly" ? (
        <div className="mb-4 rounded-xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm text-brand-200" role="status">
          {m(locale, "guestDash.ownerOnlyNotice")}
        </div>
      ) : null}
      {docError ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100" role="alert">
          {m(locale, "tripsHub.documentError")}
        </div>
      ) : null}

      <Suspense fallback={<div className="trips-tab-nav trips-tab-nav--skeleton" aria-hidden />}>
        <TripsTabNav labels={labels} counts={counts} />
      </Suspense>

      <div className="space-y-3">
        {filtered.map((b) => (
          <TripMockupCard key={b.id} locale={locale} booking={b} />
        ))}
        {!filtered.length ? (
          <p className="py-12 text-center text-sm text-[var(--text-muted)]">{emptyMessage(locale, tab)}</p>
        ) : null}
      </div>

      <div className="mockup-support-footer">
        {m(locale, "tripsHub.supportHint")}{" "}
        <Link href="/faq">{m(locale, "tripsHub.supportLink")}</Link>
      </div>

      {!bookings.length ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">{m(locale, "tripsHub.emptyAll")}</p>
      ) : null}
    </div>
  );
}
