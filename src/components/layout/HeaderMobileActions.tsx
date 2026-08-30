"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { AuthEntryModal } from "@/components/layout/AuthEntryModal";
import { openWorkspaceDrawer } from "@/lib/workspace/workspace-nav-bridge";

type Props = {
  locale: Locale;
  user: { name: string; image: string | null; telegramPhotoUrl: string | null } | null;
};

export function HeaderMobileActions({ locale, user }: Props) {
  const [authOpen, setAuthOpen] = useState(false);
  const pathname = usePathname();
  const isAdminWorkspace = pathname.startsWith("/dashboard/admin");
  const isOwnerWorkspace = pathname.startsWith("/dashboard/owner");

  if (user && isAdminWorkspace) {
    return (
      <button
        type="button"
        className="header-workspace-menu"
        aria-label={m(locale, "admin.mobileMore")}
        onClick={() => openWorkspaceDrawer("admin")}
      >
        <Menu size={22} aria-hidden />
      </button>
    );
  }

  if (user && isOwnerWorkspace) {
    return (
      <button
        type="button"
        className="header-workspace-menu"
        aria-label={m(locale, "owner.mobileMore")}
        onClick={() => openWorkspaceDrawer("owner")}
      >
        <Menu size={22} aria-hidden />
      </button>
    );
  }

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
