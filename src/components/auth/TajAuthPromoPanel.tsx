import type { AuthPromoFeaturedHotel } from "@/lib/services/authPromoHotel";
import type { AuthPromoLabels } from "@/components/auth/AuthPromoPanel";

type Props = {
  labels: AuthPromoLabels;
  featuredHotel?: AuthPromoFeaturedHotel | null;
};

/**
 * Deliberately compact: the visitor came here to sign in, not read a landing page. Canonical
 * #0F7A4D background, white content only - no nested dark cards, no second green, no unverified
 * marketing claims (see auth.trust* labels, which were trimmed to what the product actually does).
 */
export function TajAuthPromoPanel({ labels: L }: Props) {
  return (
    <aside className="taj-auth-panel-v2 hidden lg:flex">
      <div className="taj-auth-panel-v2__badge">
        <ShieldIcon />
        <span>{L.badge}</span>
      </div>

      <h2 className="taj-auth-panel-v2__heading">
        {L.headingLine1} {L.headingAccent}
      </h2>
      <p className="taj-auth-panel-v2__subtitle">{L.subtitle}</p>

      <ul className="taj-auth-panel-v2__list">
        <li>
          <CheckIcon />
          <span>{L.benefit1Title}</span>
        </li>
        <li>
          <CheckIcon />
          <span>{L.benefit2Title}</span>
        </li>
        <li>
          <CheckIcon />
          <span>{L.benefit3Title}</span>
        </li>
      </ul>
    </aside>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3 4 7v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
