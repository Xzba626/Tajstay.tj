import Link from "next/link";
import type { OwnerOnboardingLabels } from "@/lib/i18n/ownerOnboarding";

type Props = {
  variant: "pending" | "rejected" | "approved" | "success";
  L: OwnerOnboardingLabels;
  rejectComment?: string | null;
};

export function OwnerStatusPanel({ variant, L, rejectComment }: Props) {
  if (variant === "success") {
    return (
      <div className="owner-status-card owner-status-card--success">
        <div className="owner-status-icon" aria-hidden>
          ✓
        </div>
        <h2 className="text-xl font-bold text-white">{L.successTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{L.successBody}</p>
        <Link href="/profile" className="owner-onboarding-submit mt-6 inline-flex min-h-[48px] items-center justify-center px-6">
          {L.successCta}
        </Link>
      </div>
    );
  }

  if (variant === "pending") {
    return (
      <div className="owner-status-card owner-status-card--pending">
        <div className="owner-status-chip">{L.pendingTimeline}</div>
        <h2 className="mt-4 text-xl font-bold text-white">{L.pendingTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{L.pendingBody}</p>
        <ol className="owner-timeline mt-6">
          {[L.step1, L.step2, L.step3].map((s, i) => (
            <li key={s} className={i === 0 ? "is-active" : ""}>
              <span className="owner-timeline-dot" />
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <Link
          href="/profile"
          className="mt-6 inline-flex text-sm font-semibold text-emerald-300 hover:text-emerald-200"
        >
          ← {L.backProfile}
        </Link>
      </div>
    );
  }

  if (variant === "rejected") {
    return (
      <div className="owner-status-card owner-status-card--rejected">
        <h2 className="text-xl font-bold text-white">{L.rejectedTitle}</h2>
        {rejectComment ? (
          <p className="mt-3 rounded-xl border border-red-400/20 bg-red-950/30 px-4 py-3 text-sm text-red-100">
            <span className="font-semibold text-red-200">{L.rejectedReason}: </span>
            {rejectComment}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-slate-400">{L.formSubtitle}</p>
      </div>
    );
  }

  return (
    <div className="owner-status-card owner-status-card--approved">
      <div className="owner-status-icon" aria-hidden>
        ★
      </div>
      <h2 className="text-xl font-bold text-white">{L.approvedTitle}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{L.approvedBody}</p>
      <Link href="/dashboard/owner?onboarding=1" className="owner-onboarding-submit mt-6 inline-flex min-h-[48px] items-center justify-center px-6">
        {L.approvedCta}
      </Link>
    </div>
  );
}
