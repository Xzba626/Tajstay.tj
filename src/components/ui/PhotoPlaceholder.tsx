import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type Props = {
  locale: Locale;
  variant?: "hotel" | "room";
  className?: string;
};

/** Premium empty state when no property photo is available (not a fake hotel image). */
export function PhotoPlaceholder({ locale, variant = "hotel", className = "" }: Props) {
  const title = m(locale, variant === "room" ? "media.noPhotoRoom" : "media.noPhoto");
  const hint = m(locale, "media.noPhotoHint");

  return (
    <div
      className={`photo-placeholder photo-placeholder--${variant} ${className}`.trim()}
      role="img"
      aria-label={title}
    >
      <div className="photo-placeholder__icon" aria-hidden>
        {variant === "room" ? "🛏️" : "🏨"}
      </div>
      <p className="photo-placeholder__title">{title}</p>
      <p className="photo-placeholder__hint">{hint}</p>
    </div>
  );
}
