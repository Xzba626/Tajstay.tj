"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { FieldHelp } from "@/components/ui/FieldHelp";

type Props = {
  backHref: string;
  backLabel: string;
  title: string;
  hint?: string;
  helpKey?: string;
  locale?: Locale;
  children: ReactNode;
};

/** Shared layout for profile account sub-screens (email, phone, telegram, password). */
export function ProfileAccountScreen({ backHref, backLabel, title, hint, helpKey, locale, children }: Props) {
  return (
    <div className="mockup-screen profile-account-screen">
      <Link href={backHref} className="profile-account-screen__back">
        ← {backLabel}
      </Link>
      <h1 className="mockup-screen__title">{title}</h1>
      {hint || (helpKey && locale) ? (
        <div className="profile-account-screen__hint-row">
          {hint ? <p className="profile-account-screen__hint">{hint}</p> : null}
          {helpKey && locale ? <FieldHelp locale={locale} helpKey={helpKey} /> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
