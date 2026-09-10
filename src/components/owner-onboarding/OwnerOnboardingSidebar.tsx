import type { OwnerOnboardingLabels } from "@/lib/i18n/ownerOnboarding";

export function OwnerOnboardingSidebar({ L }: { L: OwnerOnboardingLabels }) {
  const trust = [L.trust1, L.trust2, L.trust3, L.trust4];
  const steps = [L.step1, L.step2, L.step3, L.step4];

  // Rewritten light per Green Contract — this used to be a dark navy/black promo panel with a
  // decorative "TajStay Partners" eyebrow and near-unreadable feature bars, out of step with the
  // rest of the product. Now white surfaces, dark text, canonical #0F7A4D accents, and compact —
  // the form is the primary content, this is supporting context, not a marketing landing page.
  return (
    <div className="owner-onboarding-sidebar space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--taj-text,#14231b)] sm:text-2xl">{L.heroTitle}</h1>
        <p className="mt-2 text-sm text-[var(--taj-text-muted,#71717a)]">{L.heroSubtitle}</p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {trust.map((t) => (
          <li
            key={t}
            className="flex items-start gap-2 rounded-xl border border-[var(--taj-border,#e4e4e7)] bg-white px-3 py-2.5 text-sm text-[var(--taj-text,#14231b)]"
          >
            <span className="mt-0.5 text-[#0f7a4d]" aria-hidden>
              ✓
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-[var(--taj-border,#e4e4e7)] bg-white p-4">
        <h2 className="text-sm font-bold text-[var(--taj-text,#14231b)]">{L.howTitle}</h2>
        <ol className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-sm text-[var(--taj-text-muted,#71717a)]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0f7a4d]/10 text-xs font-bold text-[#0f7a4d] ring-1 ring-[#0f7a4d]/25">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-snug">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="owner-trust-callout hidden lg:block">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f7a4d]/10 text-lg text-[#0f7a4d]" aria-hidden>
            🛡
          </span>
          <div>
            <p className="text-sm font-bold text-[var(--taj-text,#14231b)]">{L.trustBoxTitle}</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[var(--taj-text-muted,#71717a)]">
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
