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
  children?: ReactNode;
};

function FloatingCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`pointer-events-none rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left shadow-xl backdrop-blur-md ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function TajstayHero3D({ heroBadge, heroTitle, heroSubtitle, ctaSearch, ctaOwners, children }: Props) {
  return (
    <div className="relative mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:py-12">
      <div className="relative z-[2] text-center lg:text-left">
        <div className="mb-3 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
          {heroBadge}
        </div>
        <h1 className="text-[clamp(2rem,5.5vw,3.25rem)] font-extrabold leading-[1.08] tracking-tight text-[#F0EDE8] drop-shadow-lg">
          {heroTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-[rgba(240,237,232,0.62)] sm:text-base lg:mx-0">{heroSubtitle}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
          <Link
            href="/search"
            className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-emerald-500 px-8 py-3.5 text-sm font-bold text-[#0D1610] shadow-[0_0_28px_rgba(34,197,94,0.28)] transition hover:brightness-105"
          >
            {ctaSearch}
          </Link>
          <Link
            href="/profile/become-owner"
            className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-emerald-400/40 px-6 py-3.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/10"
          >
            {ctaOwners}
          </Link>
        </div>
        {children ? <div className="mt-8 hidden lg:block">{children}</div> : null}
      </div>

      <div className="relative z-[1] mx-auto aspect-[4/3] w-full max-w-xl lg:max-w-none">
        <div
          className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-slate-900/40 via-emerald-900/20 to-cyan-900/30 blur-2xl"
          aria-hidden
        />
        <HeroTravelBackdrop />
        <Hero3DSceneGate className="absolute inset-0 rounded-[2rem] ring-1 ring-white/10 mix-blend-screen opacity-80" />
        <FloatingCard className="absolute left-4 top-6 animate-[float-subtle_6s_ease-in-out_infinite]">
          <div className="text-[10px] uppercase tracking-wide text-emerald-200/80">Dushanbe</div>
          <div className="text-sm font-semibold text-white">4.9 ★ · от 280 TJS</div>
        </FloatingCard>
        <FloatingCard className="absolute bottom-8 right-2 w-40 animate-[float-subtle_7s_ease-in-out_infinite_1s]">
          <div className="text-[10px] text-slate-300">Бронь подтверждена</div>
          <div className="mt-1 text-xs font-semibold text-white">TJ-4821</div>
        </FloatingCard>
        <FloatingCard className="absolute right-8 top-1/3 w-36 animate-[float-subtle_5.5s_ease-in-out_infinite_0.5s]">
          <div className="flex items-center gap-2 text-xs text-white">
            <span className="text-lg" aria-hidden>
              🏔️
            </span>
            <span>Tajik Mountain Stay</span>
          </div>
        </FloatingCard>
      </div>
      {children ? <div className="lg:col-span-2 lg:hidden">{children}</div> : null}
    </div>
  );
}
