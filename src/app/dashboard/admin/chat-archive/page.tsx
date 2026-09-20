import { requireAdmin } from "@/lib/auth/requireAdmin";
import { ChatArchiveClient } from "./ChatArchiveClient";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

export default async function AdminChatArchivePage() {
  await requireAdmin();
  const locale = getLocale();

  // ADM-17 (BLOCK ADMIN 6.0 §26.8 / §26.9): this route already inherits the shared Admin
  // header/sidebar from dashboard/admin/layout.tsx (it's a nested route) — the only shell gap
  // was its own bare "← " back link, replaced here with the reusable AdminBackButton (ADM-7).
  // Not part of `VALID_SECTIONS` in page.tsx by design: it's a standalone tool reached from a
  // booking's chat panel (BookingChatPanel.tsx), not a sidebar destination.
  return (
    <div className="admin-command-center mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <AdminBackButton href="/dashboard/bookings" label={m(locale, "admin.backButtonDefault")} />
      <h1 className="mt-4 text-2xl font-bold text-[var(--admin-text)] sm:text-3xl">
        {m(locale, "admin.chatArchiveTitle")}
      </h1>
      <p className="mt-2 text-sm text-[var(--admin-text-muted)]">{m(locale, "admin.chatArchiveSubtitle")}</p>
      <div className="mt-8">
        <ChatArchiveClient locale={locale} />
      </div>
    </div>
  );
}
