import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/requireAuth";
import { MessagesInbox } from "@/components/chat/MessagesInbox";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

export default async function DashboardMessagesPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "HOTEL_MODERATOR"]);
  if (!user) redirect("/auth/sign-in?next=/dashboard/messages");

  const backHref =
    user.role === "OWNER"
      ? "/dashboard/owner"
      : user.role === "HOTEL_MODERATOR"
        ? "/dashboard/moderator"
        : user.role === "ADMIN"
          ? "/dashboard/admin"
          : "/dashboard/bookings";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--brand-bg)]">
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <Link href={backHref} className="text-sm text-slate-400 transition hover:text-white">
          ← {m(locale, "inbox.back")}
        </Link>
      </div>
      <MessagesInbox locale={locale} role={user.role} />
    </div>
  );
}
