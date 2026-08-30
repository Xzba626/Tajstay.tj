"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

type Props = {
  label: string;
  confirmText: string;
  confirmYes: string;
  confirmCancel: string;
};

export function ProfileLogoutConfirm({ label, confirmText, confirmYes, confirmCancel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
      setLoading(false);
    }
  }

  return (
    <div className="profile-center__logout">
      <button
        type="button"
        className="profile-center__logout-btn"
        disabled={loading}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <LogOut size={18} className="shrink-0" aria-hidden />
        <span>{loading ? "…" : label}</span>
      </button>

      {open ? (
        <div className="profile-center__confirm" role="group" aria-label={confirmText}>
          <p className="profile-center__confirm-text">{confirmText}</p>
          <div className="profile-center__confirm-actions">
            <button type="button" onClick={() => setOpen(false)} disabled={loading}>
              {confirmCancel}
            </button>
            <button type="button" className="is-danger" disabled={loading} onClick={() => void logout()}>
              {confirmYes}
            </button>
          </div>
          {error ? (
            <p className="profile-center__confirm-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
