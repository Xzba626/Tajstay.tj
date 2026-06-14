import Link from "next/link";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { ChatArchiveClient } from "./ChatArchiveClient";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";

export default async function AdminChatArchivePage() {
  await requireAdmin();
  const locale = getLocale();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/dashboard/admin?section=archive" className="text-sm text-slate-400 hover:text-white">
        ← {m(locale, "adminNav.archive")}
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-normal text-white sm:text-3xl">{m(locale, "chatArchive.title")}</h1>
      <p className="mt-2 text-sm text-slate-400">{m(locale, "chatArchive.subtitle")}</p>
      <div className="mt-8">
        <ChatArchiveClient locale={locale} />
      </div>
    </div>
  );
}
