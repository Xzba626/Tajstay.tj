import Link from "next/link";
import type { ReactNode } from "react";
import { Hero3DSceneGate } from "@/components/effects/Hero3DSceneGate";
import { HeroTravelBackdrop } from "@/components/landing/HeroTravelBackdrop";

type Props = {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaSearch: string;
  ctaOwners: string;
  searchSectionLabel?: string;
  children?: ReactNode;
};

function FloatingCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`home-hero-float-card pointer-events-none text-left ${className ?? ""}`}>{children}</div>
  );
}

export function TajstayHero3D({
  heroBadge,
  heroTitle,
  heroSubtitle,
  ctaSearch,
  ctaOwners,
  searchSectionLabel = "Search stays",
  children
}: Props) {
  return (
    <div className="relative z-[1] mx-auto grid w-full max-w-7xl flex-1 items-center gap-8 px-4 py-6 sm:gap-10 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:py-10">
      <div className="relative z-[2] text-center lg:text-left">
        <div className="home-hero-badge mb-4">{heroBadge}</div>
        <h1 className="home-hero-title text-[clamp(2rem,5.5vw,3.35rem)] font-extrabold leading-[1.06] tracking-tight">
          {heroTitle}
        </h1>
        <p className="home-hero-subtitle mx-auto mt-4 max-w-xl text-base sm:text-lg lg:mx-0">{heroSubtitle}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start" role="group" aria-label="Primary actions">
          <Link href="/search" className="home-hero-cta-primary">
            {ctaSearch}
          </Link>
          <Link href="/profile/become-owner" className="home-hero-cta-secondary">
            {ctaOwners}
          </Link>
        </div>

        {children ? (
          <div className="home-hero-search-wrap hidden lg:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/80">{searchSectionLabel}</p>
            {children}
          </div>
        ) : null}
      </div>

      <div className="relative z-[1] mx-auto aspect-[4/3] w-full max-w-xl lg:max-w-none" aria-hidden>
        <div
          className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-slate-900/25 via-emerald-900/15 to-cyan-900/20 blur-2xl"
          aria-hidden
        />
        <HeroTravelBackdrop />
        <Hero3DSceneGate className="absolute inset-0 rounded-[2rem] ring-1 ring-white/10 mix-blend-screen opacity-70" />
        <FloatingCard className="absolute left-3 top-5 animate-[float-subtle_7s_ease-in-out_infinite] sm:left-4 sm:top-6">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200/90">Dushanbe</div>
          <div className="mt-0.5 text-sm font-semibold text-white">4.9 ★ · от 280 TJS</div>
        </FloatingCard>
        <FloatingCard className="absolute bottom-6 right-2 w-[9.5rem] animate-[float-subtle_8s_ease-in-out_infinite_1s] sm:bottom-8">
          <div className="text-[10px] text-slate-300">Бронь подтверждена</div>
          <div className="mt-1 text-xs font-bold text-emerald-100">TJ-4821</div>
        </FloatingCard>
      </div>

      {children ? (
        <div className="home-hero-search-wrap z-[2] lg:col-span-2 lg:hidden">
          {children}
        </div>
      ) : null}
    </div>
  );
}
