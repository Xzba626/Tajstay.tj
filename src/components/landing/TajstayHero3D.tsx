import Link from "next/link";

type Props = {
  heroTitle: string;
  trustPoints: string[];
  trustHighlightsAriaLabel: string;
};

/** Premium travel hero — clean white canvas, single headline + search only, no eyebrow badge, no subtitle, no duplicate CTA */
export function TajstayHero3D({ heroTitle, trustPoints, trustHighlightsAriaLabel }: Props) {
  return (
    <div className="home-hero-layout relative z-[1] flex w-full flex-1 items-center">
      <div className="mx-auto max-w-3xl text-center lg:text-left">
        <h1 className="home-hero-title font-[family-name:var(--taj-font-ui)] text-[clamp(1.5rem,5vw,2.25rem)] font-bold leading-[1.15] tracking-tight lg:font-[family-name:var(--taj-font-display)] lg:text-[clamp(1.75rem,4vw,2.375rem)]">
          {heroTitle}
        </h1>

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
