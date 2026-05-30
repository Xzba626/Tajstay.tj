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
