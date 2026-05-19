"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button, Card, Input } from "@/shared/ui";
import { DcNextPaymentCard } from "@/components/payment/DcNextPaymentCard";

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
  };
  defaults: {
    roomId: number;
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

  const runBookingSubmit = useCallback(async () => {
    if (submitInFlight.current) return;
    const formEl = formRef.current;
    if (!formEl) return;

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
  }, []);

  const stepTitle = useMemo(() => {
    if (step === 1) return labels.titleStep1;
    if (step === 2) return labels.titleStep2;
    return labels.titleStep3;
  }, [labels, step]);

  const payMethodLabel = labels.payDc;
  const nights = calcNights(checkIn, checkOut);
  const totalByDates = nights ? Number((pricePerNight * nights).toFixed(2)) : null;
  const mobileField =
    "h-14 w-full rounded-2xl border border-white/20 bg-white/12 px-4 text-sm text-slate-100 shadow-[0_10px_30px_rgba(2,6,23,0.30)] outline-none transition placeholder:text-slate-200/70 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/30";
  const labelRow = "flex items-center gap-2 text-xs font-semibold text-slate-200/90";
  const labelIcon = "text-sm text-emerald-200/90";

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
      <input type="hidden" name="roomId" value={defaults.roomId} />
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
        <div className="text-[13px] font-medium tracking-wide text-slate-200/95">{stepTitle}</div>
        <div className="tabular-nums text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-200/70">
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
                  <div className="mb-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.08] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200/85">
                      {labels.signedInAccountTitle}
                    </div>
                    {defaults.signedInAsName ? (
                      <div className="mt-2 text-base font-semibold leading-snug text-white">{defaults.signedInAsName}</div>
                    ) : null}
                    {defaults.signedInAsEmail ? (
                      <div className="mt-1 text-sm text-slate-200/90">{defaults.signedInAsEmail}</div>
                    ) : null}
                    {defaults.needsSavedPhone && labels.addPhoneBookingHint ? (
                      <p className="mt-3 text-xs leading-relaxed text-slate-200/85">{labels.addPhoneBookingHint}</p>
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
                      onChange={(e) => setCheckIn(e.target.value)}
                      className={`${mobileField} cursor-pointer`}
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
                      onChange={(e) => setCheckOut(e.target.value)}
                      className={`${mobileField} cursor-pointer`}
                    />
                  </label>
                </div>
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
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-slate-100">
                  <div className="font-semibold">Способ оплаты</div>
                  <div className="mt-1 text-slate-200">Душанбе City (DC Next)</div>
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
                  <div className="mt-3 flex justify-between font-semibold text-slate-100">
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
                  className="relative overflow-hidden rounded-2xl border border-emerald-400/25 px-4 py-4 text-sm text-slate-100 shadow-[0_0_0_1px_rgba(16,185,129,0.12),0_0_32px_-4px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(16,185,129,0.06) 45%, rgba(6,78,59,0.12) 100%)"
                  }}
                >
                  <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-emerald-500/15 blur-2xl" />
                  <div className="relative flex gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-500/15 text-emerald-200">
                      <ShieldCheckIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className="font-semibold tracking-tight text-emerald-50/95">{labels.escrowTitle}</div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-200/90">{labels.escrowBody}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200 backdrop-blur-sm">
                  {labels.paymentMethodLabel}: <span className="font-semibold text-white">{payMethodLabel}</span>
                </div>
              </div>
            )}

            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pb-10 pt-5">
              <Button
                type="button"
                variant="secondary"
                className="border-white/20 bg-transparent text-slate-200 shadow-none hover:border-white/30 hover:bg-white/[0.04]"
                disabled={step === 1}
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
              >
                {labels.back}
              </Button>

              {step < 3 ? (
                <Button
                  type="button"
                  disabled={step === 1 && !nights}
                  onClick={() => setStep((s) => (s < 3 ? ((s + 1) as Step) : s))}
                >
                  {labels.next}
                </Button>
              ) : (
                <Button
                  type="button"
                  loading={submitting}
                  disabled={submitting}
                  onClick={() => void runBookingSubmit()}
                  className="border-emerald-400/40 bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-[0_8px_28px_rgba(0,0,0,0.35),0_0_24px_rgba(16,185,129,0.35)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.35),0_0_32px_rgba(52,211,153,0.45)]"
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
