import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";
import { maskPhone } from "@/lib/format/maskPhone";
import { maskEmail, formatTelegram } from "@/lib/format/maskEmail";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PersonalNameEditor } from "@/components/profile/PersonalNameEditor";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * MASTER COMPLETION BLOCK, PHASE B — real defect found: Phone/Email/Telegram were rendered as
 * plain, non-interactive `InfoRow`s here with NO link to /profile/phone, /profile/email, or
 * /profile/telegram — all three routes existed but were unreachable from normal navigation, a
 * dead-end confirmed by reading this file (no <Link> anywhere near them). Now real links.
 * Note: /profile/email and /profile/phone are themselves honest "Coming soon" stubs for the
 * actual change flow (self-labeled in the UI, not a hidden defect) — the verification-code/OTP
 * systems behind them are a separate, larger, security-sensitive build (5-minute TTL email code,
 * phone cooldown policy) not rushed into this pass. Making them reachable is still a real fix:
 * a user can now at least see the correct "coming soon" state instead of hitting a dead end.
 */
function InfoRow({ label, value, hint, href }: { label: string; value: string; hint?: string; href: string }) {
  return (
    <Link href={href} className="profile-info-row profile-info-row--link">
      <span className="profile-info-row__label">{label}</span>
      <span className="profile-info-row__value">{value}</span>
      {hint ? <span className="profile-info-row__hint">{hint}</span> : null}
      <ChevronRight size={16} className="profile-info-row__chevron" aria-hidden />
    </Link>
  );
}

export default async function ProfilePersonalPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/personal");

  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full) redirect("/profile");

  const nameParts = full.name.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? full.name;
  const lastName = nameParts.slice(1).join(" ");
  const hasPhone = Boolean(full.phone && !isPlaceholderAccountPhone(full.phone));
  const phoneDisplay = hasPhone ? maskPhone(full.phone) : m(locale, "profile.phoneNotSet");
  const emailDisplay = maskEmail(full.email) ?? m(locale, "profile.emailNotSet");
  const telegramDisplay = formatTelegram(full.telegramUsername, full.telegramId) ?? m(locale, "profile.telegramNotConnected");
  const emailVerified = Boolean(full.emailVerified || (full.email?.trim() && full.verified));

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.personalInfo")} subtitle={m(locale, "profile.personalSubtitle")}>
      <div className="profile-panel flex items-center gap-4">
        <ProfileAvatar name={full.name} imageUrl={full.image ?? full.telegramPhotoUrl} />
        <div>
          <p className="text-lg font-semibold text-white">{full.name}</p>
          <p className="text-sm text-white/80">{m(locale, "profile.personalPhotoHint")}</p>
        </div>
      </div>

      <div className="profile-panel profile-panel--stack">
        <PersonalNameEditor
          firstName={firstName}
          lastName={lastName}
          labels={{
            firstName: m(locale, "profile.firstName"),
            lastName: m(locale, "profile.lastName"),
            edit: m(locale, "profile.nameEdit"),
            save: m(locale, "profile.nameSave"),
            saving: m(locale, "profile.nameSaving"),
            cancel: m(locale, "profile.nameCancel"),
            error: m(locale, "profile.nameUpdateError"),
            notSet: m(locale, "profile.notSet")
          }}
        />
        <InfoRow
          href="/profile/phone"
          label={m(locale, "profile.phone")}
          value={phoneDisplay}
          hint={hasPhone && full.phoneVerified ? m(locale, "profile.statusVerified") : m(locale, "profile.statusPending")}
        />
        <InfoRow
          href="/profile/email"
          label={m(locale, "profile.email")}
          value={emailDisplay}
          hint={full.email ? (emailVerified ? m(locale, "profile.statusVerified") : m(locale, "profile.statusNotVerified")) : undefined}
        />
        <InfoRow href="/profile/telegram" label={m(locale, "profile.telegram")} value={telegramDisplay} />
      </div>
    </ProfileSubpageShell>
  );
}
