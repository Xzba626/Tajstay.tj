import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { formatDateTimeShort } from "@/lib/i18n/format";
import { notificationText } from "@/lib/notifications/text";
import { matchesCategory, type NotificationCategory } from "@/lib/notifications/categories";

export const dynamic = "force-dynamic";

const CATEGORIES: NotificationCategory[] = ["all", "unread", "bookings", "messages", "finance", "moderation"];

function backHref(role: string): string {
  if (role === "OWNER") return "/dashboard/owner";
  if (role === "ADMIN") return "/dashboard/admin";
  return "/dashboard/guest";
}

export default async function NotificationsPage({
  searchParams
}: {
  searchParams?: { filter?: string; category?: string };
}) {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/notifications");

  const activeFilter = searchParams?.filter === "unread" ? "unread" : "all";
  const rawCategory = (searchParams?.category ?? "all").trim() as NotificationCategory;
  const category = CATEGORIES.includes(rawCategory) ? rawCategory : "all";

  const notes = await prisma.notification.findMany({
    where: { userId: user.id },
    include: {
      booking: { include: { room: { include: { hotel: true } } } }
    },
    orderBy: { createdAt: "desc" },
    take: 150
  });

  const unreadCount = notes.filter((n) => !n.isRead).length;
  const visibleNotes = notes.filter((n) => {
    if (activeFilter === "unread" && n.isRead) return false;
    if (category !== "all" && category !== "unread" && !matchesCategory(n.type, category)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={backHref(user.role)} className="text-sm text-slate-500 hover:text-slate-800">
            ← {m(locale, "notificationsPage.back")}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{m(locale, "notificationsPage.title")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {m(locale, "notificationsPage.unreadCount")}: {unreadCount}
          </p>
        </div>
        <form action="/api/notifications/read-all" method="post">
          <button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
            {m(locale, "userMenu.markReadAll")}
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href="/notifications?filter=all"
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            activeFilter === "all" ? "bg-emerald-700 text-white" : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          {m(locale, "notificationsPage.filterAll")}
        </a>
        <a
          href="/notifications?filter=unread"
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            activeFilter === "unread" ? "bg-emerald-700 text-white" : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          {m(locale, "notificationsPage.filterUnread")}
        </a>
        {(["bookings", "messages", "finance", "moderation"] as const).map((cat) => (
          <a
            key={cat}
            href={`/notifications?category=${cat}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              category === cat ? "bg-slate-800 text-white" : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {m(locale, `notificationsPage.category.${cat}`)}
          </a>
        ))}
      </div>

      <div className="space-y-2">
        {visibleNotes.map((n) => {
          const href = n.link || (n.bookingId ? `/chat/booking/${n.bookingId}` : backHref(user.role));
          const label = notificationText(locale, n.type, n.booking?.publicCode ?? null, {
            title: n.title,
            message: n.message
          });
          return (
            <div
              key={n.id}
              className={`rounded-xl border p-4 text-sm ${
                n.isRead ? "border-slate-200 bg-white text-slate-700" : "border-emerald-300 bg-emerald-50 text-slate-900"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="font-semibold">{label}</div>
                {!n.isRead ? (
                  <form action={`/api/notifications/${n.id}/read`} method="post">
                    <button type="submit" className="text-xs font-semibold text-emerald-800 underline">
                      {m(locale, "notificationsPage.markRead")}
                    </button>
                  </form>
                ) : null}
              </div>
              {n.booking ? <div className="mt-1 text-slate-600">{n.booking.room.hotel.name}</div> : null}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>{formatDateTimeShort(locale, n.createdAt)}</span>
                <Link href={href} className="font-semibold text-emerald-800 hover:underline">
                  {m(locale, "notificationsPage.open")}
                </Link>
              </div>
            </div>
          );
        })}
        {!visibleNotes.length ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
            {m(locale, "notificationsPage.empty")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
