import Link from "next/link";
import { HeroTravelBackdrop } from "@/components/landing/HeroTravelBackdrop";

type Props = {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaSearch: string;
};

/** Premium travel hero — no WebGL/3D; static emerald visual on desktop only */
export function TajstayHero3D({ heroBadge, heroTitle, heroSubtitle, ctaSearch }: Props) {
  return (
    <div className="relative z-[1] grid w-full flex-1 items-center gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-10 lg:py-12">
      <div className="text-center lg:text-left">
        <div className="home-hero-badge mb-4 inline-flex">{heroBadge}</div>
        <h1 className="home-hero-title font-[family-name:var(--taj-font-ui)] text-[clamp(1.875rem,5.5vw,2.75rem)] font-bold leading-[1.1] tracking-tight lg:font-[family-name:var(--taj-font-display)]">
          {heroTitle}
        </h1>
        <p className="home-hero-subtitle mx-auto mt-4 max-w-xl text-base leading-relaxed sm:text-lg lg:mx-0">{heroSubtitle}</p>

        <div className="mt-8 flex justify-center lg:justify-start" role="group" aria-label="Primary actions">
          <Link href="#home-search" className="taj-btn taj-btn--primary taj-btn--lg taj-btn--full sm:w-auto sm:min-w-[14rem]">
            {ctaSearch}
          </Link>
        </div>
      </div>

      <div className="home-hero-visual mx-auto w-full max-w-md lg:max-w-none" aria-hidden>
        <div className="home-hero-visual__frame">
          <HeroTravelBackdrop />
        </div>
      </div>
    </div>
  );
}
