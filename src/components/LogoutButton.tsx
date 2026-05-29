"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ds/Button";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  loadingLabel?: string;
  variant?: "button" | "row";
};

export default function LogoutButton({ label, loadingLabel = "…", variant = "button" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Logout failed");
      router.refresh();
      window.location.href = "/";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "row") {
    return (
      <div className="w-full">
        <button
          type="button"
          disabled={loading}
          onClick={() => void logout()}
          className={cn(
            "profile-actions__item profile-actions__item--danger !border-0",
            loading && "opacity-60"
          )}
        >
          <LogOut size={18} className="shrink-0" aria-hidden />
          <span className="flex-1 text-left text-sm font-medium">{label}</span>
        </button>
        {error ? <p className="px-4 pb-2 text-xs text-red-300" role="alert">{error}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <Button type="button" variant="danger" size="sm" loading={loading} onClick={() => void logout()}>
        {label}
      </Button>
      {error ? <p className="mt-2 text-xs text-red-300" role="alert">{error}</p> : null}
      {loading ? <span className="sr-only">{loadingLabel}</span> : null}
    </div>
  );
}
