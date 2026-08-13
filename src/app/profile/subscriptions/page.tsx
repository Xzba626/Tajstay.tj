import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireAuth";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import { SubscriptionsPrefsClient } from "@/components/profile/SubscriptionsPrefsClient";

export const dynamic = "force-dynamic";

export default async function ProfileSubscriptionsPage() {
  const locale = getLocale();
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) redirect("/auth/sign-in?next=/profile/subscriptions");

  return (
    <ProfileSubpageShell
      locale={locale}
      title={m(locale, "profile.subscriptions")}
      subtitle={m(locale, "profile.subscriptionsSubtitle")}
    >
      <SubscriptionsPrefsClient
        labels={{
          topics: m(locale, "profile.subscriptionsTopics"),
          channels: m(locale, "profile.subscriptionsChannels"),
          channelPush: m(locale, "profile.channelPush"),
          topicsList: [
            { key: "promo", label: m(locale, "profile.subPromo") },
            { key: "priceDrop", label: m(locale, "profile.subPriceDrop") },
            { key: "newHotels", label: m(locale, "profile.subNewHotels") },
            { key: "tstTips", label: m(locale, "profile.subTstTips") },
            { key: "bookingReminders", label: m(locale, "profile.subBookingReminders") },
            { key: "news", label: m(locale, "profile.subNews") }
          ],
          channelsList: [
            { key: "email", label: m(locale, "profile.channelEmail") },
            { key: "sms", label: m(locale, "profile.channelSms") },
            { key: "telegram", label: m(locale, "profile.channelTelegram") }
          ],
          pushLabels: {
            enable: m(locale, "pwa.pushEnable"),
            enabled: m(locale, "pwa.pushEnabled"),
            denied: m(locale, "pwa.pushDenied"),
            unsupported: m(locale, "pwa.pushUnsupported")
          }
        }}
      />
    </ProfileSubpageShell>
  );
}
