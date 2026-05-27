import type { AuthPromoFeaturedHotel } from "@/lib/services/authPromoHotel";
import type { AuthPromoLabels } from "@/components/auth/AuthPromoPanel";

type Props = {
  labels: AuthPromoLabels;
  featuredHotel?: AuthPromoFeaturedHotel | null;
};

export function TajAuthPromoPanel({ labels: L, featuredHotel }: Props) {
  const priceFrom = featuredHotel
    ? L.previewPriceFrom.replace("{price}", String(Math.round(featuredHotel.minPrice)))
    : null;

  return (
    <aside className="taj-promo-card hidden lg:block">
      <div className="taj-promo-overlay" aria-hidden />

      <div className="taj-promo-content">
        <div className="taj-safe-badge">
          <ShieldIcon />
          <span>{L.badge}</span>
        </div>

        <div className="taj-promo-heading">
          <h2>
            {L.headingLine1}
            <span>{L.headingAccent}</span>
          </h2>
          <p>{L.subtitle}</p>
        </div>

        <div className="taj-benefits-grid">
          <article className="taj-benefit-card">
            <div className="taj-benefit-icon">
              <ShieldIcon />
            </div>
            <h3>{L.benefit1Title}</h3>
            <p>{L.benefit1Text}</p>
          </article>
          <article className="taj-benefit-card">
            <div className="taj-benefit-icon">
              <CardIcon />
            </div>
            <h3>{L.benefit2Title}</h3>
            <p>{L.benefit2Text}</p>
          </article>
          <article className="taj-benefit-card">
            <div className="taj-benefit-icon">
              <HeadphonesIcon />
            </div>
            <h3>{L.benefit3Title}</h3>
            <p>{L.benefit3Text}</p>
          </article>
        </div>

        {featuredHotel ? (
          <div className="taj-hotel-preview">
            <div
              className="taj-hotel-image"
              style={
                featuredHotel.imageUrl
                  ? { backgroundImage: `url("${featuredHotel.imageUrl}")` }
                  : undefined
              }
            />
            <div className="taj-hotel-info">
              <div className="taj-hotel-title-row">
                <h3>{featuredHotel.name}</h3>
                <span>{L.previewGuestChoice}</span>
              </div>
              <p className="taj-location">
                <PinIcon />
                {featuredHotel.city}
              </p>
              <p className="taj-rating">
                <StarIcon />
                <b>{featuredHotel.rating.toFixed(1)}</b>
              </p>
              {priceFrom ? <p className="taj-price">{priceFrom}</p> : null}
            </div>
          </div>
        ) : (
          <div className="taj-hotel-preview taj-hotel-preview--abstract">
            <div className="taj-hotel-image taj-hotel-image--abstract" />
            <div className="taj-hotel-info">
              <h3 className="taj-hotel-abstract-title">{L.previewAbstractTitle}</h3>
              <p className="taj-hotel-abstract-line">
                <StarIcon />
                {L.previewAbstractRating}
              </p>
              <p className="taj-hotel-abstract-line">
                <ZapIcon />
                {L.previewAbstractConfirm}
              </p>
            </div>
          </div>
        )}

        <div className="taj-trust-strip">
          <div className="taj-trust-item">
            <ShieldIcon />
            <span>{L.trustSsl}</span>
          </div>
          <div className="taj-trust-item">
            <BadgeIcon />
            <span>{L.trustVerified}</span>
          </div>
          <div className="taj-trust-item">
            <BriefcaseIcon />
            <span>{L.trustNoFees}</span>
          </div>
          <div className="taj-trust-item">
            <ZapIcon />
            <span>{L.trustInstant}</span>
          </div>
        </div>
      </div>
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

function CardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
      <path d="M3 14a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2Zm16 0a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.9 6.9 7.4.6-5.6 4.8 1.7 7.2L12 17.8l-6.4 3.7 1.7-7.2L1.7 9.5l7.4-.6L12 2z" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2l2.4 4.8 5.4.8-3.9 3.8.9 5.3L12 14.3l-4.8 2.4.9-5.3L4.2 7.6l5.4-.8L12 2Z" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z" />
    </svg>
  );
}
