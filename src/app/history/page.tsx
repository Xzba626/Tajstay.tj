import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { TripsTabNav, type TripsTabLabels } from "@/components/trips/TripsTabNav";
import { HistoryRecordCard } from "@/components/trips/HistoryRecordCard";
import { countBookingsByTabs, filterBookingsByTab, parseTripsTab, type TripsTab } from "@/lib/trips/classify";
import { tripsHubPath } from "@/lib/trips/urls";
import type { Locale } from "@/lib/i18n/locale";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = getLocale();
  return {
    title: `${m(locale, "tripsHub.title")} — TajStay`,
    description: m(locale, "tripsHub.subtitleGuest")
  };
}

function tabLabels(locale: Locale): TripsTabLabels {
  return {
    confirmed: m(locale, "tripsHub.tabConfirmed"),
    unconfirmed: m(locale, "tripsHub.tabUnconfirmed"),
    past: m(locale, "tripsHub.tabPast"),
    cancelled: m(locale, "tripsHub.tabCancelled"),
    all: m(locale, "tripsHub.tabAll")
  };
}

function emptyMessage(locale: Locale, tab: TripsTab): string {
  const map: Record<TripsTab, string> = {
    confirmed: m(locale, "tripsHub.emptyConfirmed"),
    unconfirmed: m(locale, "tripsHub.emptyUnconfirmed"),
    past: m(locale, "tripsHub.emptyPast"),
    cancelled: m(locale, "tripsHub.emptyCancelled"),
    all: m(locale, "tripsHub.emptyAll")
  };
  return map[tab];
}

type Props = {
  searchParams?: { tab?: string; notice?: string; error?: string };
};

export default async function HistoryPage({ searchParams }: Props) {
  const locale = getLocale();
  const user = await requireUser();
  if (!user) redirect("/auth/sign-in?next=/history");

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
    redirect(tripsHubPath("confirmed"));
  }

  const tab = parseTripsTab(searchParams?.tab);
  const notice = (searchParams?.notice ?? "").trim();
  const docError = searchParams?.error === "document";

  const bookings = await prisma.booking.findMany({
    where: user.role === "ADMIN" ? {} : { userId: user.id },
    include: {
      room: { include: { hotel: { select: { id: true, name: true, city: true, ownerId: true, coverImageUrl: true, owner: true } } } },
      roomType: { include: { hotel: { select: { id: true, name: true, city: true, ownerId: true, coverImageUrl: true, owner: true } } } },
      assignedRoom: { include: { hotel: { select: { id: true, name: true, city: true, coverImageUrl: true } } } },
      review: { select: { id: true } },
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

  const counts = countBookingsByTabs(bookings);
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

      <Suspense fallback={<div className="mockup-segment mb-4 h-11 animate-pulse" aria-hidden />}>
        <TripsTabNav labels={labels} counts={counts} filtersAria={m(locale, "tripsHub.filtersAria")} />
      </Suspense>

      <div className="space-y-3">
        {filtered.map((b) => (
          <HistoryRecordCard key={b.id} locale={locale} booking={b} />
        ))}
        {!filtered.length ? (
          <p className="py-12 text-center text-sm text-[var(--text-muted)]">{emptyMessage(locale, tab)}</p>
        ) : null}
      </div>

      <div className="mockup-support-footer">
        {m(locale, "tripsHub.supportHint")}{" "}
        <Link href="/faq">{m(locale, "tripsHub.supportLink")}</Link>
      </div>
    </div>
  );
}
