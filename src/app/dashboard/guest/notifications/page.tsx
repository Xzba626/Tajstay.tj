import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { formatDateTimeShort } from "@/lib/i18n/format";
import { notificationText } from "@/lib/notifications/text";

export const dynamic = "force-dynamic";

export default async function GuestNotificationsPage({
  searchParams
}: {
  searchParams?: { filter?: "all" | "unread" };
}) {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-8">
        <h1 className="text-2xl font-semibold text-white">Уведомления</h1>
        <p className="text-brand-200">{m(locale, "guestDash.signInPrompt")}</p>
        <a className="ds-primary-btn inline-flex items-center" href="/auth/sign-in">
          {m(locale, "guestDash.signIn")}
        </a>
      </div>
    );
  }

  const activeFilter = searchParams?.filter === "unread" ? "unread" : "all";
  const notes = await prisma.notification.findMany({
    where: { userId: user.id },
    include: {
      booking: { include: { room: { include: { hotel: true } } } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  const unreadCount = notes.filter((n) => !n.isRead).length;
  const visibleNotes = activeFilter === "unread" ? notes.filter((n) => !n.isRead) : notes;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Уведомления</h1>
          <p className="mt-1 text-sm text-brand-200">Непрочитанные: {unreadCount}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/dashboard/guest/notifications?filter=all"
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              activeFilter === "all"
                ? "border-brand-500 bg-brand-700 text-white"
                : "border-brand-700 bg-brand-800 text-brand-200 hover:bg-brand-700"
            }`}
          >
            Все
          </a>
          <a
            href="/dashboard/guest/notifications?filter=unread"
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              activeFilter === "unread"
                ? "border-brand-500 bg-brand-700 text-white"
                : "border-brand-700 bg-brand-800 text-brand-200 hover:bg-brand-700"
            }`}
          >
            Непрочитанные
          </a>
          <form action="/api/notifications/read-all" method="post">
            <button className="ds-primary-btn text-sm" type="submit">
              Отметить всё прочитанным
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-2">
        {visibleNotes.map((n) => (
          <div
            key={n.id}
            className={`rounded-xl border p-4 text-sm ${n.isRead ? "border-brand-700 bg-brand-800 text-brand-200" : "border-brand-600 bg-brand-700 text-white"}`}
          >
            <div className="font-semibold">{notificationText(locale, n.type, n.booking?.publicCode ?? null)}</div>
            {n.booking ? (
              <div className="mt-1 text-brand-200">
                {n.booking.room.hotel.name}
              </div>
            ) : null}
            <div className="mt-1 text-xs text-brand-200">{formatDateTimeShort(locale, n.createdAt)}</div>
          </div>
        ))}
        {!visibleNotes.length ? (
          <div className="rounded-xl border border-dashed border-brand-700 bg-brand-900/30 p-4 text-sm text-brand-200">
            {activeFilter === "unread" ? "Непрочитанных уведомлений нет." : "Пока нет уведомлений."}
          </div>
        ) : null}
      </div>
    </div>
  );
}

