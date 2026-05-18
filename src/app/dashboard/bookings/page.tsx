import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { BookingChatLauncher } from "@/components/chat/BookingChatPanel";
import type { Locale } from "@/lib/i18n/locale";
import { getLocale } from "@/lib/i18n/get-locale";

export const dynamic = "force-dynamic";

const TERMINAL = new Set(["COMPLETED", "REJECTED", "CANCELLED", "EXPIRED", "CANCELLED_BY_GUEST"]);

/** Скрыть из блока «Активные» через 15 дней после даты выезда при терминальном статусе. */
function isBookingInListArchive(b: { status: string; checkOut: Date }) {
  if (!TERMINAL.has(b.status)) return false;
  const cut = new Date(b.checkOut);
  cut.setDate(cut.getDate() + 15);
  return Date.now() > cut.getTime();
}

function statusDotClass(status: string) {
  if (["REJECTED", "CANCELLED", "EXPIRED", "CANCELLED_BY_GUEST"].includes(status)) {
    return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.45)]";
  }
  if (status === "COMPLETED") return "bg-slate-500";
  return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]";
}

function bookingRowHref(
  role: string,
  b: { id: number; status: string; publicCode: string | null }
): string {
  if (role !== "GUEST") return `/chat/booking/${b.id}`;
  const code = b.publicCode?.trim();
  if (
    code &&
    (b.status === "WAITING_PAYMENT" ||
      b.status === "WAIT_PROOF" ||
      b.status === "ON_REVIEW" ||
      b.status === "REJECTED")
  ) {
    return `/payment/${encodeURIComponent(code)}?after=1`;
  }
  return `/chat/booking/${b.id}`;
}

function BookingDialogRow({
  b,
  user,
  showAdminGuest,
  locale
}: {
  locale: Locale;
  b: {
    id: number;
    status: string;
    paymentStatus: string;
    publicCode: string | null;
    checkIn: Date;
    checkOut: Date;
    room: { title: string; hotel: { name: string; coverImageUrl: string | null } };
    user?: { name: string; phone: string } | null;
    chatMessages: { body: string }[];
  };
  user: { id: number; role: string };
  showAdminGuest: boolean;
}) {
  const last = b.chatMessages[0]?.body?.trim() || "Нет сообщений";
  const preview = last.length > 72 ? `${last.slice(0, 72)}…` : last;
  const cover = b.room.hotel.coverImageUrl || "/logo-mark.svg";
  const rowHref = bookingRowHref(user.role, b);

  return (
    <div
      className="flex items-stretch gap-3 rounded-2xl border border-white/[0.08] bg-[rgba(15,23,42,0.5)] p-3 backdrop-blur-xl transition hover:border-emerald-500/20 hover:bg-[rgba(15,23,42,0.65)]"
      style={{ borderRadius: 16 }}
    >
      <Link href={rowHref} className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={rowHref} className="block min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 truncate font-semibold text-white">{b.room.hotel.name}</div>
            <span
              className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass(b.status)}`}
              title={b.status}
              aria-hidden
            />
          </div>
          <div className="truncate text-xs text-slate-400">{b.room.title}</div>
          <div className="mt-1 truncate text-sm text-slate-500">{preview}</div>
          {showAdminGuest && b.user ? (
            <div className="mt-1 truncate text-[11px] text-slate-600">
              {b.user.name} · {b.user.phone}
            </div>
          ) : null}
        </Link>
        <div className="mt-2 flex flex-wrap gap-2">
          <BookingChatLauncher
            bookingId={b.id}
            currentUserId={user.id}
            currentUserRole={user.role as "GUEST" | "OWNER" | "ADMIN"}
            bookingStatus={b.status}
            paymentStatus={b.paymentStatus}
            checkInIso={b.checkIn.toISOString()}
            paymentCode={b.publicCode ?? undefined}
            title={user.role === "ADMIN" ? `Чат · ${b.id}` : "Чат"}
            hotelName={b.room.hotel.name}
            roomTitle={b.room.title}
            openLabel="Окно"
          />
        </div>
      </div>
    </div>
  );
}

export default async function MyBookingsPage() {
  const locale = getLocale();
  const user = await requireUser();
  if (!user) redirect("/auth/sign-in?next=/dashboard/bookings");

  if (user.role === "OWNER") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-slate-300">
        <p className="text-lg">Владельцам доступна отдельная панель.</p>
        <Link href="/dashboard/owner" className="mt-4 inline-block font-semibold text-emerald-300 underline">
          Панель владельца
        </Link>
      </div>
    );
  }

  if (user.role !== "GUEST" && user.role !== "ADMIN") {
    redirect("/dashboard/guest");
  }

  const bookings = await prisma.booking.findMany({
    where: user.role === "ADMIN" ? {} : { userId: user.id },
    include: {
      room: { include: { hotel: true } },
      ...(user.role === "ADMIN" ? { user: { select: { id: true, name: true, phone: true } } } : {}),
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

  const active = bookings.filter((b) => !isBookingInListArchive(b));
  const archived = bookings.filter((b) => isBookingInListArchive(b));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-normal tracking-tight text-white sm:text-3xl">Мои бронирования</h1>
          <p className="mt-1 text-sm text-slate-400">
            {user.role === "ADMIN" ? "Диалоги по всем броням" : "Как в мессенджере: превью и статус"}
          </p>
        </div>
        {user.role === "ADMIN" ? (
          <Link
            href="/dashboard/admin/chat-archive"
            className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 backdrop-blur-md transition hover:bg-emerald-500/20"
          >
            Архив чатов
          </Link>
        ) : null}
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Активные</h2>
          <div className="space-y-3">
            {active.map((b) => (
              <BookingDialogRow key={b.id} b={b} user={user} showAdminGuest={user.role === "ADMIN"} locale={locale} />
            ))}
          </div>
          {!active.length ? <p className="py-6 text-center text-sm text-slate-600">Нет активных броней.</p> : null}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Архив (15+ дней после выезда)</h2>
          <div className="space-y-3">
            {archived.map((b) => (
              <BookingDialogRow key={b.id} b={b} user={user} showAdminGuest={user.role === "ADMIN"} locale={locale} />
            ))}
          </div>
          {!archived.length ? <p className="py-4 text-center text-sm text-slate-600">Архив пуст.</p> : null}
        </section>
      </div>

      {!bookings.length ? <p className="py-12 text-center text-slate-500">Бронирований пока нет.</p> : null}
    </div>
  );
}
