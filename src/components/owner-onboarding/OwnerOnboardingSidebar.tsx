import type { OwnerOnboardingLabels } from "@/lib/i18n/ownerOnboarding";

export function OwnerOnboardingSidebar({ L }: { L: OwnerOnboardingLabels }) {
  const trust = [L.trust1, L.trust2, L.trust3, L.trust4];
  const steps = [L.step1, L.step2, L.step3, L.step4];

  return (
    <div className="owner-onboarding-sidebar space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300/90">TajStay Partners</p>
        <h1 className="owner-onboarding-hero-title mt-3">{L.heroTitle}</h1>
        <p className="owner-onboarding-hero-sub mt-4">{L.heroSubtitle}</p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {trust.map((t) => (
          <li
            key={t}
            className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200"
          >
            <span className="mt-0.5 text-emerald-400" aria-hidden>
              ✓
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
        <h2 className="text-sm font-bold text-white">{L.howTitle}</h2>
        <ol className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-sm text-slate-300">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-200 ring-1 ring-emerald-500/30">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-snug">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="owner-trust-callout hidden lg:block">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-lg text-emerald-300" aria-hidden>
            🛡
          </span>
          <div>
            <p className="text-sm font-bold text-white">{L.trustBoxTitle}</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300">
              <li>{L.trustBox1}</li>
              <li>{L.trustBox2}</li>
              <li>{L.trustBox3}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
