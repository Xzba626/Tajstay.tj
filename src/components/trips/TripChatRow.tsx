import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { BookingChatLauncher } from "@/components/chat/BookingChatPanel";
import type { Locale } from "@/lib/i18n/locale";
import { formatBookingStatus } from "@/lib/i18n/bookingStatus";
import { m } from "@/lib/i18n/messages";

function statusDotClass(status: string) {
  if (["REJECTED", "CANCELLED", "EXPIRED", "CANCELLED_BY_GUEST"].includes(status)) {
    return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.45)]";
  }
  if (status === "COMPLETED") return "bg-slate-500";
  return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]";
}

type Props = {
  locale: Locale;
  user: { id: number; role: string };
  booking: {
    id: number;
    status: string;
    paymentStatus: string;
    publicCode: string | null;
    checkIn: Date;
    checkOut: Date;
    room: { title: string; hotel: { name: string; coverImageUrl: string | null } } | null;
    roomType?: { name: string; hotel: { name: string; coverImageUrl: string | null } } | null;
    user?: { name: string; phone: string } | null;
    chatMessages: { body: string }[];
  };
  showAdminGuest?: boolean;
};

export function TripChatRow({ locale, user, booking: b, showAdminGuest }: Props) {
  const hotel = b.room?.hotel ?? b.roomType?.hotel;
  const roomTitle = b.room?.title ?? b.roomType?.name ?? "—";
  const last = b.chatMessages[0]?.body?.trim() || m(locale, "tripsHub.noMessages");
  const preview = last.length > 72 ? `${last.slice(0, 72)}…` : last;
  const cover = hotel?.coverImageUrl || BRAND.logoMark;
  const rowHref = `/chat/booking/${b.id}`;
  const statusLabel = formatBookingStatus(locale, b.status);

  return (
    <div className="trip-chat-row">
      <Link href={rowHref} className="trip-chat-row__thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={rowHref} className="block min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 truncate font-semibold text-white">{hotel?.name ?? "—"}</div>
            <span className={`trip-chat-row__dot ${statusDotClass(b.status)}`} title={statusLabel} aria-hidden />
          </div>
          <div className="truncate text-xs text-emerald-100/55">{roomTitle}</div>
          <div className="mt-1 truncate text-sm text-emerald-100/45">{preview}</div>
          {showAdminGuest && b.user ? (
            <div className="mt-1 truncate text-[11px] text-emerald-100/35">
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
            title={user.role === "ADMIN" ? m(locale, "tripsHub.chatAdminTitle", { id: String(b.id) }) : m(locale, "tripsHub.chatTitle")}
            hotelName={hotel?.name ?? "—"}
            roomTitle={roomTitle}
            openLabel={m(locale, "tripsHub.chatOpen")}
          />
        </div>
      </div>
    </div>
  );
}
