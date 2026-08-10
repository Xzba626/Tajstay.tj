"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input } from "@/shared/ui";
import { DcNextPaymentCard } from "@/components/payment/DcNextPaymentCard";
import { DateAvailabilityCalendar } from "@/components/booking/DateAvailabilityCalendar";

type Props = {
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
    bookingTermsNotice: string;
    termsLinkLabel: string;
  };
  defaults: {
    roomId?: number;
    roomTypeId?: number;
    checkIn?: string;
    checkOut?: string;
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
  /** Для deep link DC Next (возврат в мастер брони). */
  dcReturnUrl: string;
};

type Step = 1 | 2 | 3;

/** Сообщения API /api/bookings (json=1) — не показываем сырые коды вроде «invalid». */
function mapBookingApiError(raw: string): string {
  const key = (raw || "").trim().toLowerCase();
  const table: Record<string, string> = {
    invalid:
      "Проверьте телефон (например +992…), даты заезда и выезда. Локальный номер без кода страны тоже подойдёт.",
    dates: "Дата выезда должна быть позже даты заезда.",
    phone_in_use: "Этот телефон уже в системе — войдите в аккаунт или укажите другой номер.",
    unavailable: "Номер недоступен на выбранные даты. Выберите другие дни.",
    rate: "Слишком много попыток. Подождите минуту и попробуйте снова.",
    failed: "Не удалось создать бронь. Попробуйте ещё раз.",
    timeout: "Сервер не ответил вовремя. Проверьте интернет и попробуйте снова."
  };
  if (table[key]) return table[key];
  if (key.includes("invalid")) return table.invalid;
  if (/^[a-z][a-z0-9_]*$/.test(key)) return "Не удалось оформить бронь. Проверьте данные и попробуйте снова.";
  return (raw || "").trim() || "Не удалось оформить бронь";
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

export function BookingWizard({ labels, defaults, pricePerNight, finance, dcReturnUrl }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitInFlight = useRef(false);
  const [step, setStep] = useState<Step>(1);
  const [paymentMethod] = useState<"DC">("DC");
  const [checkIn, setCheckIn] = useState(defaults.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(defaults.checkOut ?? "");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [phone, setPhone] = useState(defaults.phone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [availabilityChecking, setAvailabilityChecking] = useState(false);
  const [datesAvailable, setDatesAvailable] = useState<boolean | null>(null);
  const [conflictingDates, setConflictingDates] = useState<string[]>([]);
  const [bookedDisabledDates, setBookedDisabledDates] = useState<string[]>([]);
  const availabilityRequestId = useRef(0);

  const disabledDatesSet = useMemo(() => new Set(bookedDisabledDates), [bookedDisabledDates]);

  const checkAvailability = useCallback(
    async (inDate: string, outDate: string): Promise<boolean> => {
      if (!inDate || !outDate || !defaults.roomId && !defaults.roomTypeId) {
        setDatesAvailable(null);
        setConflictingDates([]);
        return true;
      }
      const nightsCount = calcNights(inDate, outDate);
      if (!nightsCount) {
        setDatesAvailable(null);
        setConflictingDates([]);
        return false;
      }

      const reqId = ++availabilityRequestId.current;
      setAvailabilityChecking(true);
      try {
        const res = await fetch("/api/bookings/check-availability", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            room_id: defaults.roomId ?? undefined,
            room_type_id: defaults.roomTypeId ?? undefined,
            check_in: inDate,
            check_out: outDate
          })
        });
        const json = (await res.json().catch(() => ({}))) as {
          available?: boolean;
          conflicting_dates?: string[];
        };
        if (reqId !== availabilityRequestId.current) return json.available !== false;

        const available = res.ok && json.available !== false;
        setDatesAvailable(available);
        setConflictingDates(Array.isArray(json.conflicting_dates) ? json.conflicting_dates : []);
        return available;
      } catch {
        if (reqId === availabilityRequestId.current) {
          setDatesAvailable(null);
          setConflictingDates([]);
        }
        return true;
      } finally {
        if (reqId === availabilityRequestId.current) setAvailabilityChecking(false);
      }
    },
    [defaults.roomId, defaults.roomTypeId]
  );

  useEffect(() => {
    if (!defaults.roomId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/rooms/${defaults.roomId}/booked-dates`, {
          headers: { accept: "application/json" }
        });
        const json = (await res.json().catch(() => ({}))) as { disabledDates?: string[] };
        if (!cancelled && Array.isArray(json.disabledDates)) {
          setBookedDisabledDates(json.disabledDates);
        }
      } catch {
        /* keep empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [defaults.roomId]);

  useEffect(() => {
    if (!checkIn || !checkOut) {
      setDatesAvailable(null);
      setConflictingDates([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void checkAvailability(checkIn, checkOut);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [checkIn, checkOut, checkAvailability]);

  const handleDateChange = useCallback(
    (field: "checkIn" | "checkOut", value: string) => {
      if (field === "checkIn") setCheckIn(value);
      else setCheckOut(value);

      const nextIn = field === "checkIn" ? value : checkIn;
      const nextOut = field === "checkOut" ? value : checkOut;
      if (nextIn && nextOut && calcNights(nextIn, nextOut)) {
        void checkAvailability(nextIn, nextOut);
      } else {
        setDatesAvailable(null);
        setConflictingDates([]);
      }
    },
    [checkIn, checkOut, checkAvailability]
  );

  const runBookingSubmit = useCallback(async () => {
    if (submitInFlight.current) return;
    const formEl = formRef.current;
    if (!formEl) return;

    const available = await checkAvailability(checkIn, checkOut);
    if (!available) return;

    submitInFlight.current = true;
    setSubmitting(true);
    setSubmitError(null);
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
        if (res.status === 409 || errRaw === "unavailable") {
          setDatesAvailable(false);
          throw new Error(mapBookingApiError("unavailable"));
        }
        throw new Error(mapBookingApiError(errRaw));
      }

      const chatUrl = (json as { chatUrl?: string }).chatUrl?.trim();
      const dest = chatUrl || `/chat/booking/${json.bookingId}`;
      window.location.assign(dest);
    } catch (err: unknown) {
      const aborted =
        (err instanceof Error && err.name === "AbortError") ||
        (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError");
      if (aborted) {
        setSubmitError(mapBookingApiError("timeout"));
      } else {
        setSubmitError(err instanceof Error ? err.message : "Ошибка бронирования");
      }
    } finally {
      window.clearTimeout(timer);
      submitInFlight.current = false;
      setSubmitting(false);
    }
  }, [checkIn, checkOut, checkAvailability]);

  const stepTitle = useMemo(() => {
    if (step === 1) return labels.titleStep1;
    if (step === 2) return labels.titleStep2;
    return labels.titleStep3;
  }, [labels, step]);

  const payMethodLabel = labels.payDc;
  const nights = calcNights(checkIn, checkOut);
  const datesConflict = datesAvailable === false;
  const canProceedFromStep1 = Boolean(nights) && !datesConflict && !availabilityChecking;
  const totalByDates = nights ? Number((pricePerNight * nights).toFixed(2)) : null;
  const mobileField =
    "h-14 w-full rounded-2xl border border-[var(--taj-line)] bg-[var(--taj-snow)] px-4 text-sm text-[var(--taj-ink)] shadow-[var(--taj-shadow-sm)] outline-none transition placeholder:text-[var(--taj-color-text-muted)] focus:border-[var(--taj-lake)] focus:ring-2 focus:ring-[var(--taj-lake)]/25";
  const labelRow = "flex items-center gap-2 text-xs font-semibold text-[var(--taj-ink-soft)]";
  const labelIcon = "text-sm text-[var(--taj-lake)]";

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
      <input type="hidden" name="paymentMethod" value={paymentMethod} />
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

      <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.07] pb-2.5">
        <div className="text-[13px] font-medium tracking-wide text-[var(--taj-ink-soft)]/95">{stepTitle}</div>
        <div className="tabular-nums text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--taj-ink-soft)]">
          {step}/3
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl">
        <div className="wizard-rail">
          <div className="wizard-progress" style={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }} />
        </div>

        <div className="wizard-surface">
          <Card className="space-y-4">
            {step === 1 && (
              <div className="wizard-step wizard-in">
                {defaults.isAuthed && (defaults.signedInAsName || defaults.signedInAsEmail) ? (
                  <div className="mb-4 rounded-2xl border border-[var(--taj-lake)]/25 bg-[var(--taj-lake-soft)] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--taj-lake)]">
                      {labels.signedInAccountTitle}
                    </div>
                    {defaults.signedInAsName ? (
                      <div className="mt-2 text-base font-semibold leading-snug text-white">{defaults.signedInAsName}</div>
                    ) : null}
                    {defaults.signedInAsEmail ? (
                      <div className="mt-1 text-sm text-[var(--taj-ink-soft)]">{defaults.signedInAsEmail}</div>
                    ) : null}
                    {defaults.needsSavedPhone && labels.addPhoneBookingHint ? (
                      <p className="mt-3 text-xs leading-relaxed text-[var(--taj-ink-soft)]/85">{labels.addPhoneBookingHint}</p>
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
                        Имя гостя
                      </span>
                      <Input
                        required
                        name="guestName"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder={labels.guestNamePh}
                        className={mobileField}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className={labelRow}>
                        <span className={labelIcon} aria-hidden>
                          ✉️
                        </span>
                        Email (необязательно)
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
                  <label className="grid gap-1">
                    <span className={labelRow}>
                      <span className={labelIcon} aria-hidden>
                        📅
                      </span>
                      Заезд
                    </span>
                    <Input
                      required
                      name="checkIn"
                      type="date"
                      value={checkIn}
                      onChange={(e) => handleDateChange("checkIn", e.target.value)}
                      className={`${mobileField} cursor-pointer ${datesConflict ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/30" : ""}`}
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className={labelRow}>
                      <span className={labelIcon} aria-hidden>
                        📅
                      </span>
                      Выезд
                    </span>
                    <Input
                      required
                      name="checkOut"
                      type="date"
                      value={checkOut}
                      onChange={(e) => handleDateChange("checkOut", e.target.value)}
                      className={`${mobileField} cursor-pointer ${datesConflict ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/30" : ""}`}
                    />
                  </label>
                </div>

                {defaults.roomId ? (
                  <DateAvailabilityCalendar
                    disabledDates={disabledDatesSet}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    onSelectDate={(iso) => {
                      if (!checkIn || (checkIn && checkOut)) {
                        handleDateChange("checkIn", iso);
                        setCheckOut("");
                        return;
                      }
                      if (iso <= checkIn) {
                        handleDateChange("checkIn", iso);
                        return;
                      }
                      handleDateChange("checkOut", iso);
                    }}
                  />
                ) : null}

                {availabilityChecking ? (
                  <div className="flex items-center gap-2 text-xs text-slate-300" role="status" aria-live="polite">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--taj-lake)]/30 border-t-[var(--taj-lake)]" />
                    Проверяем доступность дат…
                  </div>
                ) : null}

                {datesConflict ? (
                  <div
                    className="rounded-lg border border-red-500 bg-red-100 px-4 py-3"
                    style={{ background: "#FEE2E2", borderColor: "#EF4444" }}
                    role="alert"
                  >
                    <p className="font-semibold text-red-600" style={{ color: "#DC2626" }}>
                      ⚠️ Эти даты уже заняты
                    </p>
                    <p className="mt-1 text-sm" style={{ color: "#7F1D1D" }}>
                      Номер недоступен с {checkIn} по {checkOut}. Пожалуйста, выберите другие даты.
                      {conflictingDates.length > 0 ? (
                        <span className="mt-1 block text-xs opacity-90">
                          Занятые ночи: {conflictingDates.slice(0, 8).join(", ")}
                          {conflictingDates.length > 8 ? "…" : ""}
                        </span>
                      ) : null}
                    </p>
                  </div>
                ) : null}

                <label className="grid gap-1">
                  <span className={labelRow}>
                    <span className={labelIcon} aria-hidden>
                      📞
                    </span>
                    Телефон
                  </span>
                  <Input
                    required
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={labels.phonePh}
                    className={mobileField}
                    inputMode="tel"
                  />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="wizard-step wizard-in">
                <div className="rounded-2xl border border-[var(--taj-lake)]/25 bg-[var(--taj-lake-soft)] p-4 text-sm text-[var(--taj-ink)]">
                  <div className="font-semibold">Способ оплаты</div>
                  <div className="mt-1 text-[var(--taj-ink-soft)]">Душанбе City (DC Next)</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>Ночей</span>
                    <span>{nights ?? "—"}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-slate-300">
                    <span>Цена за ночь</span>
                    <span>{pricePerNight} TJS</span>
                  </div>
                  <div className="mt-3 flex justify-between font-semibold text-[var(--taj-ink)]">
                    <span>К оплате</span>
                    <span>{totalByDates ?? finance.totalToCharge} TJS</span>
                  </div>
                </div>

                <div className="mt-4">
                  <DcNextPaymentCard
                    variant="embedded"
                    returnUrl={dcReturnUrl}
                    amountTjs={totalByDates ?? finance.totalToCharge}
                    account="901317727"
                    footerHint="После подтверждения брони откроется страница оплаты — там прикрепите чек перевода."
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="wizard-step wizard-in space-y-4">
                <div
                  className="relative overflow-hidden rounded-2xl border border-[var(--taj-lake)]/25 px-4 py-4 text-sm text-[var(--taj-ink)] shadow-[0_0_0_1px_rgba(22,90,99,0.12),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(16,185,129,0.06) 45%, rgba(6,78,59,0.12) 100%)"
                  }}
                >
                  <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[var(--taj-lake)]/15 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-[var(--taj-lake-soft)] blur-2xl" />
                  <div className="relative flex gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--taj-lake)]/30 bg-[var(--taj-lake-soft)] text-[var(--taj-ink-soft)]">
                      <ShieldCheckIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className="font-semibold tracking-tight text-[var(--taj-ink)]">{labels.escrowTitle}</div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--taj-ink-soft)]">{labels.escrowBody}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-[var(--taj-ink-soft)] backdrop-blur-sm">
                  {labels.paymentMethodLabel}: <span className="font-semibold text-white">{payMethodLabel}</span>
                </div>
              </div>
            )}

            {step === 3 ? (
              <p className="text-xs leading-relaxed text-slate-400">
                {labels.bookingTermsNotice}{" "}
                <Link href="/terms" className="text-[var(--taj-lake)] underline underline-offset-2 hover:text-[var(--taj-ink-soft)]">
                  {labels.termsLinkLabel}
                </Link>
                .
              </p>
            ) : null}

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pb-10 pt-5">
              <Button
                type="button"
                variant="secondary"
                className="border-white/20 bg-transparent text-[var(--taj-ink-soft)] shadow-none hover:border-white/30 hover:bg-white/[0.04]"
                disabled={step === 1}
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
              >
                {labels.back}
              </Button>

              {step < 3 ? (
                <Button
                  type="button"
                  disabled={(step === 1 && !canProceedFromStep1) || availabilityChecking}
                  className={
                    step === 1 && (!canProceedFromStep1 || availabilityChecking)
                      ? "cursor-not-allowed bg-slate-600 text-slate-300 opacity-70 hover:bg-slate-600"
                      : undefined
                  }
                  onClick={() => {
                    if (step === 1) {
                      void checkAvailability(checkIn, checkOut).then((ok) => {
                        if (ok) setStep(2);
                      });
                      return;
                    }
                    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
                  }}
                >
                  {labels.next}
                </Button>
              ) : (
                <Button
                  type="button"
                  loading={submitting}
                  disabled={submitting}
                  onClick={() => void runBookingSubmit()}
                  className="border-[var(--taj-lake)]/40 bg-gradient-to-b from-[var(--taj-lake)] to-[var(--taj-lake-deep)] text-white shadow-[var(--taj-btn-primary-shadow)] hover:shadow-[var(--taj-btn-primary-shadow-hover)]"
                >
                  {labels.confirm}
                </Button>
              )}
            </div>

            {!defaults.isAuthed ? <p className="text-xs text-slate-400">{labels.guestNoAccountHint}</p> : null}
            {submitError ? <p className="text-xs text-red-200">{submitError}</p> : null}
          </Card>
        </div>
      </div>
    </form>
  );
}
