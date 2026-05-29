"use client";

import Link from "next/link";
import { ChevronRight, FileText, HelpCircle, LogOut, Settings, Shield, Bell } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import LogoutButton from "@/components/LogoutButton";

type Props = {
  locale: Locale;
  role: string;
  logoutLabel: string;
};

function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(10);
  }
}

export function ProfileActionsList({ locale, role, logoutLabel }: Props) {
  const items = [
    { href: "/profile", icon: Settings, label: m(locale, "profile.actionsSettings") },
    { href: "/notifications", icon: Bell, label: m(locale, "profile.actionsNotifications") },
    { href: "/faq", icon: HelpCircle, label: m(locale, "profile.actionsHelp") },
    { href: "/policy", icon: FileText, label: m(locale, "profile.actionsPolicy") }
  ];

  if (role === "OWNER") {
    items.unshift({
      href: "/dashboard/owner",
      icon: Shield,
      label: m(locale, "profile.navOwner")
    });
  }

  if (role === "ADMIN") {
    items.unshift({
      href: "/dashboard/admin",
      icon: Shield,
      label: m(locale, "profile.navAdmin")
    });
  }

  return (
    <nav className="profile-actions" aria-label={m(locale, "profile.actionsTitle")}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="profile-actions__item"
            onClick={() => haptic()}
          >
            <Icon size={18} className="shrink-0 text-[var(--green-accent)]" aria-hidden />
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            <ChevronRight size={18} className="text-[var(--text-muted)]" aria-hidden />
          </Link>
        );
      })}
      <div className="profile-actions__item border-t border-[var(--border)]">
        <LogoutButton label={logoutLabel} variant="row" />
      </div>
    </nav>
  );
}
