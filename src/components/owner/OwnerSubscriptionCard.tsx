import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { formatStayDay } from "@/lib/i18n/format";
import { StatusBadge } from "@/components/ui/StatusBadge";

type SubscriptionLike = {
  status: string;
  trialEndAt: Date;
  currentPeriodEnd: Date | null;
} | null;

function subscriptionVariant(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "TRIAL") return "neutral";
  if (status === "PAST_DUE" || status === "SUSPENDED") return "danger";
  return "neutral";
}

export function OwnerSubscriptionCard({
  locale,
  subscription
}: {
  locale: Locale;
  subscription: SubscriptionLike;
}) {
  if (!subscription) {
    // No subscription row yet means this Hotel has never been through an APPROVED transition
    // since the subscription domain was introduced - shown only for a hotelId that IS approved
    // (see caller), so this is a transitional/legacy case, not an error state.
    return null;
  }

  const label = m(locale, `owner.subscriptionStatus.${subscription.status}`);
  const dateLabel =
    subscription.status === "TRIAL"
      ? m(locale, "owner.subscriptionTrialUntil", { date: formatStayDay(locale, subscription.trialEndAt) })
      : subscription.currentPeriodEnd
        ? m(locale, "owner.subscriptionActiveUntil", { date: formatStayDay(locale, subscription.currentPeriodEnd) })
        : null;

  return (
    <div className="owner-subscription-card">
      <div className="owner-subscription-card__row">
        <span className="owner-subscription-card__title">{m(locale, "owner.subscriptionTitle")}</span>
        <StatusBadge variant={subscriptionVariant(subscription.status)}>{label}</StatusBadge>
      </div>
      {dateLabel ? <p className="owner-subscription-card__hint">{dateLabel}</p> : null}
    </div>
  );
}
