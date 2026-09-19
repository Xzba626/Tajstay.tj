"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ThemePreference } from "@/lib/theme";
import { m } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locale";

/**
 * Compact sun ↔ moon theme toggle.
 * No third System icon. Default / reset via secondary "Автоматически".
 */
export function ProfileThemeToggle({
  current,
  locale = "ru"
}: {
  current: ThemePreference;
  locale?: Locale;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preference, setPreference] = useState<ThemePreference>(current);
  const [osDark, setOsDark] = useState(false);

  useEffect(() => {
    setPreference(current);
  }, [current]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setOsDark(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    startTransition(() => router.refresh());
  }, [osDark, preference, router]);

  async function setTheme(next: ThemePreference) {
    if (pending || next === preference) return;
    const prev = preference;
    setPreference(next);
    try {
      const res = await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next })
      });
      if (!res.ok) throw new Error("failed");
      startTransition(() => router.refresh());
    } catch {
      setPreference(prev);
    }
  }

  const showingDark = preference === "dark" || (preference === "system" && osDark);

  function togglePrimary() {
    void setTheme(showingDark ? "light" : "dark");
  }

  return (
    <div className="profile-theme-toggle profile-theme-toggle--compact" role="group">
      <button
        type="button"
        aria-pressed={showingDark}
        aria-label={showingDark ? "Dark" : "Light"}
        className={cn("profile-theme-toggle__btn profile-theme-toggle__btn--animated", preference !== "system" && "is-active")}
        onClick={togglePrimary}
        disabled={pending}
      >
        <span className="profile-theme-toggle__icon-swap" data-dark={showingDark ? "1" : "0"}>
          <Sun size={16} aria-hidden className="profile-theme-toggle__sun" />
          <Moon size={16} aria-hidden className="profile-theme-toggle__moon" />
        </span>
      </button>
      {preference !== "system" ? (
        <button
          type="button"
          className="profile-theme-toggle__auto"
          onClick={() => void setTheme("system")}
          disabled={pending}
        >
          {m(locale, "profile.themeAuto")}
        </button>
      ) : null}
    </div>
  );
}
