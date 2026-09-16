"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ThemePreference } from "@/lib/theme";

/**
 * Profile header theme control: Light / Dark / System.
 * System omits data-theme so prefers-color-scheme CSS decides (see themeAttrFor).
 */
export function ProfileThemeToggle({ current }: { current: ThemePreference }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preference, setPreference] = useState<ThemePreference>(current);

  useEffect(() => {
    setPreference(current);
  }, [current]);

  // When preference is System, keep UI in sync if OS scheme flips mid-session.
  useEffect(() => {
    if (preference !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => startTransition(() => router.refresh());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference, router]);

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

  return (
    <div className="profile-theme-toggle" role="group" aria-label="Light / Dark / System">
      <button
        type="button"
        aria-pressed={preference === "light"}
        aria-label="Light"
        className={cn("profile-theme-toggle__btn", preference === "light" && "is-active")}
        onClick={() => void setTheme("light")}
        disabled={pending}
      >
        <Sun size={16} aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={preference === "dark"}
        aria-label="Dark"
        className={cn("profile-theme-toggle__btn", preference === "dark" && "is-active")}
        onClick={() => void setTheme("dark")}
        disabled={pending}
      >
        <Moon size={16} aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={preference === "system"}
        aria-label="System"
        className={cn("profile-theme-toggle__btn", preference === "system" && "is-active")}
        onClick={() => void setTheme("system")}
        disabled={pending}
      >
        <Monitor size={16} aria-hidden />
      </button>
    </div>
  );
}
