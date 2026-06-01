"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { localeLabels } from "@/lib/i18n/locale";
import { SettingsLanguageList } from "@/components/profile/SettingsLanguageList";
import { defaultCurrencyForLocale, detectLocaleFromNavigator, type CurrencyCode } from "@/lib/profile/localeDefaults";
import { patchProfileJson } from "@/components/profile/profileClient";

type Props = {
  locale: Locale;
  initialCurrency: CurrencyCode;
  initialTheme: string;
};

const CURRENCIES: CurrencyCode[] = ["TJS", "RUB", "USD"];
const THEMES = ["light", "dark", "system"] as const;

export function ProfileSettingsClient({ locale, initialCurrency, initialTheme }: Props) {
  const router = useRouter();
  const [currency, setCurrency] = useState<CurrencyCode>(initialCurrency);
  const [theme, setTheme] = useState(initialTheme);
  const [detected, setDetected] = useState<Locale | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const detectedLocale = detectLocaleFromNavigator(navigator.language);
    setDetected(detectedLocale);
    if (!initialCurrency) {
      setCurrency(defaultCurrencyForLocale(detectedLocale));
    }
  }, [initialCurrency]);

  async function savePrefs() {
    if (busy) return;
    setBusy(true);
    setSaved(false);
    try {
      await patchProfileJson("/api/profile/settings", { preferredCurrency: currency, preferredTheme: theme }, locale);
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {m(locale, "profile.language")}
        </h2>
        {detected ? (
          <p className="mb-2 text-xs text-[var(--text-muted)]">
            {localeLabels[detected]} ({navigator.language})
          </p>
        ) : null}
        <SettingsLanguageList current={locale} />
      </section>

      <section className="profile-panel profile-panel--stack">
        <label className="block">
          <span className="profile-info-row__label">{m(locale, "profile.settingsCurrency")}</span>
          <select
            className="premium-input mt-1.5"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="profile-info-row__label">{m(locale, "profile.settingsTheme")}</span>
          <select className="premium-input mt-1.5" value={theme} onChange={(e) => setTheme(e.target.value)}>
            {THEMES.map((t) => (
              <option key={t} value={t}>
                {t === "light"
                  ? m(locale, "profile.themeLight")
                  : t === "dark"
                    ? m(locale, "profile.themeDark")
                    : m(locale, "profile.themeSystem")}
              </option>
            ))}
          </select>
        </label>
        {saved ? <p className="text-sm text-[var(--green-accent)]">{m(locale, "profile.saved")}</p> : null}
        <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void savePrefs()}>
          {busy ? m(locale, "profile.saving") : m(locale, "profile.save")}
        </button>
      </section>
    </div>
  );
}
