import Link from "next/link";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { ChatArchiveClient } from "./ChatArchiveClient";

export const dynamic = "force-dynamic";

export default async function AdminChatArchivePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/dashboard/bookings" className="text-sm text-slate-400 hover:text-white">
        ← Мои бронирования
      </Link>
      <h1 className="mt-4 font-serif text-2xl font-normal text-white sm:text-3xl">Архив переписок</h1>
      <p className="mt-2 text-sm text-slate-400">
        Выгрузка для налоговой и споров: сообщения из холодного архива и метаданные брони.
      </p>
      <div className="mt-8">
        <ChatArchiveClient />
      </div>
    </div>
  );
}
