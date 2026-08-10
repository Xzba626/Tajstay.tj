"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import { m } from "@/lib/i18n/messages";

type Props = { locale?: Locale };

const cityIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0116 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export function SearchBar({ locale = "ru" }: Props) {
  const popularCities = [
    m(locale, "cities.dushanbe"),
    m(locale, "cities.khujand"),
    m(locale, "cities.penjikent"),
    m(locale, "cities.badakhshan")
  ];
  const popularCityValues = ["Dushanbe", "Khujand", "Penjikent", "Badakhshan"];
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (checkIn && checkOut && checkOut <= checkIn) {
      e.preventDefault();
      setDateError(m(locale, "search.errDates"));
      return;
    }
    setDateError(null);
  }

  return (
    <div className="home-search-card home-search-card--premium">
      <form action="/search" method="get" className="home-search-form-wrap" onSubmit={onSubmit} noValidate>
        <datalist id="popular-cities">
          {popularCityValues.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>

        <div className="home-search-form grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
          <label className="home-search-item sm:col-span-2 lg:col-span-1">
            <span className="home-search-label">{m(locale, "search.city")}</span>
            <div className="home-search-control home-search-control--with-icon">
              <span className="home-search-control__icon text-[var(--taj-lake)]" aria-hidden>
                {cityIcon}
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

          <label className="home-search-item">
            <span className="home-search-label">{m(locale, "search.checkIn")}</span>
            <div className="home-search-control">
              <input
                name="checkIn"
                type="date"
                value={checkIn}
                min={todayIso}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  setDateError(null);
                }}
                aria-label={m(locale, "search.checkIn")}
                className="home-search-input"
              />
            </div>
          </label>

          <label className="home-search-item">
            <span className="home-search-label">{m(locale, "search.checkOut")}</span>
            <div className="home-search-control">
              <input
                name="checkOut"
                type="date"
                value={checkOut}
                min={checkIn || todayIso}
                onChange={(e) => {
                  setCheckOut(e.target.value);
                  setDateError(null);
                }}
                aria-label={m(locale, "search.checkOut")}
                className="home-search-input"
              />
            </div>
          </label>

          <label className="home-search-item">
            <span className="home-search-label">{m(locale, "search.guests")}</span>
            <div className="home-search-control">
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

          <div className="home-search-item hidden lg:flex lg:col-span-1">
            <span className="home-search-label">{m(locale, "search.button")}</span>
            <button type="submit" className="home-search-submit" aria-label={m(locale, "search.button")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              {m(locale, "search.button")}
            </button>
          </div>
        </div>

        {dateError ? (
          <p className="mt-3 text-sm font-medium text-[var(--taj-color-danger)]" role="alert">
            {dateError}
          </p>
        ) : null}

        <div className="home-search-mobile-submit md:hidden">
          <button type="submit" className="home-search-submit home-search-submit--mobile w-full" aria-label={m(locale, "search.button")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            {m(locale, "search.button")}
          </button>
        </div>

        <div className="home-search-popular mt-4 hidden flex-wrap items-center gap-2 md:flex">
          <span className="text-xs font-semibold text-[var(--taj-ink-soft)]">{m(locale, "search.popular")}</span>
          {popularCities.map((city, i) => (
            <Link
              key={city}
              href={`/search?city=${encodeURIComponent(popularCityValues[i])}`}
              className="inline-flex min-h-[2.25rem] items-center rounded-full border border-[var(--taj-line)] bg-[var(--taj-lake-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--taj-lake-deep)] transition hover:border-[var(--taj-lake)]"
            >
              {city}
            </Link>
          ))}
        </div>
      </form>
    </div>
  );
}
