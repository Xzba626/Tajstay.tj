import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { Card } from "@/shared/ui";
import { CheckoutSteps } from "@/processes/checkout/CheckoutSteps";
import { computeRoomTotalPrice } from "@/lib/services/bookingPricing";
import { BookingWizard } from "@/processes/checkout/BookingWizard";
import { getPublicOriginFromHeaders } from "@/lib/http/publicOriginHeaders";
import { isPlaceholderAccountPhone, phoneForGuestBookingForm } from "@/lib/auth/accountPhone";

export const dynamic = "force-dynamic";

const BOOK_ERR_KEYS: Record<string, string> = {
  invalid: "checkout.errInvalid",
  dates: "checkout.errDates",
  phone_in_use: "checkout.errPhoneTaken",
  unavailable: "checkout.errUnavailable",
  failed: "checkout.errGeneric",
  rate: "checkout.errRate"
};

export default async function BookingPage({
  searchParams
}: {
  searchParams: { roomId?: string; checkIn?: string; checkOut?: string; bookErr?: string };
}) {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  const needsSavedPhone = Boolean(user && isPlaceholderAccountPhone(user.phone));

  const roomId = Number(searchParams.roomId);
  if (!roomId) notFound();

  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { hotel: true } });
  if (!room) notFound();
  const checkInDate = searchParams.checkIn ? new Date(searchParams.checkIn) : null;
  const checkOutDate = searchParams.checkOut ? new Date(searchParams.checkOut) : null;
  const msPerDay = 24 * 60 * 60 * 1000;
  const nights =
    checkInDate && checkOutDate && checkOutDate.getTime() > checkInDate.getTime()
      ? Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / msPerDay))
      : 1;

  let totalToCharge = Number(room.price) * nights;
  if (checkInDate && checkOutDate && checkOutDate.getTime() > checkInDate.getTime()) {
    try {
      const p = await computeRoomTotalPrice({ roomId: room.id, checkIn: checkInDate, checkOut: checkOutDate });
      totalToCharge = Number(p.totalPrice);
    } catch {
      /* keep estimate */
    }
  }

  const bookErr = (searchParams.bookErr ?? "").trim();
  const errPath = BOOK_ERR_KEYS[bookErr];

  const origin = getPublicOriginFromHeaders();
  const bookingQs = new URLSearchParams({ roomId: String(room.id) });
  if (searchParams.checkIn) bookingQs.set("checkIn", searchParams.checkIn);
  if (searchParams.checkOut) bookingQs.set("checkOut", searchParams.checkOut);
  const dcReturnUrl = `${origin}/booking?${bookingQs.toString()}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12 pt-4 sm:pt-5">
      <h1 className="font-serif text-3xl font-normal tracking-tight text-white sm:text-[2rem]">
        <span className="bg-gradient-to-r from-white via-emerald-50/95 to-emerald-100/80 bg-clip-text text-transparent">
          {m(locale, "search.bookNow")}
        </span>
      </h1>

      {errPath && (
        <div
          className="rounded-xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm text-brand-200"
          role="alert"
        >
          <span className="font-semibold">{m(locale, "checkout.errBanner")}: </span>
          {m(locale, errPath)}
        </div>
      )}

      <div
        className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.1)] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:p-5"
        style={{
          background: "linear-gradient(145deg, rgba(15,23,42,0.92) 0%, rgba(6,12,24,0.96) 48%, rgba(6,78,59,0.14) 100%)"
        }}
      >
        <div className="pointer-events-none absolute -right-12 top-0 h-32 w-32 rounded-full bg-emerald-500/12 blur-3xl" />
        <div className="relative flex gap-3 sm:gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-emerald-200/95 sm:h-12 sm:w-12"
            aria-hidden
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/65">
              {m(locale, "checkout.financeTitle")}
            </div>
            <div className="text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl">{room.hotel.name}</div>
            <div className="text-sm font-medium text-slate-300/95">{room.title}</div>
            <div className="pt-1 text-sm text-emerald-100/85">
              {m(locale, "owner.priceNight")}: <span className="tabular-nums font-semibold text-white">{Number(room.price)} TJS</span>
            </div>
          </div>
        </div>
      </div>

      {/* On mobile this block confused users (shows "step 3" while the wizard is on step 1). */}
      <div className="hidden sm:block">
        <CheckoutSteps
          steps={[m(locale, "checkout.stepCard1"), m(locale, "checkout.stepCard2"), m(locale, "checkout.stepCard3")]}
        />
      </div>

      <BookingWizard
        labels={{
          titleStep1: m(locale, "checkout.step1"),
          titleStep2: m(locale, "checkout.step2"),
          titleStep3: m(locale, "checkout.step3"),
          next: m(locale, "checkout.next"),
          back: m(locale, "checkout.back"),
          confirm: m(locale, "admin.confirmBooking"),
          guestNamePh: m(locale, "checkout.guestNamePh"),
          guestEmailPh: m(locale, "checkout.guestEmailPh"),
          phonePh: m(locale, "checkout.phonePh"),
          payAlif: m(locale, "checkout.payAlif"),
          payDc: m(locale, "checkout.payDc"),
          subtotal: m(locale, "checkout.subtotal"),
          serviceFee: m(locale, "checkout.serviceFee"),
          tax: m(locale, "checkout.tax"),
          total: m(locale, "checkout.total"),
          escrowTitle: m(locale, "checkout.escrowTitle"),
          escrowBody: m(locale, "checkout.escrowBody"),
          paymentMethodLabel: m(locale, "checkout.paymentMethodLabel"),
          guestNoAccountHint: m(locale, "checkout.guestNoAccountHint"),
          signedInAccountTitle: m(locale, "checkout.signedInAccountTitle"),
          addPhoneBookingHint: m(locale, "checkout.addPhoneBookingHint")
        }}
        defaults={{
          roomId: room.id,
          checkIn: searchParams.checkIn,
          checkOut: searchParams.checkOut,
          phone: phoneForGuestBookingForm(user?.phone),
          isAuthed: Boolean(user),
          signedInAsName: user?.name?.trim() ?? "",
          signedInAsEmail: user?.email?.trim() ?? "",
          needsSavedPhone: needsSavedPhone
        }}
        pricePerNight={Number(room.price)}
        finance={{
          subtotal: totalToCharge,
          serviceFee: 0,
          taxAmount: 0,
          totalToCharge
        }}
        dcReturnUrl={dcReturnUrl}
      />
    </div>
  );
}
