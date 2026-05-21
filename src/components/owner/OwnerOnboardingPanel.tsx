"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type StepId = "property" | "photos" | "payment" | "calendar" | "publish";

type Step = { id: StepId; done: boolean; href: string };

type Props = {
  locale: Locale;
  initialSteps: Step[];
  showWelcome: boolean;
};

const STEP_KEYS: Record<StepId, string> = {
  property: "ownerOnboarding.stepProperty",
  photos: "ownerOnboarding.stepPhotos",
  payment: "ownerOnboarding.stepPayment",
  calendar: "ownerOnboarding.stepCalendar",
  publish: "ownerOnboarding.stepPublish"
};

export function OwnerOnboardingPanel({ locale, initialSteps, showWelcome }: Props) {
  const [dismissed, setDismissed] = useState(true);
  const [steps, setSteps] = useState(initialSteps);

  useEffect(() => {
    const key = "tajstay_owner_onboarding_dismissed";
    setDismissed(localStorage.getItem(key) === "1" && !showWelcome);
  }, [showWelcome]);

  useEffect(() => {
    void fetch("/api/owner/onboarding", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.steps)) setSteps(j.steps as Step[]);
      })
      .catch(() => undefined);
  }, []);

  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const complete = done === total && total > 0;

  if (dismissed && complete) return null;

  function dismiss() {
    localStorage.setItem("tajstay_owner_onboarding_dismissed", "1");
    setDismissed(true);
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/80 via-slate-900/95 to-slate-950 p-4 sm:p-6">
      <div className="pointer-events-none absolute -right-6 top-0 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="relative">
        {!dismissed && (
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/90">TajStay Host</p>
            <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">{m(locale, "ownerOnboarding.welcomeTitle")}</h2>
            <p className="mt-2 text-sm text-slate-300">{m(locale, "ownerOnboarding.welcomeDesc")}</p>
            <Link
              href="/dashboard/owner?section=properties"
              className="ds-primary-btn mt-4 inline-flex min-h-[44px] items-center justify-center px-5 text-sm font-semibold"
            >
              {m(locale, "ownerOnboarding.addFirstProperty")}
            </Link>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">{m(locale, "ownerOnboarding.checklistTitle")}</h3>
            <p className="text-xs text-slate-400">{m(locale, "ownerOnboarding.checklistDesc")}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10 sm:w-32">
              <div className="h-full rounded-full bg-[var(--brand-green)] transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-xs font-semibold text-emerald-200">
              {done}/{total}
            </span>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className={`flex min-h-[44px] items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                  step.done
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.done ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-400"
                  }`}
                >
                  {step.done ? "✓" : "○"}
                </span>
                <span className="text-sm font-medium">{m(locale, STEP_KEYS[step.id])}</span>
              </Link>
            </li>
          ))}
        </ul>

        {complete ? (
          <button type="button" onClick={dismiss} className="mt-4 text-xs font-semibold text-slate-400 hover:text-white">
            {m(locale, "ownerOnboarding.dismiss")}
          </button>
        ) : null}
      </div>
    </section>
  );
}
