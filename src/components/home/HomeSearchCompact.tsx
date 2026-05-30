"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ChevronRight, Loader2, Minus, Plus, Search, X } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { cn } from "@/lib/cn";

type Sheet = "city" | "dates" | "guests" | null;

type Props = {
  locale: Locale;
};

const CITIES = [
  { value: "", labelKey: "search.allCities" as const },
  { value: "Dushanbe", labelKey: "cities.dushanbe" as const },
  { value: "Khujand", labelKey: "cities.khujand" as const },
  { value: "Penjikent", labelKey: "cities.penjikent" as const },
  { value: "Badakhshan", labelKey: "cities.badakhshan" as const }
];

function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(10);
  }
}

function formatDate(iso: string, locale: Locale) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(locale === "en" ? "en-GB" : locale === "tg" ? "tg-TJ" : "ru-RU", {
    day: "numeric",
    month: "short"
  });
}

function SearchFieldRow({
  label,
  value,
  filled,
  onClick
}: {
  label: string;
  value: string;
  filled: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="home-search-compact__row" onClick={onClick}>
      <div className="home-search-compact__field min-w-0 flex-1 text-left">
        <span className="home-search-compact__field-label">{label}</span>
        <span
          className={cn(
            "home-search-compact__field-value",
            filled && "home-search-compact__field-value--filled"
          )}
        >
          {value}
        </span>
      </div>
      <ChevronRight size={18} className="home-search-compact__chevron shrink-0" aria-hidden />
    </button>
  );
}

export function HomeSearchCompact({ locale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  const cityLabel = useMemo(() => {
    if (!city) return m(locale, "search.allCities");
    const found = CITIES.find((c) => c.value === city);
    return found ? m(locale, found.labelKey) : city;
  }, [city, locale]);

  const cityDisplay = city ? `📍 ${cityLabel}` : cityLabel;
  const cityFilled = Boolean(city);

  const datesFilled = Boolean(checkIn && checkOut);
  const datesDisplay = datesFilled
    ? `📅 ${formatDate(checkIn, locale)} — ${formatDate(checkOut, locale)}`
    : m(locale, "search.selectDates");

  const guestsDisplay = `👥 ${m(locale, "search.guestsCount", { count: guests })}`;

  const closeSheet = useCallback(() => setSheet(null), []);

  function submitMobile() {
    if (isPending) return;
    haptic();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("guests", String(guests));
    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  }

  return (
    <>
      <div className="home-search-compact home-search-compact--premium md:hidden">
        <SearchFieldRow
          label={m(locale, "search.city")}
          value={cityDisplay}
          filled={cityFilled}
          onClick={() => {
            haptic();
            setSheet("city");
          }}
        />

        <SearchFieldRow
          label={m(locale, "search.dates")}
          value={datesDisplay}
          filled={datesFilled}
          onClick={() => {
            haptic();
            setSheet("dates");
          }}
        />

        <SearchFieldRow
          label={m(locale, "search.guests")}
          value={guestsDisplay}
          filled
          onClick={() => {
            haptic();
            setSheet("guests");
          }}
        />

        <div className="home-search-compact__submit-wrap">
          <button
            type="button"
            className="btn-primary home-search-compact__submit"
            onClick={submitMobile}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Search size={18} aria-hidden />}
            {m(locale, "search.button")}
          </button>
        </div>
      </div>

      <form action="/search" method="get" className="home-search-compact home-search-compact--desktop hidden md:block">
        <div className="home-search-compact__desktop-grid">
          <label className="home-search-compact__desktop-field">
            <span className="home-search-compact__field-label">{m(locale, "search.city")}</span>
            <select name="city" className="home-search-compact__desktop-input" defaultValue="">
              {CITIES.map((c) => (
                <option key={c.value || "all"} value={c.value}>
                  {m(locale, c.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="home-search-compact__desktop-field">
            <span className="home-search-compact__field-label">{m(locale, "search.checkIn")}</span>
            <input name="checkIn" type="date" className="home-search-compact__desktop-input" />
          </label>
          <label className="home-search-compact__desktop-field">
            <span className="home-search-compact__field-label">{m(locale, "search.checkOut")}</span>
            <input name="checkOut" type="date" className="home-search-compact__desktop-input" />
          </label>
          <label className="home-search-compact__desktop-field">
            <span className="home-search-compact__field-label">{m(locale, "search.guests")}</span>
            <input name="guests" type="number" min={1} defaultValue={2} className="home-search-compact__desktop-input" />
          </label>
        </div>
        <div className="home-search-compact__submit-wrap">
          <button type="submit" className="btn-primary home-search-compact__submit">
            <Search size={18} aria-hidden />
            {m(locale, "search.button")}
          </button>
        </div>
      </form>

      {sheet ? (
        <>
          <div className="bottom-sheet-backdrop md:hidden" onClick={closeSheet} aria-hidden />
          <div className="bottom-sheet md:hidden" role="dialog" aria-modal="true">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {sheet === "city"
                  ? m(locale, "search.whereTo")
                  : sheet === "dates"
                    ? m(locale, "search.dates")
                    : m(locale, "search.guests")}
              </h3>
              <button
                type="button"
                onClick={closeSheet}
                className="rounded-lg p-2 text-[var(--text-muted)]"
                aria-label={m(locale, "common.close")}
              >
                <X size={20} />
              </button>
            </div>

            {sheet === "city" ? (
              <ul className="space-y-1">
                {CITIES.map((c) => (
                  <li key={c.value || "all"}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition",
                        city === c.value
                          ? "bg-[var(--green-muted)] text-[var(--green-accent)]"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                      )}
                      onClick={() => {
                        haptic();
                        setCity(c.value);
                        closeSheet();
                      }}
                    >
                      {m(locale, c.labelKey)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {sheet === "dates" ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="home-search-compact__field-label">{m(locale, "search.checkIn")}</span>
                  <input
                    type="date"
                    className="premium-input mt-1.5"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="home-search-compact__field-label">{m(locale, "search.checkOut")}</span>
                  <input
                    type="date"
                    className="premium-input mt-1.5"
                    value={checkOut}
                    min={checkIn || undefined}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    haptic();
                    closeSheet();
                  }}
                >
                  {m(locale, "common.done")}
                </button>
              </div>
            ) : null}

            {sheet === "guests" ? (
              <div className="flex items-center justify-between gap-4 py-2">
                <span className="font-medium text-[var(--text-primary)]">{m(locale, "search.guests")}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--green-accent)]"
                    onClick={() => {
                      haptic();
                      setGuests((g) => Math.max(1, g - 1));
                    }}
                    aria-label="-"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="min-w-[2rem] text-center text-lg font-bold text-[var(--text-primary)]">{guests}</span>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--green-accent)]"
                    onClick={() => {
                      haptic();
                      setGuests((g) => Math.min(12, g + 1));
                    }}
                    aria-label="+"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}
