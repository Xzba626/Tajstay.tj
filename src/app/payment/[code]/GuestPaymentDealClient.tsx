"use client";

import { motion } from "framer-motion";
import { DealStepProgress } from "@/components/deal/DealStepProgress";
import { DcNextPaymentCard } from "@/components/payment/DcNextPaymentCard";
import { PaymentCountdown } from "./PaymentCountdown";
import { PaymentAfterPay } from "./PaymentAfterPay";
import { BookingChatPanel } from "@/components/chat/BookingChatPanel";
import { m } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locale";

export type GuestPaymentDealClientProps = {
  locale: Locale;
  bookingId: number;
  userId: number;
  code: string;
  hotelName: string;
  roomTitle: string;
  totalPrice: number;
  bookingStatus: string;
  paymentStatus: string;
  expiresAtIso: string | null;
  proofReviewDeadlineAtIso: string | null;
  paymentTimerPaused: boolean;
  isExpired: boolean;
  isConfirmed: boolean;
  isOnReview: boolean;
  canSubmitProof: boolean;
  canCancel: boolean;
  dcReturnUrl: string;
  checkInIso: string;
};

function contextualTitle(status: string): string {
  if (status === "ON_REVIEW") return "Проверка чека";
  if (status === "WAIT_PROOF" || status === "REJECTED") return "Загрузить чек";
  if (status === "WAITING_PAYMENT") return "Оплата";
  return "Бронь";
}

export function GuestPaymentDealClient(props: GuestPaymentDealClientProps) {
  const {
    locale,
    bookingId,
    userId,
    code,
    hotelName,
    roomTitle,
    totalPrice,
    bookingStatus,
    paymentStatus,
    expiresAtIso,
    proofReviewDeadlineAtIso,
    paymentTimerPaused,
    isExpired,
    isConfirmed,
    isOnReview,
    canSubmitProof,
    canCancel,
    dcReturnUrl,
    checkInIso
  } = props;

  const headline = contextualTitle(bookingStatus);

  return (
    <motion.div
      className="mx-auto max-w-lg px-3 pb-28 pt-4 sm:max-w-xl sm:px-4 sm:pb-24 sm:pt-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="surface-1 rounded-3xl p-4 ring-1 ring-white/10 sm:p-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <DealStepProgress status={bookingStatus} />

        <div className="mt-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-widest text-emerald-200/70">{hotelName}</p>
            <p className="truncate text-sm text-white/80">{roomTitle}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">{headline}</h1>
          </div>
          <div className="shrink-0 rounded-2xl bg-black/25 px-3 py-2 text-right ring-1 ring-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Сумма</p>
            <p className="text-lg font-bold tabular-nums text-emerald-100 sm:text-xl">
              {Number(totalPrice).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} <span className="text-sm font-semibold">TJS</span>
            </p>
          </div>
        </div>

        {!isConfirmed && !isExpired ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
            <span className="text-xs font-medium text-slate-400">
              {isOnReview ? m(locale, "status.ON_REVIEW") : m(locale, "checkout.timerTitle")}
            </span>
            <span className="text-sm font-semibold tabular-nums text-white">
              {isOnReview && proofReviewDeadlineAtIso ? (
                <PaymentCountdown expiresAtIso={proofReviewDeadlineAtIso} />
              ) : (
                <PaymentCountdown
                  expiresAtIso={expiresAtIso}
                  paused={Boolean(paymentTimerPaused) && (bookingStatus === "WAITING_PAYMENT" || bookingStatus === "WAIT_PROOF")}
                  pausedLabel={m(locale, "chat.timerPaused")}
                />
              )}
            </span>
          </div>
        ) : null}

        {isExpired ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/25 px-3 py-3 text-sm text-red-100" role="alert">
            {m(locale, "checkout.expired")}
          </div>
        ) : null}

        {isConfirmed ? (
          <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-50" role="status">
            <p className="font-semibold">Готово</p>
            <p className="mt-1 text-emerald-100/85">Код: {code}</p>
          </div>
        ) : null}

        {!isConfirmed && !isExpired ? (
          <motion.div className="mt-5 space-y-4" layout transition={{ duration: 0.3 }}>
            {bookingStatus === "ON_REVIEW" ? (
              <p className="text-center text-sm text-indigo-100/90">Админ проверяет чек</p>
            ) : (
              <DcNextPaymentCard
                variant="embedded"
                returnUrl={dcReturnUrl}
                amountTjs={Number(totalPrice)}
                account="901317727"
                footerHint={null}
              />
            )}

            {canSubmitProof ? (
              <PaymentAfterPay
                bookingId={bookingId}
                currentUserId={userId}
                currentUserRole="GUEST"
                bookingStatus={bookingStatus}
                paymentStatus={paymentStatus}
                code={code}
                isExpired={isExpired}
                canSubmitProof={canSubmitProof}
                canCancel={canCancel}
                autoOpen
                locale={locale}
                mode="deal"
                labels={{
                  paidNext: "Далее",
                  instructionTitle: "",
                  instructionBody: "",
                  proofTitle: "",
                  proofUrlPh: m(locale, "checkout.proofUrlLabel"),
                  proofFileLabel: m(locale, "checkout.proofFileLabel"),
                  submitProof: m(locale, "checkout.submitProof"),
                  cancel: "Отмена",
                  contactUs: m(locale, "checkout.contactUs"),
                  supportLine: ""
                }}
              />
            ) : null}
          </motion.div>
        ) : null}
      </motion.div>

      {!isConfirmed && !isExpired ? (
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Чат</p>
          <BookingChatPanel
            bookingId={bookingId}
            currentUserId={userId}
            currentUserRole="GUEST"
            bookingStatus={bookingStatus}
            paymentStatus={paymentStatus}
            locale={locale}
            checkInIso={checkInIso}
            paymentCode={code}
            presentation="page"
            title="Сделка"
            hotelName={hotelName}
            roomTitle={roomTitle}
            counterpartPreview="Поддержка"
            density="compact"
            suppressPaymentDeepLink
          />
        </motion.div>
      ) : null}
    </motion.div>
  );
}
