"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { LOCALE_AUTO_COOKIE, LOCALE_PROMPT_DONE_COOKIE, localeLabels } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const row = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return row ? decodeURIComponent(row.split("=")[1] ?? "") : null;
}

type Props = {
  locale: Locale;
};

export function LocaleDetectBanner({ locale }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [detected, setDetected] = useState<Locale | null>(null);

  useEffect(() => {
    const auto = readCookie(LOCALE_AUTO_COOKIE) as Locale | null;
    const done = readCookie(LOCALE_PROMPT_DONE_COOKIE);
    if (auto && !done && (auto === "ru" || auto === "tg" || auto === "en")) {
      setDetected(auto);
      setVisible(true);
    }
  }, []);

  if (!visible || !detected) return null;

  async function confirm(ok: boolean) {
    if (!ok && detected) {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, manual: true, promptDone: true })
      });
    } else {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: detected, manual: false, promptDone: true })
      });
    }
    setVisible(false);
    router.refresh();
  }

  return (
    <div className="locale-detect-banner" role="dialog" aria-live="polite">
      <p className="locale-detect-banner__text">
        {m(locale, "locale.detectBanner", { lang: localeLabels[detected] })}
      </p>
      <div className="locale-detect-banner__actions">
        <button type="button" className="btn-primary !w-auto px-4 py-2 text-sm" onClick={() => void confirm(true)}>
          {m(locale, "locale.detectYes")}
        </button>
        <button type="button" className="btn-secondary !w-auto px-4 py-2 text-sm" onClick={() => void confirm(false)}>
          {m(locale, "locale.detectChange")}
        </button>
      </div>
    </div>
  );
}
