import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";

export type AuthPromoLabels = {
  badge: string;
  title: string;
  subtitle: string;
  stat1: string;
  stat2: string;
  stat3: string;
  previewHotel: string;
  previewCity: string;
  previewRating: string;
  previewDates: string;
  previewPrice: string;
  previewCta: string;
  trustSsl: string;
  trustVerified: string;
  trustNoFees: string;
  trustInstant: string;
  footerCopyright: string;
  footerPrivacy: string;
  footerTerms: string;
};

type Props = {
  labels: AuthPromoLabels;
  localePrefix?: string;
};

export function AuthPromoPanel({ labels: L }: Props) {
  return (
    <aside className="auth-promo" aria-label={L.title}>
      <div className="auth-promo__bg">
        <div className="auth-promo__bg-fallback" aria-hidden>
          <div className="auth-promo__mountains" />
        </div>
        <div className="auth-promo__overlay" aria-hidden />
      </div>

      <div className="auth-promo__inner">
        <div className="auth-promo__logo-card">
          <BrandMark href="/" nameClassName="text-sm text-white" className="rounded-lg" />
        </div>

        <span className="auth-promo__badge">
          <ShieldMiniIcon />
          {L.badge}
        </span>

        <h1 className="auth-promo__title">{L.title}</h1>
        <p className="auth-promo__subtitle">{L.subtitle}</p>

        <div className="auth-promo__stats">
          <div className="auth-promo__stat">
            <strong>{L.stat1}</strong>
          </div>
          <div className="auth-promo__stat">
            <strong>{L.stat2}</strong>
          </div>
          <div className="auth-promo__stat">
            <strong>{L.stat3}</strong>
          </div>
        </div>

        <div className="auth-promo__preview" aria-hidden>
          <div className="auth-promo__preview-thumb" />
          <div className="auth-promo__preview-body">
            <h3>{L.previewHotel}</h3>
            <p className="auth-promo__preview-meta">{L.previewCity}</p>
            <div className="auth-promo__preview-row">
              <span className="auth-promo__rating">
                <StarIcon />
                {L.previewRating}
              </span>
              <span>{L.previewDates}</span>
            </div>
            <p className="auth-promo__preview-price">{L.previewPrice}</p>
            <span className="auth-promo__preview-cta">{L.previewCta}</span>
          </div>
        </div>

        <footer className="auth-promo__footer">
          <span>{L.trustSsl}</span>
          <span>{L.trustVerified}</span>
          <span>{L.trustNoFees}</span>
          <span>{L.trustInstant}</span>
          <span className="w-full basis-full" />
          <span>{L.footerCopyright}</span>
          <Link href="/policy">{L.footerPrivacy}</Link>
          <Link href="/terms">{L.footerTerms}</Link>
        </footer>
      </div>
    </aside>
  );
}

function ShieldMiniIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3 4 7v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.9 6.9 7.4.6-5.6 4.8 1.7 7.2L12 17.8l-6.4 3.7 1.7-7.2L1.7 9.5l7.4-.6L12 2z" />
    </svg>
  );
}
