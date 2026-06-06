import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  state: "read" | "unread";
  title: string;
  hotelName?: string | null;
  timestamp: string;
  openHref: string;
  openLabel: string;
  markReadAction?: ReactNode;
};

export function NotificationListCard({
  state,
  title,
  hotelName,
  timestamp,
  openHref,
  openLabel,
  markReadAction
}: Props) {
  return (
    <article className={cn("taj-notification-card", state === "unread" && "taj-notification-card--unread")}>
      <div className="taj-notification-card__header">
        <h2 className="taj-notification-card__title">{title}</h2>
        {markReadAction}
      </div>
      {hotelName ? <p className="taj-notification-card__meta">{hotelName}</p> : null}
      <div className="taj-notification-card__footer">
        <time className="taj-notification-card__time">{timestamp}</time>
        <Link href={openHref} className="taj-notification-card__link">
          {openLabel}
        </Link>
      </div>
    </article>
  );
}
