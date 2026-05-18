"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
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
    } catch (e: any) {
      setError(e?.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button disabled={loading} onClick={logout} className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50">
        {loading ? "..." : "Выйти"}
      </button>
      {error && <div className="mt-2 text-xs text-red-700">{error}</div>}
    </div>
  );
}

