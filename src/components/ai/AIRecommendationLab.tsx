"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";
import { m } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locale";

type HotelLite = {
  id: number;
  name: string;
  city: string;
  rating: number;
  minPrice: number;
};

type TravelMode = "focus" | "nature" | "romance" | "adventure";

type Labels = {
  badge: string;
  title: string;
  subtitle: string;
  surprise: string;
  budget: string;
  tripStyle: string;
  modeFocus: string;
  modeNature: string;
  modeRomance: string;
  modeAdventure: string;
  match: string;
  pickedForYou: string;
  tagInBudget: string;
  tagNatureStyle: string;
  tagHighRated: string;
  open: string;
};

type Props = {
  hotels: HotelLite[];
  labels: Labels;
  locale: Locale;
};

const MODE_WEIGHTS: Record<TravelMode, { rating: number; price: number; cityBoost: Record<string, number> }> = {
  focus: { rating: 0.65, price: 0.35, cityBoost: { Dushanbe: 0.35 } },
  nature: { rating: 0.55, price: 0.2, cityBoost: { Badakhshan: 0.45, Penjikent: 0.3 } },
  romance: { rating: 0.7, price: 0.2, cityBoost: { Khujand: 0.3, Penjikent: 0.25 } },
  adventure: { rating: 0.5, price: 0.2, cityBoost: { Badakhshan: 0.5 } }
};

const MODE_LABEL_KEY: Record<TravelMode, keyof Labels> = {
  focus: "modeFocus",
  nature: "modeNature",
  romance: "modeRomance",
  adventure: "modeAdventure"
};

export function AIRecommendationLab({ hotels, labels, locale }: Props) {
  const [budget, setBudget] = useState(650);
  const [mode, setMode] = useState<TravelMode>("nature");
  const cardsRef = useRef<HTMLDivElement | null>(null);

  const recommended = useMemo(() => {
    const profile = MODE_WEIGHTS[mode];
    const safeHotels = hotels.length ? hotels : [];
    const sorted = [...safeHotels]
      .map((hotel) => {
        const ratingScore = Math.min(hotel.rating / 5, 1) * profile.rating;
        const budgetDistance = Math.abs(hotel.minPrice - budget);
        const priceScore = Math.max(0, 1 - budgetDistance / Math.max(budget, 1)) * profile.price;
        const cityScore = profile.cityBoost[hotel.city] ?? 0;
        const aiScore = ratingScore + priceScore + cityScore;
        return { ...hotel, aiScore };
      })
      .sort((a, b) => b.aiScore - a.aiScore)
      .filter((hotel) => hotel.aiScore >= 0.4)
      .slice(0, 3)
      .map((hotel) => ({
        ...hotel,
        tags: [
          hotel.minPrice <= budget ? labels.tagInBudget : null,
          mode === "nature" || mode === "adventure" ? labels.tagNatureStyle : null,
          hotel.rating >= 4 ? labels.tagHighRated : null
        ].filter(Boolean) as string[]
      }));
    return sorted;
  }, [budget, hotels, mode, labels.tagHighRated, labels.tagInBudget, labels.tagNatureStyle]);

  useEffect(() => {
    if (!cardsRef.current) return;
    const items = cardsRef.current.querySelectorAll("[data-ai-card]");
    items.forEach((el, index) => {
      const item = el as HTMLElement;
      item.style.opacity = "0";
      item.style.transform = "translateY(16px) rotateX(-8deg)";
      window.setTimeout(() => {
        item.style.transition = "opacity 520ms ease, transform 520ms ease";
        item.style.opacity = "1";
        item.style.transform = "translateY(0) rotateX(0deg)";
      }, index * 80);
    });
  }, [recommended]);

  const modeOptions: TravelMode[] = ["focus", "nature", "romance", "adventure"];
  const cityMap: Record<string, string> = {
    dushanbe: m(locale, "cities.dushanbe"),
    khujand: m(locale, "cities.khujand"),
    penjikent: m(locale, "cities.penjikent"),
    badakhshan: m(locale, "cities.badakhshan")
  };

  return (
    <section data-reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="glass-panel taj-surface-ai overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              {labels.badge}
            </div>
            <h2 className="aurora-text text-2xl font-bold tracking-tight sm:text-3xl">{labels.title}</h2>
            {labels.subtitle ? <p className="mt-2 max-w-2xl text-sm text-[var(--taj-text-secondary)]">{labels.subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setBudget(Math.floor(300 + Math.random() * 900))}
            className="rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:scale-[1.03]"
          >
            {labels.surprise}
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <label className="taj-surface-card-inner rounded-2xl p-4">
            <div className="mb-2 text-sm font-medium text-[var(--taj-text)]">
              {labels.budget}: {budget}
            </div>
            <input
              type="range"
              min={100}
              max={1500}
              step={50}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </label>
          <label className="taj-surface-card-inner rounded-2xl p-4">
            <div className="mb-2 text-sm font-medium text-[var(--taj-text)]">{labels.tripStyle}</div>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as TravelMode)}
              className="w-full rounded-xl border border-[var(--taj-border)] bg-[var(--taj-card-inner)] px-3 py-2 text-sm text-[var(--taj-text)]"
            >
              {modeOptions.map((m) => (
                <option key={m} value={m}>
                  {labels[MODE_LABEL_KEY[m]]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div ref={cardsRef} className="grid gap-4 lg:grid-cols-3">
          {recommended.map((hotel) => (
            <Link
              key={hotel.id}
              href={`/hotel/${hotel.id}`}
              data-ai-card
              data-tilt
              className="taj-surface-card-inner group relative overflow-hidden rounded-2xl p-5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/40"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-emerald-500/25 blur-2xl" />
              <div className="text-xs text-emerald-200">{labels.pickedForYou}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {hotel.tags.map((tag) => (
                  <span key={tag} className="premium-badge text-[10px]">
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="mt-2 text-lg font-semibold text-[var(--taj-text)]">{hotel.name}</h3>
              <p className="mt-1 text-sm text-[var(--taj-text-muted)]">{cityMap[hotel.city.toLowerCase()] ?? hotel.city}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-[var(--taj-text-secondary)]">
                  {hotel.rating > 0.05 ? (
                    <>★ {hotel.rating.toFixed(1)} · </>
                  ) : null}
                  <span className="font-semibold text-[var(--taj-text)]">{hotel.minPrice} TJS</span>
                </div>
                <span className="text-sm font-semibold text-emerald-300 transition group-hover:text-emerald-200">
                  {labels.open}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
