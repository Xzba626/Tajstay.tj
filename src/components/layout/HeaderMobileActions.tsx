"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { AuthEntryModal } from "@/components/layout/AuthEntryModal";

type Props = {
  locale: Locale;
  user: { name: string; image: string | null; telegramPhotoUrl: string | null } | null;
};

// This component only renders inside the Consumer shell's Header, which the root layout no
// longer mounts on Admin/Owner routes (see src/middleware.ts x-tajstay-shell + src/app/layout.tsx
// shell isolation). Admin/Owner mobile have their own single "Ещё" bottom-nav trigger for the
// More drawer (AdminSidebar.tsx / OwnerSidebar.tsx) — this file previously also rendered a
// hamburger for those two routes via openWorkspaceDrawer(), a second trigger for the same drawer
// that's exactly the duplicate-navigation bug flagged from a production screenshot (that
// deployment predates the shell-isolation fix). Removed rather than left as dead-but-reachable
// code, so a future accidental regression in the shell-isolation check can't silently resurrect
// the duplicate hamburger.
export function HeaderMobileActions({ locale, user }: Props) {
  const [authOpen, setAuthOpen] = useState(false);

  if (user) {
    return (
      <Link
        href="/profile"
        className="header-mobile-avatar"
        aria-label={m(locale, "userMenu.profile")}
      >
        <ProfileAvatar
          name={user.name}
          imageUrl={user.image ?? user.telegramPhotoUrl}
          size="sm"
        />
      </Link>
    );
  }

  return (
    <>
      <button type="button" className="header-auth-signin-mobile" onClick={() => setAuthOpen(true)}>
        {m(locale, "header.signIn")}
      </button>
      <AuthEntryModal open={authOpen} onClose={() => setAuthOpen(false)} locale={locale} />
    </>
  );
}
