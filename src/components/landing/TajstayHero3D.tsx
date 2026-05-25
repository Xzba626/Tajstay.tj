import Link from "next/link";
import { HeroTravelPreview } from "@/components/landing/HeroTravelPreview";

type Props = {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaSearch: string;
  trustPoints: string[];
};

/** Premium travel hero — dark emerald, static visual on tablet+ */
export function TajstayHero3D({ heroBadge, heroTitle, heroSubtitle, ctaSearch, trustPoints }: Props) {
  return (
    <div className="home-hero-layout relative z-[1] grid w-full flex-1 items-center lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-8">
      <div className="text-center lg:text-left">
        <div className="home-hero-badge mb-2 inline-flex md:mb-3">{heroBadge}</div>
        <h1 className="home-hero-title font-[family-name:var(--taj-font-ui)] font-bold tracking-tight lg:font-[family-name:var(--taj-font-display)] lg:text-[clamp(1.875rem,5.2vw,2.875rem)] lg:leading-[1.08]">
          {heroTitle}
        </h1>
        <p className="home-hero-subtitle mx-auto mt-3 hidden max-w-xl text-base leading-relaxed sm:text-lg md:block lg:mx-0">
          {heroSubtitle}
        </p>

        <div className="mt-6 hidden justify-center md:flex lg:justify-start" role="group" aria-label="Primary actions">
          <Link href="#home-search" className="taj-btn taj-btn--primary taj-btn--lg sm:w-auto sm:min-w-[14rem]">
            {ctaSearch}
          </Link>
        </div>

        <p className="home-hero-trust-compact md:hidden" aria-label="Trust highlights">
          {trustPoints.join(" · ")}
        </p>

        <ul className="home-hero-trust hidden md:flex" aria-label="Trust highlights">
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

      <div className="home-hero-visual mx-auto w-full max-w-md lg:max-w-none" aria-hidden>
        <div className="home-hero-visual__frame">
          <HeroTravelPreview />
        </div>
      </div>
    </div>
  );
}
