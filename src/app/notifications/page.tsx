import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { formatDateTimeShort } from "@/lib/i18n/format";
import { notificationText } from "@/lib/notifications/text";
import { matchesCategory, type NotificationCategory } from "@/lib/notifications/categories";
import { NotificationsLiveRefresh } from "@/components/notifications/NotificationsLiveRefresh";
import { NotificationsPageHeader } from "@/components/notifications/NotificationsPageHeader";
import { NotificationListCard } from "@/components/notifications/NotificationListCard";
import { NotificationsMarkReadButton } from "@/components/notifications/NotificationsMarkReadButton";
import { Button, EmptyStateCard, FilterChip, PageContainer, Stack } from "@/components/ds";
import { Cluster } from "@/components/ds/Cluster";

export const dynamic = "force-dynamic";

const CATEGORIES: NotificationCategory[] = ["all", "unread", "bookings", "messages", "finance", "moderation"];

function backHref(role: string): string {
  if (role === "OWNER") return "/dashboard/owner";
  if (role === "ADMIN") return "/dashboard/admin";
  return "/dashboard/bookings";
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
      booking: {
        include: {
          room: { include: { hotel: true } },
          roomType: { include: { hotel: true } }
        }
      }
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
    <PageContainer width="narrow">
      <Stack gap="lg">
        <NotificationsLiveRefresh />

        <NotificationsPageHeader
          backHref={backHref(user.role)}
          backLabel={m(locale, "notificationsPage.back")}
          title={m(locale, "notificationsPage.title")}
          subtitle={`${m(locale, "notificationsPage.unreadCount")}: ${unreadCount}`}
          actions={
            <form action="/api/notifications/read-all" method="post">
              <Button type="submit" variant="success" size="sm">
                {m(locale, "userMenu.markReadAll")}
              </Button>
            </form>
          }
        />

        <Cluster gap="sm">
          <FilterChip href="/notifications?filter=all" active={activeFilter === "all"} tone="primary">
            {m(locale, "notificationsPage.filterAll")}
          </FilterChip>
          <FilterChip href="/notifications?filter=unread" active={activeFilter === "unread"} tone="primary">
            {m(locale, "notificationsPage.filterUnread")}
          </FilterChip>
          {(["bookings", "messages", "finance", "moderation"] as const).map((cat) => (
            <FilterChip
              key={cat}
              href={`/notifications?category=${cat}`}
              active={category === cat}
              tone="accent"
            >
              {m(locale, `notificationsPage.category.${cat}`)}
            </FilterChip>
          ))}
        </Cluster>

        <Stack gap="xs">
          {visibleNotes.map((n) => {
            const href = n.link || (n.bookingId ? `/chat/booking/${n.bookingId}` : backHref(user.role));
            const label = notificationText(locale, n.type, n.booking?.publicCode ?? null, {
              title: n.title,
              message: n.message
            });
            return (
              <NotificationListCard
                key={n.id}
                state={n.isRead ? "read" : "unread"}
                title={label}
                hotelName={n.booking?.room?.hotel?.name ?? n.booking?.roomType?.hotel?.name ?? null}
                timestamp={formatDateTimeShort(locale, n.createdAt)}
                openHref={href}
                openLabel={m(locale, "notificationsPage.open")}
                markReadAction={
                  !n.isRead ? (
                    <form action={`/api/notifications/${n.id}/read`} method="post">
                      <NotificationsMarkReadButton label={m(locale, "notificationsPage.markRead")} />
                    </form>
                  ) : undefined
                }
              />
            );
          })}
          {!visibleNotes.length ? (
            <EmptyStateCard title={m(locale, "notificationsPage.empty")} align="center" />
          ) : null}
        </Stack>
      </Stack>
    </PageContainer>
  );
}
