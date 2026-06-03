import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaSearch: string;
  ctaOwners: string;
  children: ReactNode;
};

export function HomeHeroLuxury({
  heroBadge,
  heroTitle,
  heroSubtitle,
  ctaSearch,
  ctaOwners,
  children
}: Props) {
  return (
    <>
      <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-emerald-500/22 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-20 bottom-16 h-64 w-64 rounded-full bg-emerald-500/14 blur-3xl" aria-hidden />

      <div className="relative z-[1] mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 sm:px-6 lg:px-8">
        {/* initial opacity 0 + ждать JS гидрации = «пустой сайт» на медленном Cloudflare Tunnel; контент виден из HTML */}
        <div className="mx-auto max-w-3xl text-center lg:max-w-4xl">
          {heroBadge.trim() ? (
            <div className="mb-3 inline-flex rounded-full border border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-green-light)] sm:text-xs">
              {heroBadge}
            </div>
          ) : null}
          <h1 className="text-[clamp(2rem,6.5vw,3.75rem)] font-extrabold leading-[1.06] tracking-tight text-[#F0EDE8] drop-shadow-lg">
            {heroTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-[rgba(240,237,232,0.58)] sm:text-base">{heroSubtitle}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/search"
              className="inline-flex min-h-[52px] min-w-[min(100%,160px)] items-center justify-center rounded-2xl bg-[var(--brand-green)] px-8 py-3.5 text-sm font-bold text-[#0D1610] shadow-[0_0_28px_rgba(34,197,94,0.28)] transition active:scale-[0.98] sm:min-w-[180px]"
            >
              {ctaSearch}
            </Link>
            <Link
              href="/profile/become-owner"
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-[rgba(34,197,94,0.38)] bg-transparent px-6 py-3.5 text-sm font-semibold text-[var(--brand-green)] transition hover:bg-[rgba(34,197,94,0.08)] active:scale-[0.98]"
            >
              {ctaOwners}
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-[2] mx-auto mt-8 w-full max-w-6xl px-4 sm:mt-10 sm:px-6 lg:px-8">{children}</div>
    </>
  );
}
