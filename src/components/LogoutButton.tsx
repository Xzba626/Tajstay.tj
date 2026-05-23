"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ds/Button";

type Props = {
  label: string;
  loadingLabel?: string;
};

export default function LogoutButton({ label, loadingLabel = "…" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
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
