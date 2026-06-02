"use client";

import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { AMENITY_CATEGORIES } from "@/lib/pms/amenities";
import { getAmenityCategoryLabel, getAmenityLabel } from "@/lib/pms/amenityLabels";

type Props = {
  locale: Locale;
  value: string[];
  onChange: (next: string[]) => void;
  /** light = owner dashboard forms on white; dark = PMS panel on slate */
  variant?: "light" | "dark";
};

export function AmenityCheckboxGrid({ locale, value, onChange, variant = "dark" }: Props) {
  const isDark = variant === "dark";

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  return (
    <div className="space-y-4">
      <p className={`text-sm font-semibold uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-600"}`}>
        {m(locale, "owner.amenities")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(AMENITY_CATEGORIES).map(([key, cat]) => (
          <div
            key={key}
            className={`rounded-2xl border p-4 ${
              isDark ? "border-white/10 bg-slate-950/50" : "border-slate-200 bg-slate-50/80"
            }`}
          >
            <p className={`mb-3 text-sm font-semibold ${isDark ? "text-emerald-200" : "text-green-900"}`}>
              {getAmenityCategoryLabel(locale, key)}
            </p>
            <ul className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
              {cat.items.map((item) => {
                const checked = value.includes(item);
                return (
                  <li key={item}>
                    <label
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                        checked
                          ? isDark
                            ? "border-emerald-500/50 bg-emerald-900/40 text-white"
                            : "border-green-700 bg-green-50 text-green-950"
                          : isDark
                            ? "border-white/10 bg-slate-900/60 text-slate-200 hover:border-white/20"
                            : "border-slate-200 bg-white text-slate-800 hover:border-green-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item)}
                        className="h-5 w-5 shrink-0 rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="leading-snug">{getAmenityLabel(locale, item)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
