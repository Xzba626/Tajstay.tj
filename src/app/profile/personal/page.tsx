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

export const dynamic = "force-dynamic";

function InfoRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="profile-info-row">
      <span className="profile-info-row__label">{label}</span>
      <span className="profile-info-row__value">{value}</span>
      {hint ? <span className="profile-info-row__hint">{hint}</span> : null}
    </div>
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
          <p className="text-lg font-semibold text-[var(--ts-text-title,#0f172a)]">{full.name}</p>
          <p className="text-sm text-[var(--ts-text-muted,#475569)]">{m(locale, "profile.personalPhotoHint")}</p>
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
          label={m(locale, "profile.phone")}
          value={phoneDisplay}
          hint={hasPhone && full.phoneVerified ? m(locale, "profile.statusVerified") : m(locale, "profile.statusPending")}
        />
        <InfoRow
          label={m(locale, "profile.email")}
          value={emailDisplay}
          hint={full.email ? (emailVerified ? m(locale, "profile.statusVerified") : m(locale, "profile.statusNotVerified")) : undefined}
        />
        <InfoRow label={m(locale, "profile.telegram")} value={telegramDisplay} />
      </div>
    </ProfileSubpageShell>
  );
}
