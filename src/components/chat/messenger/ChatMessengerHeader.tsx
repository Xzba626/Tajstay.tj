"use client";

import Link from "next/link";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ChatTimerChip } from "@/components/chat/messenger/ChatTimerChip";

type Props = {
  locale: Locale;
  backHref: string;
  hotelName: string;
  roomTitle: string;
  bookingStatus: string;
  timerExpiresAt: string | null;
  timerPaused?: boolean;
  timerPausedLabel?: string;
};

export function ChatMessengerHeader({
  locale,
  backHref,
  hotelName,
  roomTitle,
  bookingStatus,
  timerExpiresAt,
  timerPaused,
  timerPausedLabel
}: Props) {
  const showTimer =
    timerExpiresAt &&
    (bookingStatus === "WAITING_PAYMENT" ||
      bookingStatus === "WAIT_PROOF" ||
      bookingStatus === "ON_REVIEW");

  return (
    <header className="messenger-header">
      <Link href={backHref} className="messenger-header__back">
        ← {m(locale, "bookingRoom.back")}
      </Link>
      <div className="messenger-header__title" title={`${hotelName} · ${roomTitle}`}>
        {hotelName} · {roomTitle}
      </div>
      {showTimer ? (
        <ChatTimerChip expiresAtIso={timerExpiresAt} paused={timerPaused} pausedLabel={timerPausedLabel} />
      ) : (
        <span className="messenger-header__spacer" aria-hidden />
      )}
    </header>
  );
}
