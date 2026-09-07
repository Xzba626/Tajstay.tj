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
    <section className="owner-onboarding">
      {!dismissed ? (
        <div className="mb-5">
          <p className="owner-onboarding__eyebrow">TajStay Host</p>
          <h2 className="owner-onboarding__title">{m(locale, "ownerOnboarding.welcomeTitle")}</h2>
          <p className="owner-onboarding__desc">{m(locale, "ownerOnboarding.welcomeDesc")}</p>
          <Link href="/dashboard/owner?section=properties" className="owner-btn owner-btn--primary mt-4 inline-flex min-h-[44px] items-center justify-center px-5">
            {m(locale, "ownerOnboarding.addFirstProperty")}
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="owner-panel__title">{m(locale, "ownerOnboarding.checklistTitle")}</h3>
          <p className="owner-section-lead">{m(locale, "ownerOnboarding.checklistDesc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="owner-onboarding__progress-track">
            <div className="owner-onboarding__progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <span className="owner-onboarding__progress-count">
            {done}/{total}
          </span>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className={`owner-onboarding__step ${step.done ? "owner-onboarding__step--done" : ""}`}
            >
              <span className={`owner-onboarding__step-badge ${step.done ? "owner-onboarding__step-badge--done" : "owner-onboarding__step-badge--todo"}`}>
                {step.done ? "✓" : "○"}
              </span>
              <span>{m(locale, STEP_KEYS[step.id])}</span>
            </Link>
          </li>
        ))}
      </ul>

      {complete ? (
        <button type="button" onClick={dismiss} className="owner-onboarding__dismiss">
          {m(locale, "ownerOnboarding.dismiss")}
        </button>
      ) : null}
    </section>
  );
}
