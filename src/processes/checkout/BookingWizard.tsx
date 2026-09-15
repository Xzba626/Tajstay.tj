"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button, Card, Input } from "@/shared/ui";
import { LocaleDateInput } from "@/components/ui/LocaleDateInput";
import { CheckoutSteps } from "@/processes/checkout/CheckoutSteps";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

/** A hotel's own active payment method (see `getHotelPaymentMethods`) - the ONLY source of
 * payment requisites shown here. Never a hardcoded fallback account. */
export type WizardPaymentMethod = {
  id: number;
  displayLabel: string;
  recipientName: string;
  paymentIdentifier: string;
  instructions: string | null;
};

type Props = {
  locale: Locale;
  labels: {
    titleStep1: string;
    titleStep2: string;
    titleStep3: string;
    next: string;
    back: string;
    confirm: string;
    payAlif: string;
    payDc: string;
    guestNamePh: string;
    guestEmailPh: string;
    phonePh: string;
    checkIn: string;
    checkOut: string;
    subtotal: string;
    serviceFee: string;
    tax: string;
    total: string;
    escrowTitle: string;
    escrowBody: string;
    paymentMethodLabel: string;
    guestNoAccountHint: string;
    signedInAccountTitle: string;
    addPhoneBookingHint: string;
    payNowOption: string;
    payAtCheckInOption: string;
    payAtCheckInExplain: string;
    stepCard1: string;
    stepCard2: string;
    stepCard3: string;
    nights: string;
    pricePerNightLabel: string;
    totalCharge: string;
    backToRooms: string;
  };
  /** Localized copy for every `/api/bookings` error code, keyed exactly like the code itself, plus
   * a `generic` fallback - resolved server-side (page.tsx) so this component never hardcodes RU. */
  errorMessages: Record<string, string>;
  defaults: {
    roomId?: number;
    roomTypeId?: number;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
    phone?: string;
    isAuthed: boolean;
    signedInAsName?: string;
    signedInAsEmail?: string;
    /** true если в профиле ещё служебный google_* — показываем подсказку про сохранение телефона */
    needsSavedPhone?: boolean;
  };
  pricePerNight: number;
  finance: {
    subtotal: number;
    serviceFee: number;
    taxAmount: number;
    totalToCharge: number;
  };
  /** Для recovery CTA при availability conflict - тот же Hotel, с сохранённым контекстом поиска. */
  hotelId?: number;
  /** Active `HotelPaymentMethod` rows for this hotel - the only source of payment requisites.
   * Empty means the hotel hasn't configured one yet; booking submission must be blocked, never
   * fall back to a hardcoded method. */
  paymentMethods: WizardPaymentMethod[];
  /** BLOCK 5.4B - server-resolved `Hotel.acceptsPayAtCheckIn`. The client flag is never authority
   * (the backend re-derives and re-checks it from the authoritative Room/RoomType->Hotel chain on
   * submit) - this only controls whether the option is even offered in this UI. */
  acceptsPayAtCheckIn: boolean;
};

type Step = 1 | 2 | 3;

/** Сообщения API /api/bookings (json=1) — не показываем сырые коды вроде «invalid». Every string
 * comes from `errorMessages` (resolved server-side via m(locale, ...)) - this function only maps
 * the error code to the right key, it never hardcodes copy in any language. */
function mapBookingApiError(raw: string, errorMessages: Record<string, string>): string {
  const key = (raw || "").trim().toLowerCase();
  if (errorMessages[key]) return errorMessages[key];
  if (key.includes("invalid")) return errorMessages.invalid ?? errorMessages.generic;
  return errorMessages.generic ?? (raw || "").trim();
}

function calcNights(checkIn: string, checkOut: string): number | null {
  if (!checkIn || !checkOut) return null;
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime())) return null;
  const diff = outDate.getTime() - inDate.getTime();
  if (diff <= 0) return null;
  return Math.max(1, Math.round(diff / (24 * 60 * 60 * 1000)));
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3 5 6v5c0 5.55 3.84 10.74 7 12 3.16-1.26 7-6.45 7-12V6l-7-3Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function BookingWizard({
  locale,
  labels,
  defaults,
  pricePerNight,
  finance,
  hotelId,
  paymentMethods,
  acceptsPayAtCheckIn,
  errorMessages
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitInFlight = useRef(false);
  const [step, setStep] = useState<Step>(1);
  // Only offered when the hotel opted in AND has never used to make the wizard show a picker with
  // nothing to pick - if there are also zero active payment methods, PAY_AT_CHECK_IN is still the
  // only usable option (BLOCK 5.4B §12), so default to it in that specific case.
  const [paymentOption, setPaymentOption] = useState<"PAY_NOW" | "PAY_AT_CHECK_IN">(
    acceptsPayAtCheckIn && paymentMethods.length === 0 ? "PAY_AT_CHECK_IN" : "PAY_NOW"
  );
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(
    paymentMethods.length === 1 ? paymentMethods[0].id : null
  );
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [checkIn, setCheckIn] = useState(defaults.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(defaults.checkOut ?? "");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [phone, setPhone] = useState(defaults.phone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorCode, setSubmitErrorCode] = useState<string | null>(null);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  const runBookingSubmit = useCallback(async () => {
    if (submitInFlight.current) return;
    const formEl = formRef.current;
    if (!formEl) return;

    submitInFlight.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitErrorCode(null);
    const fd = new FormData(formEl);
    const controller = new AbortController();
    const timeoutMs = 55_000;
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch("/api/bookings?json=1", {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: { "x-json": "1", accept: "application/json" },
        signal: controller.signal
      });
      const json = (await res.json().catch(() => ({}))) as
        | { ok: true; bookingId: number; publicCode?: string }
        | { error?: string };
      if (!res.ok || !("ok" in json)) {
        const errRaw = String((json as { error?: string })?.error ?? "").trim();
        setSubmitErrorCode(errRaw);
        // A stale/deactivated method (owner edited it while this wizard was open, see BLOCK 5.2
        // §9) must send the guest back to reselect, not just show an error on step 3 with no way
        // to act on it - the rest of the form (dates/phone/etc.) stays exactly as entered.
        if (errRaw === "payment_method_invalid" || errRaw === "payment_method_required") {
          setSelectedMethodId(null);
          setStep(2);
        }
        // BLOCK 5.4B: hotel policy changed between page load and submit, or another tab already
        // has a live booking for these exact dates under the other payment option - either way
        // send the guest back to reselect rather than leaving them stuck on step 3.
        if (errRaw === "pay_at_checkin_not_allowed") {
          setPaymentOption("PAY_NOW");
          setSelectedMethodId(null);
          setStep(2);
        }
        if (errRaw === "existing_booking_different_payment_option") {
          setStep(2);
        }
        throw new Error(mapBookingApiError(errRaw, errorMessages));
      }

      const chatUrl = (json as { chatUrl?: string }).chatUrl?.trim();
      const dest = chatUrl || `/chat/booking/${json.bookingId}`;
      window.location.assign(dest);
    } catch (err: unknown) {
      const aborted =
        (err instanceof Error && err.name === "AbortError") ||
        (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError");
      if (aborted) {
        setSubmitError(mapBookingApiError("timeout", errorMessages));
      } else {
        setSubmitError(err instanceof Error ? err.message : errorMessages.generic);
      }
    } finally {
      window.clearTimeout(timer);
      submitInFlight.current = false;
      setSubmitting(false);
    }
  }, [errorMessages]);

  const stepTitle = useMemo(() => {
    if (step === 1) return labels.titleStep1;
    if (step === 2) return labels.titleStep2;
    return labels.titleStep3;
  }, [labels, step]);

  const selectedMethod = paymentMethods.find((method) => method.id === selectedMethodId) ?? null;
  const isPayAtCheckIn = paymentOption === "PAY_AT_CHECK_IN";
  const payMethodLabel = isPayAtCheckIn ? labels.payAtCheckInOption : selectedMethod?.displayLabel ?? "";
  const canSubmitPayment = isPayAtCheckIn ? true : paymentMethods.length > 0 && selectedMethodId !== null;
  const nights = calcNights(checkIn, checkOut);
  // BLOCK V1 closure: the form has `noValidate` (native browser required-field UI is suppressed
  // deliberately, since it can't be styled consistently), but nothing replaced it - an
  // unauthenticated guest could previously reach step 3 with an empty name/phone and only learn
  // about it from the server's rejection after final submit. Client-side check added so this
  // surfaces immediately, in the same place, in the wizard's own language.
  const step1Valid =
    Boolean(nights) && phone.trim().length > 0 && (defaults.isAuthed || guestName.trim().length > 0);

  useEffect(() => {
    if (step1Valid) setStep1Error(null);
  }, [step1Valid]);
  const totalByDates = nights ? Number((pricePerNight * nights).toFixed(2)) : null;
  const mobileField =
    "h-12 w-full rounded-xl border border-[var(--taj-color-border)] bg-[var(--taj-color-bg-card-solid)] px-4 text-sm text-[var(--taj-color-text)] outline-none transition placeholder:text-[var(--taj-color-text-muted)] focus:border-[#0f7a4d] focus:ring-2 focus:ring-[#0f7a4d]/25";
  const labelRow = "flex items-center gap-2 text-xs font-semibold text-[var(--taj-color-text-secondary)]";
  const labelIcon = "text-sm text-[#0f7a4d]";

  const persistFields = step >= 2;

  return (
    <form
      ref={formRef}
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (step !== 3) return;
        void runBookingSubmit();
      }}
    >
      {defaults.roomId ? <input type="hidden" name="roomId" value={defaults.roomId} /> : null}
      {defaults.roomTypeId ? <input type="hidden" name="roomTypeId" value={defaults.roomTypeId} /> : null}
      {defaults.guests ? <input type="hidden" name="guestCount" value={defaults.guests} /> : null}
      <input type="hidden" name="paymentOption" value={paymentOption} />
      {!isPayAtCheckIn && selectedMethodId ? <input type="hidden" name="hotelPaymentMethodId" value={selectedMethodId} /> : null}
      {persistFields ? (
        <>
          <input type="hidden" name="checkIn" value={checkIn} />
          <input type="hidden" name="checkOut" value={checkOut} />
          <input type="hidden" name="phone" value={phone} />
          {!defaults.isAuthed ? (
            <>
              <input type="hidden" name="guestName" value={guestName} />
              <input type="hidden" name="guestEmail" value={guestEmail} />
            </>
          ) : null}
        </>
      ) : null}

      <CheckoutSteps steps={[labels.stepCard1, labels.stepCard2, labels.stepCard3]} activeStep={step - 1} />

      <div className="flex items-baseline justify-between gap-3 border-b border-[var(--taj-color-border)] pb-2.5">
        <div className="text-[13px] font-medium tracking-wide text-[var(--taj-color-text)]">{stepTitle}</div>
        <div className="tabular-nums text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--taj-color-text-muted)]">
          {step}/3
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl">
        <div className="wizard-surface">
          <Card className="space-y-4">
            {step === 1 && (
              <div className="wizard-step wizard-in">
                {defaults.isAuthed && (defaults.signedInAsName || defaults.signedInAsEmail) ? (
                  <div className="mb-4 rounded-2xl border border-[#0f7a4d]/20 bg-[#0f7a4d]/[0.06] p-4 text-left">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0f7a4d]">
                      {labels.signedInAccountTitle}
                    </div>
                    {defaults.signedInAsName ? (
                      <div className="mt-2 text-base font-semibold leading-snug text-[var(--taj-color-text)]">{defaults.signedInAsName}</div>
                    ) : null}
                    {defaults.signedInAsEmail ? (
                      <div className="mt-1 text-sm text-[var(--taj-color-text-secondary)]">{defaults.signedInAsEmail}</div>
                    ) : null}
                    {defaults.needsSavedPhone && labels.addPhoneBookingHint ? (
                      <p className="mt-3 text-xs leading-relaxed text-[var(--taj-color-text-secondary)]">{labels.addPhoneBookingHint}</p>
                    ) : null}
                  </div>
                ) : null}
                {!defaults.isAuthed && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className={labelRow}>
                        <span className={labelIcon} aria-hidden>
                          👤
                        </span>
                        {labels.guestNamePh}
                      </span>
                      <Input
                        required
                        name="guestName"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder={labels.guestNamePh}
                        className={mobileField}
                        aria-invalid={step1Error ? guestName.trim().length === 0 : undefined}
                        aria-describedby={step1Error ? "step1-error" : undefined}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className={labelRow}>
                        <span className={labelIcon} aria-hidden>
                          ✉️
                        </span>
                        {labels.guestEmailPh}
                      </span>
                      <Input
                        name="guestEmail"
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder={labels.guestEmailPh}
                        className={mobileField}
                      />
                    </label>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <LocaleDateInput
                    locale={locale}
                    name="checkIn"
                    value={checkIn}
                    onChange={setCheckIn}
                    required
                    className={`${mobileField} cursor-pointer`}
                    label={
                      <span className={labelRow}>
                        <span className={labelIcon} aria-hidden>
                          📅
                        </span>
                        {labels.checkIn}
                      </span>
                    }
                  />
                  <LocaleDateInput
                    locale={locale}
                    name="checkOut"
                    value={checkOut}
                    onChange={setCheckOut}
                    required
                    min={checkIn || undefined}
                    className={`${mobileField} cursor-pointer`}
                    label={
                      <span className={labelRow}>
                        <span className={labelIcon} aria-hidden>
                          📅
                        </span>
                        {labels.checkOut}
                      </span>
                    }
                  />
                </div>
                <label className="grid gap-1">
                  <span className={labelRow}>
                    <span className={labelIcon} aria-hidden>
                      📞
                    </span>
                    {labels.phonePh}
                  </span>
                  <Input
                    required
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={labels.phonePh}
                    className={mobileField}
                    inputMode="tel"
                    aria-invalid={step1Error ? phone.trim().length === 0 : undefined}
                    aria-describedby={step1Error ? "step1-error" : undefined}
                  />
                </label>
                {step1Error ? (
                  <p id="step1-error" role="alert" className="text-xs text-[#b91c1c]">
                    {step1Error}
                  </p>
                ) : null}
              </div>
            )}

            {step === 2 && (
              <div className="wizard-step wizard-in space-y-4">
                <div className="rounded-2xl border border-[var(--taj-color-border)] bg-[var(--taj-color-bg-card-solid)] p-4 text-sm">
                  <div className="flex justify-between text-[var(--taj-color-text-secondary)]">
                    <span>{labels.nights}</span>
                    <span>{nights ?? "—"}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-[var(--taj-color-text-secondary)]">
                    <span>{labels.pricePerNightLabel}</span>
                    <span>{pricePerNight} TJS</span>
                  </div>
                  <div className="mt-3 flex justify-between border-t border-[var(--taj-color-border)] pt-3 text-base font-semibold text-[var(--taj-color-text)]">
                    <span>{labels.totalCharge}</span>
                    <span>{totalByDates ?? finance.totalToCharge} TJS</span>
                  </div>
                </div>

                {acceptsPayAtCheckIn ? (
                  <div className="flex gap-2 rounded-2xl border border-[var(--taj-color-border)] bg-[var(--taj-color-bg-card-solid)] p-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentOption("PAY_NOW")}
                      aria-pressed={!isPayAtCheckIn}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        !isPayAtCheckIn ? "bg-[#0f7a4d] text-white" : "text-[var(--taj-color-text-secondary)] hover:bg-[var(--taj-color-border)]"
                      }`}
                    >
                      {labels.payNowOption}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentOption("PAY_AT_CHECK_IN")}
                      aria-pressed={isPayAtCheckIn}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        isPayAtCheckIn ? "bg-[#0f7a4d] text-white" : "text-[var(--taj-color-text-secondary)] hover:bg-[var(--taj-color-border)]"
                      }`}
                    >
                      {labels.payAtCheckInOption}
                    </button>
                  </div>
                ) : null}

                {isPayAtCheckIn ? (
                  <div className="rounded-2xl border border-[#0f7a4d]/20 bg-[#0f7a4d]/[0.06] p-4">
                    <div className="text-sm font-semibold text-[#0f7a4d]">{labels.payAtCheckInOption}</div>
                    <p className="mt-2 text-sm text-[var(--taj-color-text-secondary)]">{labels.payAtCheckInExplain}</p>
                  </div>
                ) : (
                <div className="rounded-2xl border border-[#0f7a4d]/20 bg-[#0f7a4d]/[0.06] p-4">
                  <div className="text-sm font-semibold text-[#0f7a4d]">{labels.paymentMethodLabel}</div>

                  {paymentMethods.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--taj-color-text-secondary)]">{m(locale, "checkout.paymentMethodsEmpty")}</p>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-[var(--taj-color-text-muted)]">{m(locale, "checkout.paymentMethodsHint")}</p>
                      <ul className="mt-3 space-y-3">
                        {paymentMethods.map((method) => {
                          const isSelected = selectedMethodId === method.id;
                          return (
                            <li
                              key={method.id}
                              className={`rounded-xl border p-3 ${isSelected ? "border-[#0f7a4d] bg-[#0f7a4d]/10" : "border-[var(--taj-color-border)] bg-[var(--taj-color-bg-card-solid)]"}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 text-sm font-semibold text-[var(--taj-color-text)]">{method.displayLabel}</div>
                                {isSelected ? (
                                  <span className="shrink-0 rounded-lg bg-[#0f7a4d] px-2.5 py-1 text-xs font-semibold text-white">
                                    {m(locale, "checkout.paymentMethodsSelected")}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMethodId(method.id)}
                                    className="shrink-0 rounded-lg border border-[#0f7a4d]/40 px-2.5 py-1 text-xs font-semibold text-[#0f7a4d]"
                                  >
                                    {m(locale, "checkout.paymentMethodsSelect")}
                                  </button>
                                )}
                              </div>
                              {isSelected ? (
                                <>
                                  <div className="mt-1 text-xs text-[var(--taj-color-text-muted)]">{method.recipientName}</div>
                                  <div className="mt-2 flex items-center justify-between gap-3">
                                    <span className="min-w-0 flex-1 break-all font-mono text-sm text-[var(--taj-color-text)]">
                                      {method.paymentIdentifier}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(method.paymentIdentifier);
                                          setCopiedId(method.id);
                                          window.setTimeout(() => setCopiedId(null), 2000);
                                        } catch {
                                          setCopiedId(null);
                                        }
                                      }}
                                      className="shrink-0 rounded-lg bg-[#0f7a4d] px-3 py-1.5 text-xs font-semibold text-white"
                                    >
                                      {copiedId === method.id
                                        ? m(locale, "checkout.paymentMethodsCopied")
                                        : m(locale, "checkout.paymentMethodsCopy")}
                                    </button>
                                  </div>
                                  {method.instructions ? (
                                    <div className="mt-2 text-xs text-[var(--taj-color-text-muted)]">{method.instructions}</div>
                                  ) : null}
                                </>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="wizard-step wizard-in space-y-4">
                {/* BLOCK V1: this card used to render unconditionally, claiming "escrow
                    protection... paid only after check-in" even for Pay-at-check-in bookings,
                    where TajStay never holds any money at all - a false backend-semantics claim.
                    Escrow copy now shows only for Pay Now; Pay-at-check-in reuses the same
                    accurate explainer text already used on step 2. */}
                {isPayAtCheckIn ? (
                  <div className="rounded-2xl border border-[#0f7a4d]/20 bg-[#0f7a4d]/[0.06] p-4">
                    <div className="flex gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#0f7a4d]/25 bg-[#0f7a4d]/10 text-[#0f7a4d]">
                        <ShieldCheckIcon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <div className="font-semibold tracking-tight text-[var(--taj-color-text)]">{labels.payAtCheckInOption}</div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--taj-color-text-secondary)]">{labels.payAtCheckInExplain}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#0f7a4d]/20 bg-[#0f7a4d]/[0.06] p-4">
                    <div className="flex gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#0f7a4d]/25 bg-[#0f7a4d]/10 text-[#0f7a4d]">
                        <ShieldCheckIcon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <div className="font-semibold tracking-tight text-[var(--taj-color-text)]">{labels.escrowTitle}</div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--taj-color-text-secondary)]">{labels.escrowBody}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="rounded-2xl border border-[var(--taj-color-border)] bg-[var(--taj-color-bg-card-solid)] p-4 text-sm text-[var(--taj-color-text-secondary)]">
                  {labels.paymentMethodLabel}: <span className="font-semibold text-[var(--taj-color-text)]">{payMethodLabel}</span>
                </div>
              </div>
            )}

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--taj-color-border)] pb-10 pt-5">
              <Button
                type="button"
                variant="secondary"
                className="border-[var(--taj-color-border)] bg-transparent text-[var(--taj-color-text-secondary)] shadow-none hover:border-[var(--taj-color-border-strong)] hover:bg-[var(--taj-color-bg-card-solid)]"
                disabled={step === 1}
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
              >
                {labels.back}
              </Button>

              {step < 3 ? (
                <Button
                  type="button"
                  disabled={step === 2 && !canSubmitPayment}
                  onClick={() => {
                    if (step === 1 && !step1Valid) {
                      setStep1Error(errorMessages.invalid ?? errorMessages.generic);
                      return;
                    }
                    setStep1Error(null);
                    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
                  }}
                >
                  {labels.next}
                </Button>
              ) : (
                <Button
                  type="button"
                  loading={submitting}
                  disabled={submitting || !canSubmitPayment}
                  onClick={() => void runBookingSubmit()}
                  className="border-[#0f7a4d]/40 bg-[#0f7a4d] text-white hover:brightness-105"
                >
                  {labels.confirm}
                </Button>
              )}
            </div>

            {!defaults.isAuthed ? <p className="text-xs text-[var(--taj-color-text-muted)]">{labels.guestNoAccountHint}</p> : null}
            {submitError ? (
              <div className="space-y-2">
                <p className="text-xs text-[#b91c1c]">{submitError}</p>
                {submitErrorCode === "unavailable" && hotelId ? (
                  <Link
                    href={`/hotel/${hotelId}?${new URLSearchParams({
                      ...(checkIn ? { checkIn } : {}),
                      ...(checkOut ? { checkOut } : {}),
                      ...(defaults.guests ? { guests: defaults.guests } : {})
                    }).toString()}`}
                    className="inline-flex text-xs font-semibold text-[#0f7a4d] underline"
                  >
                    {labels.backToRooms}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </form>
  );
}
