"use client";

import Link from "next/link";
import {
  ChevronRight,
  CreditCard,
  Database,
  FileText,
  HelpCircle,
  Info,
  Shield,
  User,
  Bell,
  Building2
} from "lucide-react";
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

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="profile-menu-section">
      <h2 className="profile-menu-section__title">{title}</h2>
      <nav className="profile-actions">{children}</nav>
    </section>
  );
}

function MenuItem({ href, icon: Icon, label }: { href: string; icon: typeof User; label: string }) {
  return (
    <Link href={href} className="profile-actions__item" onClick={() => haptic()}>
      <Icon size={18} className="shrink-0 text-[var(--text-secondary)]" aria-hidden />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight size={18} className="text-[var(--text-muted)]" aria-hidden />
    </Link>
  );
}

export function ProfileMenuSections({ locale, role, logoutLabel }: Props) {
  return (
    <div className="space-y-4">
      <MenuSection title={m(locale, "profile.sectionAccount")}>
        <MenuItem href="/profile/personal" icon={User} label={m(locale, "profile.personalInfo")} />
        <MenuItem href="/profile/security" icon={Shield} label={m(locale, "profile.security")} />
        <MenuItem href="/profile/payments" icon={CreditCard} label={m(locale, "profile.payments")} />
        <MenuItem href="/notifications" icon={Bell} label={m(locale, "profile.actionsNotifications")} />
      </MenuSection>

      {role === "GUEST" ? (
        <MenuSection title={m(locale, "profile.sectionHost")}>
          <MenuItem href="/profile/become-owner" icon={Building2} label={m(locale, "profile.becomeOwner")} />
        </MenuSection>
      ) : null}

      {role === "OWNER" ? (
        <MenuSection title={m(locale, "profile.sectionHost")}>
          <MenuItem href="/dashboard/owner" icon={Building2} label={m(locale, "profile.navOwner")} />
        </MenuSection>
      ) : null}

      {role === "ADMIN" ? (
        <MenuSection title={m(locale, "profile.sectionAdmin")}>
          <MenuItem href="/dashboard/admin" icon={Shield} label={m(locale, "profile.navAdmin")} />
        </MenuSection>
      ) : null}

      <MenuSection title={m(locale, "profile.sectionSupport")}>
        <MenuItem href="/faq" icon={HelpCircle} label={m(locale, "profile.actionsHelp")} />
        <MenuItem href="/about" icon={Info} label={m(locale, "profile.aboutApp")} />
        <MenuItem href="/profile/data" icon={Database} label={m(locale, "profile.myData")} />
        <MenuItem href="/policy" icon={FileText} label={m(locale, "profile.actionsPolicy")} />
      </MenuSection>

      <nav className="profile-actions profile-actions--logout">
        <LogoutButton label={logoutLabel} variant="row" />
      </nav>
    </div>
  );
}
