import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { CheckoutSteps } from "@/processes/checkout/CheckoutSteps";
import { computeRoomTotalPrice, computeRoomTypeTotalPrice } from "@/lib/services/bookingPricing";
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
  searchParams: { roomId?: string; roomTypeId?: string; checkIn?: string; checkOut?: string; bookErr?: string };
}) {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  const needsSavedPhone = Boolean(user && isPlaceholderAccountPhone(user.phone));

  const roomId = Number(searchParams.roomId);
  const roomTypeId = Number(searchParams.roomTypeId);
  if (!roomId && !roomTypeId) notFound();

  const room = roomId
    ? await prisma.room.findUnique({ where: { id: roomId }, include: { hotel: true } })
    : null;
  const roomType = roomTypeId
    ? await prisma.roomType.findUnique({ where: { id: roomTypeId }, include: { hotel: true } })
    : null;

  if (!room && !roomType) notFound();

  const hotelName = room?.hotel.name ?? roomType!.hotel.name;
  const title = room?.title ?? roomType!.name;
  const pricePerNight = Number(room?.price ?? roomType!.basePrice);

  const checkInDate = searchParams.checkIn ? new Date(searchParams.checkIn) : null;
  const checkOutDate = searchParams.checkOut ? new Date(searchParams.checkOut) : null;
  const msPerDay = 24 * 60 * 60 * 1000;
  const nights =
    checkInDate && checkOutDate && checkOutDate.getTime() > checkInDate.getTime()
      ? Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / msPerDay))
      : 1;

  let totalToCharge = pricePerNight * nights;
  if (checkInDate && checkOutDate && checkOutDate.getTime() > checkInDate.getTime()) {
    try {
      const p = room
        ? await computeRoomTotalPrice({ roomId: room.id, checkIn: checkInDate, checkOut: checkOutDate })
        : await computeRoomTypeTotalPrice({ roomTypeId: roomType!.id, checkIn: checkInDate, checkOut: checkOutDate });
      totalToCharge = Number(p.totalPrice);
    } catch {
      /* keep estimate */
    }
  }

  const bookErr = (searchParams.bookErr ?? "").trim();
  const errPath = BOOK_ERR_KEYS[bookErr];

  const origin = getPublicOriginFromHeaders();
  const bookingQs = new URLSearchParams();
  if (room) bookingQs.set("roomId", String(room.id));
  if (roomType) bookingQs.set("roomTypeId", String(roomType.id));
  if (searchParams.checkIn) bookingQs.set("checkIn", searchParams.checkIn);
  if (searchParams.checkOut) bookingQs.set("checkOut", searchParams.checkOut);
  const dcReturnUrl = `${origin}/booking?${bookingQs.toString()}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12 pt-4 sm:pt-5">
      <h1 className="font-serif text-3xl font-normal tracking-tight text-[var(--taj-ink)] sm:text-[2rem]">
        <span className="bg-gradient-to-r from-[var(--taj-ink)] via-[var(--taj-lake)] to-[var(--taj-lake-deep)] bg-clip-text text-transparent">
          {m(locale, "search.bookNow")}
        </span>
      </h1>

      {errPath && (
        <div
          className="rounded-xl border border-brand-700 bg-[var(--taj-snow)] px-4 py-3 text-sm text-[var(--taj-ink-soft)]"
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
        <div className="relative flex gap-3 sm:gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="text-lg font-semibold text-[var(--taj-ink)] sm:text-xl">{hotelName}</div>
            <div className="text-sm font-medium text-slate-300/95">{title}</div>
            <div className="pt-1 text-sm text-[var(--taj-lake)]">
              {m(locale, "owner.priceNight")}:{" "}
              <span className="tabular-nums font-semibold text-[var(--taj-ink)]">{pricePerNight} TJS</span>
            </div>
          </div>
        </div>
      </div>

      <CheckoutSteps
        steps={[m(locale, "checkout.stepCard1"), m(locale, "checkout.stepCard2"), m(locale, "checkout.stepCard3")]}
        activeStep={0}
      />

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
          addPhoneBookingHint: m(locale, "checkout.addPhoneBookingHint"),
          bookingTermsNotice: m(locale, "checkout.bookingTermsNotice"),
          termsLinkLabel: m(locale, "footer.terms")
        }}
        defaults={{
          roomId: room?.id,
          roomTypeId: roomType?.id,
          checkIn: searchParams.checkIn,
          checkOut: searchParams.checkOut,
          phone: phoneForGuestBookingForm(user?.phone),
          isAuthed: Boolean(user),
          signedInAsName: user?.name?.trim() ?? "",
          signedInAsEmail: user?.email?.trim() ?? "",
          needsSavedPhone: needsSavedPhone
        }}
        pricePerNight={pricePerNight}
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
