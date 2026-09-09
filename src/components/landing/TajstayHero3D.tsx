import Link from "next/link";

type Props = {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaSearch: string;
  trustPoints: string[];
  trustHighlightsAriaLabel: string;
  primaryActionsAriaLabel: string;
};

/** Premium travel hero — clean white canvas, text + search only, no decorative visual layer */
export function TajstayHero3D({
  heroBadge,
  heroTitle,
  heroSubtitle,
  ctaSearch,
  trustPoints,
  trustHighlightsAriaLabel,
  primaryActionsAriaLabel
}: Props) {
  return (
    <div className="home-hero-layout relative z-[1] flex w-full flex-1 items-center">
      <div className="mx-auto max-w-3xl text-center lg:text-left">
        <div className="home-hero-badge mb-1.5 inline-flex md:mb-3">{heroBadge}</div>
        <h1 className="home-hero-title font-[family-name:var(--taj-font-ui)] text-[clamp(1.625rem,6.5vw,2.75rem)] font-bold leading-[1.08] tracking-tight lg:font-[family-name:var(--taj-font-display)] lg:text-[clamp(1.875rem,5.2vw,2.875rem)]">
          {heroTitle}
        </h1>
        <p className="home-hero-subtitle mx-auto mt-3 hidden max-w-xl text-base leading-relaxed sm:text-lg md:block lg:mx-0">
          {heroSubtitle}
        </p>

        <div className="mt-6 hidden justify-center md:flex lg:justify-start" role="group" aria-label={primaryActionsAriaLabel}>
          <Link href="#home-search" className="taj-btn taj-btn--primary taj-btn--lg sm:w-auto sm:min-w-[14rem]">
            {ctaSearch}
          </Link>
        </div>

        <p className="home-hero-trust-compact mt-2 md:hidden" aria-label={trustHighlightsAriaLabel}>
          {trustPoints.join(" · ")}
        </p>

        <ul className="home-hero-trust hidden md:flex" aria-label={trustHighlightsAriaLabel}>
          {trustPoints.map((point) => (
            <li key={point} className="home-hero-trust__item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
