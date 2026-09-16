"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ThemePreference } from "@/lib/theme";

/**
 * MOBILE PROFILE / OWNER / SECURITY CORRECTION BLOCK: real, persisted Light/Dark control in the
 * Profile header. "System" stays selectable in principle (the cookie/layout plumbing supports it
 * — see src/lib/theme.ts) but this compact header control only exposes the fast Light/Dark toggle
 * the spec asked for; System remains the default until a user picks one explicitly. Professional
 * sun/moon icons (lucide-react, the project's existing icon family), not emoji.
 */
export function ProfileThemeToggle({ current }: { current: ThemePreference }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resolved, setResolved] = useState<"light" | "dark">(() => {
    if (current === "light" || current === "dark") return current;
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  async function setTheme(next: "light" | "dark") {
    if (pending) return;
    setResolved(next);
    try {
      const res = await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next })
      });
      if (!res.ok) throw new Error("failed");
      startTransition(() => router.refresh());
    } catch {
      // Revert optimistic UI on failure — the cookie write failed, so the server-rendered
      // attribute never changed either.
      setResolved(current === "dark" ? "dark" : "light");
    }
  }

  return (
    <div className="profile-theme-toggle" role="group" aria-label="Light / Dark">
      <button
        type="button"
        aria-pressed={resolved === "light"}
        aria-label="Light"
        className={cn("profile-theme-toggle__btn", resolved === "light" && "is-active")}
        onClick={() => void setTheme("light")}
        disabled={pending}
      >
        <Sun size={16} aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={resolved === "dark"}
        aria-label="Dark"
        className={cn("profile-theme-toggle__btn", resolved === "dark" && "is-active")}
        onClick={() => void setTheme("dark")}
        disabled={pending}
      >
        <Moon size={16} aria-hidden />
      </button>
    </div>
  );
}
