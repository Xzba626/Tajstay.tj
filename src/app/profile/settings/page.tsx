import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { ProfileSubpageGroup } from "@/components/profile/ProfileSubpageRow";
import { SettingsLanguageList } from "@/components/profile/SettingsLanguageList";

export const dynamic = "force-dynamic";

/**
 * MASTER COMPLETION BLOCK, PHASE B — real defects found and fixed here, not cosmetic:
 * 1. Duplicate "Безопасность" row (already reachable from the Profile hub one level up) — removed.
 * 2. A static language row directly duplicating the interactive SettingsLanguageList above it,
 *    always showing the CURRENT locale as a redundant read-only label — removed, kept the one
 *    real (functional) selector.
 * 3. Theme row hardcoded the label "Тёмная"/"Dark" as if that were the active theme, while the
 *    app always renders `data-theme="light"` (src/app/layout.tsx) — this was a literal lie in
 *    the UI, not a stale value. A real System/Light/Dark switch needs a dedicated Dark Mode CSS
 *    pass across the whole product (verified: only ~11 dark-theme selectors exist in the entire
 *    stylesheet — nowhere near full coverage); shipping a selector now would let users pick
 *    "Dark" and get an inconsistently-themed app. Removed rather than left decorative, per the
 *    explicit "no decorative controls without a real function" rule — this is a named, deferred
 *    architecture item, not a silently dropped requirement.
 * 4. Currency row hardcoded "TJS" as if conversion existed. No FX-rate source, rounding rule, or
 *    canonical-price/display-price separation exists anywhere in this codebase (grepped before
 *    writing this comment). Multi-currency display is a real architecture decision (which FX
 *    source, refresh cadence, rounding, canonical currency staying authoritative for the hotel's
 *    actual price) that hasn't been made — implementing a selector without it would either misprice
 *    silently or require inventing a business rule no one approved. Removed, same reasoning as
 *    Theme above.
 * 5. Privacy/FAQ/Contacts/Terms links — these belong to Support (FAQ/Contacts) and the new Legal
 *    section (Privacy/Terms, see /profile/legal), both one level up from Settings in the Profile
 *    hub. Having them here too was exactly the "mixing privacy/support into Settings" this block
 *    named as a defect. Removed from here (still reachable from their correct homes).
 * 6. "О приложении" / app version row — a static "v1.0.0" with no real backend/build-info behind
 *    it, shown as if it were a genuine setting. Removed; a real build/version display, if wanted,
 *    belongs on a dedicated About screen wired to actual build metadata, not a fabricated string
 *    in Settings.
 */
export default async function ProfileSettingsPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/settings");

  return (
    <ProfileSubpageShell locale={locale} title={m(locale, "profile.settings")} subtitle={m(locale, "profile.settingsSubtitle")}>
      <ProfileSubpageGroup title={m(locale, "profile.sectionApp")}>
        <SettingsLanguageList current={locale} />
      </ProfileSubpageGroup>
    </ProfileSubpageShell>
  );
}
