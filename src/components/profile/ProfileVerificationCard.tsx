import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { VerificationItem } from "@/lib/profile/trustScore";
import { cn } from "@/lib/cn";

type Props = {
  locale: Locale;
  items: VerificationItem[];
};

const LABEL_KEYS: Record<VerificationItem["id"], string> = {
  phone: "profile.verifyPhone",
  email: "profile.verifyEmail",
  telegram: "profile.verifyTelegram",
  photo: "profile.verifyPhoto"
};

export function ProfileVerificationCard({ locale, items }: Props) {
  return (
    <section className="profile-panel" aria-labelledby="profile-verify-title">
      <h2 id="profile-verify-title" className="profile-panel__title">
        {m(locale, "profile.verificationTitle")}
      </h2>

      <ul className="profile-verify-list">
        {items.map((item) => (
          <li key={item.id} className="profile-verify-list__row">
            <span className={cn("profile-verify-list__icon", item.done ? "is-done" : "is-pending")} aria-hidden>
              {item.done ? "✓" : "○"}
            </span>
            <span className="profile-verify-list__label">{m(locale, LABEL_KEYS[item.id])}</span>
            <span className={cn("profile-verify-list__status", item.done ? "is-done" : "is-pending")}>
              {item.done ? m(locale, "profile.statusVerified") : m(locale, "profile.statusPending")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
