"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { localeLabels, localeShort, locales } from "@/lib/i18n/locale";
import { cn } from "@/lib/cn";

type Props = {
  current: Locale;
  className?: string;
};

export function LocaleSwitcher({ current, className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function change(locale: Locale) {
    if (locale === current) return;
    setErr(null);
    try {
      const res = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale })
      });
      if (!res.ok) throw new Error("failed");
      setOpen(false);
      startTransition(() => router.refresh());
    } catch {
      setErr("×");
    }
  }

  return (
    <div className={cn("relative flex items-center gap-2", className)} ref={ref}>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        className={cn("taj-dropdown-trigger disabled:opacity-50", open && "ring-2 ring-emerald-400/25")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="font-extrabold tracking-wide">{localeShort[current]}</span>
        <svg
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={cn(
          "taj-dropdown absolute right-0 top-full z-[120] mt-2 w-44 origin-top-right p-1 transition-all duration-150",
          open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0"
        )}
        style={{ visibility: open ? "visible" : "hidden" }}
        role="menu"
      >
        {locales.map((loc) => (
          <button
            key={loc}
            type="button"
            disabled={pending}
            onClick={() => void change(loc)}
            className={cn("taj-dropdown__item disabled:opacity-50", loc === current && "is-active")}
            role="menuitem"
          >
            <span>{localeLabels[loc]}</span>
            <span className="text-xs font-extrabold tracking-wide text-slate-500">{localeShort[loc]}</span>
          </button>
        ))}
      </div>

      {err && <span className="text-xs font-semibold text-red-600">{err}</span>}
    </div>
  );
}
