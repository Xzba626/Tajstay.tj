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
    <li className="flex gap-3 text-sm leading-snug text-emerald-100/75">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
        {n}
      </span>
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
      <section
        className="relative overflow-hidden rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-950/80 via-[#041a12]/95 to-[#041a12] p-5 sm:p-6"
        aria-labelledby="profile-owner-card-title"
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="relative">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/25">
              <span className="shrink-0" aria-hidden>✓</span>
              <span className="break-words whitespace-normal">{t("titleOwner")}</span>
            </span>
          </div>
          <h2 id="profile-owner-card-title" className="mt-3 text-lg font-bold tracking-tight text-white sm:text-xl">
            {t("titleOwner")}
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-emerald-100/75">{t("descOwner")}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href="/dashboard/owner" className="taj-btn taj-btn--primary inline-flex min-h-[44px] items-center justify-center px-5 text-sm font-semibold">
              {t("ctaOwnerDashboard")}
            </Link>
            <Link href="/dashboard/owner?section=properties" className="taj-btn taj-btn--secondary inline-flex min-h-[44px] items-center justify-center px-5 text-sm font-semibold">
              {t("ctaAddProperty")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (role !== "GUEST") return null;

  if (ownerNav.kind === "pending") {
    return (
      <section
        className="relative overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-950/50 via-[#041a12]/95 to-[#041a12] p-5 sm:p-6"
        aria-labelledby="profile-owner-card-title"
      >
        <div className="pointer-events-none absolute -left-6 top-0 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
        <div className="relative">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/25">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400" aria-hidden />
              <span className="break-words whitespace-normal">{t("titlePending")}</span>
            </span>
          </div>
          <h2 id="profile-owner-card-title" className="mt-3 text-lg font-bold leading-snug text-white sm:text-xl">
            {t("titlePending")}
          </h2>
          <p className="mt-2 break-words whitespace-normal text-sm leading-relaxed text-amber-100/90">{t("descPending")}</p>
        </div>
      </section>
    );
  }

  if (ownerNav.kind === "rejected") {
    const reason = ownerNav.comment;
    return (
      <section
        className="relative overflow-hidden rounded-2xl border border-red-400/20 bg-gradient-to-br from-red-950/40 via-[#041a12]/95 to-[#041a12] p-5 sm:p-6"
        aria-labelledby="profile-owner-card-title"
      >
        <div className="relative">
          <h2 id="profile-owner-card-title" className="text-lg font-bold text-white sm:text-xl">
            {t("titleRejected")}
          </h2>
          {reason ? (
            <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <span className="font-semibold text-red-200">{t("reasonLabel")}: </span>
              {reason}
            </div>
          ) : null}
          <Link href="/profile/become-owner" className="taj-btn taj-btn--primary mt-5 inline-flex min-h-[44px] w-full items-center justify-center sm:w-auto">
            {t("ctaResubmit")}
          </Link>
        </div>
      </section>
    );
  }

  if (ownerNav.kind === "approved") {
    return (
      <section
        className="relative overflow-hidden rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-950/60 via-[#041a12]/95 to-[#041a12] p-5 sm:p-6"
        aria-labelledby="profile-owner-card-title"
      >
        <div className="relative">
          <h2 id="profile-owner-card-title" className="break-words whitespace-normal text-lg font-bold text-emerald-100 sm:text-xl">
            {t("titleApproved")}
          </h2>
          <p className="mt-2 break-words whitespace-normal text-sm leading-relaxed text-emerald-200/90">{t("descApproved")}</p>
          <Link href="/dashboard/owner" className="taj-btn taj-btn--primary mt-5 inline-flex min-h-[44px] w-full items-center justify-center sm:w-auto">
            {t("ctaOwnerDashboard")}
          </Link>
        </div>
      </section>
    );
  }

  if (ownerNav.kind !== "none") return null;

  return (
    <section className="profile-owner-card" aria-labelledby="profile-owner-card-title">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">TajStay Host</p>
        <h2 id="profile-owner-card-title" className="mt-2 text-[clamp(1.125rem,4vw,1.35rem)] font-bold leading-tight text-white">
          {t("titleInvite")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-100/75">{t("descInvite")}</p>
        <ol className="mt-5 space-y-3">
          <StepItem n={1} text={t("step1")} />
          <StepItem n={2} text={t("step2")} />
          <StepItem n={3} text={t("step3")} />
        </ol>
        <Link href="/profile/become-owner" className="btn-primary mt-6 inline-flex !w-full sm:!w-auto !h-12 text-sm">
          {t("ctaBecomeOwner")}
        </Link>
    </section>
  );
}
