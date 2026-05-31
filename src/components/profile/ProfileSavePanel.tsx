"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Props = {
  children: ReactNode;
  onSubmit: () => Promise<void>;
  saveLabel: string;
  savingLabel: string;
  savedLabel: string;
  className?: string;
};

export function ProfileSavePanel({ children, onSubmit, saveLabel, savingLabel, savedLabel, className }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await onSubmit();
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className ?? "profile-panel profile-panel--stack"}>
      {children}
      {error ? (
        <p className="taj-form-error taj-form-error--compact" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm font-medium text-[var(--green-accent)]" role="status">
          {savedLabel}
        </p>
      ) : null}
      <button type="submit" className="btn-primary w-full" disabled={busy} aria-busy={busy}>
        {busy ? savingLabel : saveLabel}
      </button>
    </form>
  );
}

export async function postProfileJson(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Save failed");
  }
  return data;
}
