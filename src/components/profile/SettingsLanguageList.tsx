"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { localeLabels, locales } from "@/lib/i18n/locale";
import { cn } from "@/lib/cn";

export function SettingsLanguageList({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function change(locale: Locale) {
    if (locale === current || pending) return;
    const res = await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale })
    });
    if (!res.ok) return;
    startTransition(() => router.refresh());
  }

  return (
    <div className="mockup-menu">
      {locales.map((loc) => {
        const active = loc === current;
        return (
          <button
            key={loc}
            type="button"
            disabled={pending}
            onClick={() => void change(loc)}
            className={cn("mockup-menu__item w-full text-left", active && "border-[var(--green-accent)]/40")}
          >
            <span>{localeLabels[loc]}</span>
            {active ? <Check size={18} className="ml-auto text-[var(--green-accent)]" aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}
