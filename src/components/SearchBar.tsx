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
    <div className="home-search-card">
      <form action="/search" method="get">
        <datalist id="popular-cities">
          {popularCityValues.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
          <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
            <span className="home-search-label hidden md:block">{m(locale, "search.placeholder")}</span>
            <div className="home-search-field">
              <span className="shrink-0 text-emerald-400" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0116 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <input
                name="city"
                type="text"
                list="popular-cities"
                placeholder={t(locale, "city")}
                aria-label={m(locale, "search.placeholder")}
                className="home-search-input"
                inputMode="text"
                autoComplete="address-level2"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="home-search-label">{m(locale, "search.checkIn")}</span>
            <div className="home-search-field">
              <input name="checkIn" type="date" aria-label={m(locale, "search.checkIn")} className="home-search-input" />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="home-search-label">{m(locale, "search.checkOut")}</span>
            <div className="home-search-field">
              <input name="checkOut" type="date" aria-label={m(locale, "search.checkOut")} className="home-search-input" />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="home-search-label">{m(locale, "search.guests")}</span>
            <div className="home-search-field">
              <input
                name="guests"
                type="number"
                min={1}
                defaultValue={2}
                placeholder={t(locale, "guests")}
                aria-label={m(locale, "search.guests")}
                className="home-search-input"
                inputMode="numeric"
              />
            </div>
          </label>

          <div className="hidden flex-col gap-1.5 lg:flex lg:col-span-1">
            <span className="home-search-label">{m(locale, "search.button")}</span>
            <button type="submit" className="home-search-submit min-h-[var(--taj-control-h)]" aria-label={m(locale, "search.button")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              {m(locale, "search.button")}
            </button>
          </div>
        </div>

        <div className="mt-3 md:hidden">
          <button type="submit" className="home-search-submit min-h-[var(--taj-control-h-lg)] w-full" aria-label={m(locale, "search.button")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            {m(locale, "search.search")}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-emerald-200/90">{m(locale, "search.popular")}</span>
          {popularCities.map((city, i) => (
            <Link
              key={city}
              href={`/search?city=${encodeURIComponent(popularCityValues[i])}`}
              className="inline-flex min-h-[2.25rem] items-center rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/45 hover:bg-emerald-500/18"
            >
              {city}
            </Link>
          ))}
        </div>
      </form>
    </div>
  );
}
