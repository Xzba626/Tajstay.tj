import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { NotificationPreferencesClient } from "@/components/profile/NotificationPreferencesClient";
import { getNotificationPreference } from "@/lib/notifications/preferences";
import { PushSubscribeButton } from "@/components/pwa/PushSubscribeButton";

export const dynamic = "force-dynamic";

/**
 * MASTER COMPLETION BLOCK, PHASE B: this route previously rendered `SubscriptionsPrefsClient`, a
 * topic/channel matrix (Promotions/Price drops/New hotels/TST tips/Booking reminders/News ×
 * Email/SMS/Telegram) that only wrote to `localStorage` — toggling anything had zero server-side
 * effect. Replaced with two real, backend-enforced categories matching notification types that
 * actually exist and are sent in this codebase (see src/lib/notifications/preferences.ts): every
 * every AUTH_ and SECURITY_ prefixed type, and every booking/payment-related type. No "Promotions" category is
 * exposed — no promotional-notification sending mechanism exists anywhere in this codebase yet, so
 * a toggle for it would itself be exactly the "decorative control with no real function" this
 * completion pass is required to eliminate, not add.
 */
export default async function ProfileSubscriptionsPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/subscriptions");

  const initial = await getNotificationPreference(user.id);

  return (
    <ProfileSubpageShell
      locale={locale}
      title={m(locale, "profile.notificationSettings")}
      subtitle={m(locale, "profile.notificationSettingsSubtitle")}
    >
      <NotificationPreferencesClient
        initial={initial}
        labels={{
          groupTitle: m(locale, "profile.notificationCategoriesTitle"),
          security: m(locale, "profile.notificationCategorySecurity"),
          securityHint: m(locale, "profile.notificationCategorySecurityHint"),
          bookingUpdates: m(locale, "profile.notificationCategoryBooking"),
          bookingUpdatesHint: m(locale, "profile.notificationCategoryBookingHint"),
          saveError: m(locale, "profile.notificationSaveError")
        }}
      />
      <div className="profile-subpage-group">
        <h2 className="profile-subpage-group__title">{m(locale, "profile.subscriptionsChannels")}</h2>
        <div className="profile-subpage-group__body">
          <div className="profile-subpage-toggle profile-subpage-toggle--action">
            <span className="profile-subpage-toggle__label">{m(locale, "profile.channelPush")}</span>
            <PushSubscribeButton
              labels={{
                enable: m(locale, "pwa.pushEnable"),
                enabled: m(locale, "pwa.pushEnabled"),
                denied: m(locale, "pwa.pushDenied"),
                unsupported: m(locale, "pwa.pushUnsupported")
              }}
            />
          </div>
        </div>
      </div>
    </ProfileSubpageShell>
  );
}
