"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  backHref: string;
  backLabel: string;
  title: string;
  hint?: string;
  children: ReactNode;
};

/** Shared layout for profile account sub-screens (email, phone, telegram, password). */
export function ProfileAccountScreen({ backHref, backLabel, title, hint, children }: Props) {
  return (
    <div className="mockup-screen profile-account-screen">
      <Link href={backHref} className="profile-account-screen__back">
        ← {backLabel}
      </Link>
      <h1 className="mockup-screen__title">{title}</h1>
      {hint ? <p className="profile-account-screen__hint">{hint}</p> : null}
      {children}
    </div>
  );
}
