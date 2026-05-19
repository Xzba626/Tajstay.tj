import Link from "next/link";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import { m } from "@/lib/i18n/messages";

type Props = { locale?: Locale };

export function SearchBar({ locale = "ru" }: Props) {
  const popularCities = [
    m(locale, "cities.dushanbe"),
    m(locale, "cities.khujand"),
    m(locale, "cities.penjikent"),
    m(locale, "cities.badakhshan")
  ];
  const popularCityValues = ["Dushanbe", "Khujand", "Penjikent", "Badakhshan"];

  return (
    <div className="rounded-[24px] border border-[rgba(255,255,255,0.12)] bg-[rgba(18,31,20,0.92)] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
      <form action="/search" method="get">
        <datalist id="popular-cities">
          {popularCityValues.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
          {/* City */}
          <label className="relative flex flex-col gap-1 sm:col-span-2 md:col-span-1">
            <span className="pl-1 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--brand-green-light)]">{m(locale, "search.placeholder")}</span>
            <div className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
              <span className="shrink-0 text-[var(--brand-green)]" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0116 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </span>
              <input
                name="city"
                type="text"
                list="popular-cities"
                placeholder={t(locale, "city")}
                className="h-full w-full bg-transparent text-sm leading-5 text-white placeholder:text-[var(--brand-muted)] outline-none"
              />
            </div>
          </label>

          {/* Check-in */}
          <label className="relative flex flex-col gap-1">
            <span className="pl-1 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--brand-green-light)]">{m(locale, "search.checkIn")}</span>
            <div className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
              <span className="shrink-0 text-[var(--brand-green)]" aria-hidden>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </span>
              <input
                name="checkIn"
                type="date"
                className="h-full w-full bg-transparent pr-2 text-sm leading-5 text-white outline-none"
              />
            </div>
          </label>

          {/* Check-out */}
          <label className="relative flex flex-col gap-1">
            <span className="pl-1 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--brand-green-light)]">{m(locale, "search.checkOut")}</span>
            <div className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
              <span className="shrink-0 text-[var(--brand-green)]" aria-hidden>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </span>
              <input
                name="checkOut"
                type="date"
                className="h-full w-full bg-transparent pr-2 text-sm leading-5 text-white outline-none"
              />
            </div>
          </label>

          {/* Guests */}
          <label className="relative flex flex-col gap-1">
            <span className="pl-1 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--brand-green-light)]">{m(locale, "search.guests")}</span>
            <div className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
              <span className="shrink-0 text-[var(--brand-green)]" aria-hidden>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </span>
              <input
                name="guests"
                type="number"
                min={1}
                defaultValue={2}
                placeholder={t(locale, "guests")}
                className="h-full w-full bg-transparent text-sm leading-5 text-white placeholder:text-brand-200 outline-none"
              />
            </div>
          </label>

          {/* Submit */}
          <div className="flex flex-col gap-1 sm:col-span-2 md:col-span-1">
            <span className="invisible pl-1 text-[0.65rem] font-semibold uppercase tracking-widest select-none" aria-hidden>
              {m(locale, "search.button")}
            </span>
            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-[var(--brand-green)] text-sm font-bold tracking-wide text-[#0D1610] shadow-[0_0_24px_rgba(34,197,94,0.3)] transition hover:bg-[var(--brand-green-dark)] flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              {m(locale, "search.button")}
            </button>
          </div>
        </div>

        {/* Popular cities */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--brand-green-light)]">Популярные:</span>
          {popularCities.map((city, i) => (
            <Link
              key={city}
              href={`/search?city=${encodeURIComponent(popularCityValues[i])}`}
              className="rounded-full border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.08)] px-3 py-1 text-xs font-semibold text-[var(--brand-green-light)] transition hover:bg-[rgba(34,197,94,0.16)] hover:text-white"
            >
              {city}
            </Link>
          ))}
        </div>
      </form>
    </div>
  );
}
