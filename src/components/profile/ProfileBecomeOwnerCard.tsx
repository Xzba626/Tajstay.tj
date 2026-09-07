import Link from "next/link";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { OwnerAppNavState } from "@/lib/navigation/getNavContext";

type Props = {
  locale: Locale;
  role: string;
  ownerNav: OwnerAppNavState;
};

function StepItem({ n, text }: { n: number; text: string }) {
  return (
    <li className="profile-owner-card__step">
      <span className="profile-owner-card__step-num">{n}</span>
      <span className="pt-0.5">{text}</span>
    </li>
  );
}

type OwnerCardKey =
  | "titleInvite"
  | "descInvite"
  | "step1"
  | "step2"
  | "step3"
  | "ctaBecomeOwner"
  | "titlePending"
  | "descPending"
  | "ctaViewApplication"
  | "titleRejected"
  | "reasonLabel"
  | "ctaResubmit"
  | "titleApproved"
  | "descApproved"
  | "titleOwner"
  | "descOwner"
  | "ctaOwnerDashboard"
  | "ctaAddProperty";

export function ProfileBecomeOwnerCard({ locale, role, ownerNav }: Props) {
  if (role === "ADMIN") return null;

  const t = (key: OwnerCardKey) => m(locale, `profile.ownerCard.${key}`);

  if (role === "OWNER") {
    return (
      <section className="profile-owner-card profile-owner-card--owner" aria-labelledby="profile-owner-card-title">
        <div className="profile-owner-card__badge">
          <span aria-hidden>✓</span>
          {t("titleOwner")}
        </div>
        <h2 id="profile-owner-card-title" className="profile-owner-card__title">
          {t("titleOwner")}
        </h2>
        <p className="profile-owner-card__desc">{t("descOwner")}</p>
        <div className="profile-owner-card__actions">
          <Link href="/dashboard/owner" className="taj-btn taj-btn--primary inline-flex min-h-[44px] items-center justify-center px-5 text-sm font-semibold">
            {t("ctaOwnerDashboard")}
          </Link>
          <Link href="/dashboard/owner?section=properties" className="taj-btn taj-btn--secondary inline-flex min-h-[44px] items-center justify-center px-5 text-sm font-semibold">
            {t("ctaAddProperty")}
          </Link>
        </div>
      </section>
    );
  }

  if (role !== "GUEST") return null;

  if (ownerNav.kind === "pending") {
    return (
      <section className="profile-owner-card profile-owner-card--pending" aria-labelledby="profile-owner-card-title">
        <div className="profile-owner-card__badge profile-owner-card__badge--pending">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden />
          {t("titlePending")}
        </div>
        <h2 id="profile-owner-card-title" className="profile-owner-card__title">
          {t("titlePending")}
        </h2>
        <p className="profile-owner-card__desc">{t("descPending")}</p>
        <div className="profile-owner-card__actions">
          <Link href="/profile/become-owner" className="taj-btn taj-btn--secondary inline-flex min-h-[44px] w-full items-center justify-center sm:w-auto">
            {t("ctaViewApplication")}
          </Link>
        </div>
      </section>
    );
  }

  if (ownerNav.kind === "rejected") {
    const reason = ownerNav.comment;
    return (
      <section className="profile-owner-card profile-owner-card--rejected" aria-labelledby="profile-owner-card-title">
        <h2 id="profile-owner-card-title" className="profile-owner-card__title">
          {t("titleRejected")}
        </h2>
        {reason ? (
          <div className="profile-owner-card__reason">
            <span className="font-semibold">{t("reasonLabel")}: </span>
            {reason}
          </div>
        ) : null}
        <div className="profile-owner-card__actions">
          <Link href="/profile/become-owner" className="taj-btn taj-btn--primary inline-flex min-h-[44px] w-full items-center justify-center sm:w-auto">
            {t("ctaResubmit")}
          </Link>
        </div>
      </section>
    );
  }

  if (ownerNav.kind === "approved") {
    return (
      <section className="profile-owner-card profile-owner-card--approved" aria-labelledby="profile-owner-card-title">
        <h2 id="profile-owner-card-title" className="profile-owner-card__title">
          {t("titleApproved")}
        </h2>
        <p className="profile-owner-card__desc">{t("descApproved")}</p>
        <div className="profile-owner-card__actions">
          <Link href="/dashboard/owner" className="taj-btn taj-btn--primary inline-flex min-h-[44px] w-full items-center justify-center sm:w-auto">
            {t("ctaOwnerDashboard")}
          </Link>
        </div>
      </section>
    );
  }

  if (ownerNav.kind !== "none") return null;

  return (
    <section className="profile-owner-card" aria-labelledby="profile-owner-card-title">
      <p className="profile-owner-card__badge">TajStay Host</p>
      <h2 id="profile-owner-card-title" className="profile-owner-card__title">
        {t("titleInvite")}
      </h2>
      <p className="profile-owner-card__desc">{t("descInvite")}</p>
      <ol className="profile-owner-card__steps">
        <StepItem n={1} text={t("step1")} />
        <StepItem n={2} text={t("step2")} />
        <StepItem n={3} text={t("step3")} />
      </ol>
      <div className="profile-owner-card__actions">
        <Link href="/profile/become-owner" className="taj-btn taj-btn--primary inline-flex min-h-[44px] w-full items-center justify-center sm:w-auto">
          {t("ctaBecomeOwner")}
        </Link>
      </div>
    </section>
  );
}
