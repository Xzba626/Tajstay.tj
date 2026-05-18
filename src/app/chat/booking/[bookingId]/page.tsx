import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BookingChatPanel } from "@/components/chat/BookingChatPanel";
import { getLocale } from "@/lib/i18n/get-locale";

export const dynamic = "force-dynamic";

export default async function BookingChatPage({
  params,
  searchParams
}: {
  params: { bookingId: string };
  searchParams?: { code?: string };
}) {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) notFound();

  const bookingId = Number(params.bookingId || "");
  if (!bookingId) notFound();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { include: { hotel: true } }, payment: true, user: true }
  });
  if (!booking) notFound();

  const isGuest = booking.userId === user.id;
  const isOwner = booking.room.hotel.ownerId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isGuest && !isOwner && !isAdmin) notFound();

  // Owner is "quiet": can't open chat details until ON_REVIEW (server-side guard).
  if (isOwner && (booking.status === "WAITING_PAYMENT" || booking.status === "WAIT_PROOF")) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <div className="surface-1 rounded-2xl p-4">
          <h1 className="text-2xl font-semibold text-white">Новый запрос</h1>
          <p className="mt-2 text-sm text-brand-200">
            Идёт проверка данных гостя. Детали чата станут доступны после статуса <span className="font-semibold">ON_REVIEW</span>.
          </p>
        </div>
      </div>
    );
  }

  const code = (searchParams?.code ?? booking.publicCode ?? "").trim();

  if (
    isGuest &&
    code &&
    (booking.status === "WAITING_PAYMENT" ||
      booking.status === "WAIT_PROOF" ||
      booking.status === "ON_REVIEW" ||
      booking.status === "REJECTED")
  ) {
    redirect(`/payment/${encodeURIComponent(code)}?after=1`);
  }

  const backHref = isAdmin || isGuest ? "/dashboard/bookings" : "/dashboard/owner";

  const title =
    user.role === "ADMIN"
      ? "Админ · чат брони"
      : isGuest
        ? "Чат с владельцем"
        : "Чат с гостем";

  return (
    <div className="mx-auto max-w-lg px-3 py-4 sm:px-4 sm:py-6">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <Link href={backHref} className="text-slate-400 transition hover:text-white">
          ← {isGuest || isAdmin ? "Мои бронирования" : "Кабинет владельца"}
        </Link>
        {code ? (
          <Link
            href={`/payment/${encodeURIComponent(code)}?after=1`}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-emerald-100 backdrop-blur-sm"
          >
            К оплате
          </Link>
        ) : null}
      </div>

      <BookingChatPanel
        bookingId={bookingId}
        currentUserId={user.id}
        currentUserRole={user.role as "GUEST" | "OWNER" | "ADMIN"}
        locale={locale}
        bookingStatus={booking.status}
        paymentStatus={booking.paymentStatus}
        checkInIso={booking.checkIn.toISOString()}
        paymentCode={code}
        presentation="page"
        title={title}
        hotelName={booking.room.hotel.name}
        roomTitle={booking.room.title}
        counterpartPreview={
          isAdmin
            ? `${booking.user.name} · ${booking.room.hotel.name}`
            : isGuest
              ? `Владелец · поддержка TajStay`
              : `Гость: ${booking.user.name}`
        }
      />
    </div>
  );
}

