"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookingChatLauncher } from "@/components/chat/BookingChatPanel";
import type { Locale } from "@/lib/i18n/locale";

type Labels = {
  paidNext: string;
  instructionTitle: string;
  instructionBody: string;
  proofTitle: string;
  proofUrlPh: string;
  proofFileLabel: string;
  submitProof: string;
  cancel: string;
  contactUs: string;
  supportLine: string;
};

type Props = {
  bookingId: number;
  currentUserId: number;
  currentUserRole: "GUEST" | "OWNER" | "ADMIN";
  bookingStatus: string;
  paymentStatus: string;
  code: string;
  isExpired: boolean;
  canSubmitProof: boolean;
  canCancel: boolean;
  autoOpen?: boolean;
  locale: Locale;
  labels: Labels;
  /** «Сделка»: без лишнего текста, чат снаружи. */
  mode?: "default" | "deal";
};

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4M7 4h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z" />
    </svg>
  );
}

export function PaymentAfterPay({
  bookingId,
  currentUserId,
  currentUserRole,
  bookingStatus,
  paymentStatus,
  code,
  isExpired,
  canSubmitProof,
  canCancel,
  autoOpen,
  locale,
  labels,
  mode = "default"
}: Props) {
  const isDeal = mode === "deal";
  const [open, setOpen] = useState(Boolean(autoOpen || isDeal));
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const handleOpen = () => {
    setOpen(true);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("after", "1");
      window.history.replaceState({}, "", url.toString());
    }
  };

  useEffect(() => {
    if (!open) return;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [open]);

  useEffect(() => {
    if (!open || isExpired) return;
    const onceKey = `payment-chat-intro:${bookingId}`;
    if (window.localStorage.getItem(onceKey) === "1") return;
    fetch(`/api/chat/booking/${bookingId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        message: "Оплата отправлена. Загружаю чек."
      })
    })
      .then(() => {
        window.localStorage.setItem(onceKey, "1");
      })
      .catch(() => undefined);
  }, [open, isExpired, bookingId]);

  const show = useMemo(() => open && !isExpired, [open, isExpired]);
  const showOptionalUrl = isDeal && (bookingStatus === "WAIT_PROOF" || bookingStatus === "REJECTED");

  return (
    <div className={isDeal ? "mt-0" : "mt-4"}>
      {!open && !isDeal ? (
        <button
          type="button"
          onClick={handleOpen}
          className="taj-btn taj-btn--primary taj-btn--full"
        >
          {labels.paidNext}
        </button>
      ) : null}

      <div ref={sectionRef} className={show ? (isDeal ? "space-y-3" : "mt-4 space-y-4") : isDeal ? "" : "mt-4"}>
        {open && isExpired ? (
          <div className="rounded-xl border border-[var(--taj-line)] bg-[var(--taj-snow)] px-4 py-3 text-sm text-[var(--taj-ink-soft)]" role="alert">
            Время вышло. Оформите бронь заново.
          </div>
        ) : null}

        {show ? (
          <>
            {!isDeal && (labels.instructionTitle || labels.instructionBody) ? (
              <div className="rounded-2xl border border-[var(--taj-line)] bg-[var(--taj-snow)] p-4 text-sm text-[var(--taj-ink)]">
                {labels.instructionTitle ? <div className="font-semibold">{labels.instructionTitle}</div> : null}
                {labels.instructionBody ? <div className="mt-1 text-[var(--taj-ink-soft)]">{labels.instructionBody}</div> : null}
              </div>
            ) : null}

            {canSubmitProof ? (
              <form id="payment-proof" action="/api/payments/proof" method="post" encType="multipart/form-data" className="space-y-3">
                <input type="hidden" name="code" value={code} />
                {!isDeal && labels.proofTitle ? <div className="text-sm font-semibold text-[var(--taj-ink)]">{labels.proofTitle}</div> : null}

                {isDeal ? (
                  <>
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--taj-lake)]/50 bg-[var(--taj-lake-soft)] px-4 py-8 transition hover:border-[var(--taj-lake)] hover:bg-[var(--taj-mist)] active:scale-[0.99]">
                      <ReceiptIcon className="h-10 w-10 text-[var(--taj-lake)]" />
                      <span className="text-base font-semibold text-[var(--taj-ink)]">Загрузить чек</span>
                      <span className="text-center text-xs text-[var(--taj-color-text-muted)]">PNG, JPG или WebP</span>
                      <input name="proofFile" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" />
                    </label>
                    {showOptionalUrl ? (
                      <input
                        name="proofUrl"
                        placeholder={labels.proofUrlPh}
                        className="w-full rounded-xl border border-[var(--taj-line)] bg-[var(--taj-mist)] px-3 py-2.5 text-sm text-[var(--taj-ink)] placeholder:text-[var(--taj-color-text-muted)]"
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    <input
                      name="proofUrl"
                      placeholder={labels.proofUrlPh}
                      className="w-full rounded-xl border border-[var(--taj-line)] bg-[var(--taj-mist)] px-3 py-2 text-sm text-[var(--taj-ink)]"
                    />
                    <label className="block">
                      <span className="mb-1 block text-xs text-[var(--taj-ink-soft)]">{labels.proofFileLabel}</span>
                      <input
                        name="proofFile"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="w-full rounded-xl border border-[var(--taj-line)] bg-[var(--taj-mist)] px-3 py-2 text-sm text-[var(--taj-ink)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--taj-lake)] file:px-3 file:py-1.5 file:text-white"
                      />
                    </label>
                  </>
                )}

                <div className={`flex flex-wrap items-stretch gap-2 ${isDeal ? "pt-1" : "items-center gap-3"}`}>
                  <button
                    type="submit"
                    className={
                      isDeal
                        ? "taj-btn taj-btn--primary min-h-[52px] flex-1"
                        : "taj-btn taj-btn--primary"
                    }
                  >
                    {isDeal ? "Отправить" : labels.submitProof}
                  </button>
                  {canCancel ? (
                    <button
                      type="submit"
                      formAction="/api/bookings/cancel"
                      formMethod="post"
                      className={
                        isDeal
                          ? "inline-flex min-h-[52px] min-w-[52px] items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 sm:min-w-[88px]"
                          : "inline-flex rounded-2xl border border-[var(--taj-line)] bg-[var(--taj-snow)] px-5 py-2.5 text-sm font-semibold text-[var(--taj-ink-soft)] transition hover:bg-brand-700"
                      }
                      aria-label={labels.cancel}
                    >
                      {isDeal ? (
                        <>
                          <span className="sm:hidden" aria-hidden>
                            ✕
                          </span>
                          <span className="hidden sm:inline">{labels.cancel}</span>
                        </>
                      ) : (
                        labels.cancel
                      )}
                    </button>
                  ) : null}
                  {!isDeal ? (
                    <>
                      <a
                        href="/contacts"
                        className="text-sm font-semibold text-[var(--taj-ink-soft)] underline-offset-4 transition hover:underline"
                      >
                        {labels.contactUs}
                      </a>
                      {labels.supportLine ? <span className="text-xs text-[var(--taj-ink-soft)]">{labels.supportLine}</span> : null}
                    </>
                  ) : null}
                </div>
              </form>
            ) : null}

            {!isDeal ? (
              <BookingChatLauncher
                bookingId={bookingId}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                locale={locale}
                bookingStatus={bookingStatus}
                paymentStatus={paymentStatus}
                paymentCode={code}
                title="Чат по оплате"
                openLabel="Открыть чат"
              />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
