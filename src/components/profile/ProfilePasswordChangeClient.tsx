"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { ProfileSubpageShell } from "@/components/profile/ProfileSubpageShell";
import type { Locale } from "@/lib/i18n/locale";

type Labels = {
  title: string;
  subtitle: string;
  current: string;
  next: string;
  confirm: string;
  submit: string;
  success: string;
  errors: Record<string, string>;
};

export function ProfilePasswordChangeClient({ locale, labels }: { locale: Locale; labels: Labels }) {
  const [pending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function err(code: string) {
    return labels.errors[code] ?? labels.errors.failed ?? code;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(err(json.error ?? "failed"));
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <ProfileSubpageShell locale={locale} title={labels.title} subtitle={labels.subtitle}>
      <form onSubmit={onSubmit} className="profile-subpage-form space-y-3">
        <label className="profile-field">
          <span className="profile-field__label">{labels.current}</span>
          <input
            type="password"
            className="profile-input"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label className="profile-field">
          <span className="profile-field__label">{labels.next}</span>
          <input
            type="password"
            className="profile-input"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label className="profile-field">
          <span className="profile-field__label">{labels.confirm}</span>
          <input
            type="password"
            className="profile-input"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>
        {error ? (
          <p className="profile-status profile-status--danger" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="profile-status profile-status--success" role="status">
            {labels.success}
          </p>
        ) : null}
        <button type="submit" className="btn-primary inline-flex !w-auto px-6" disabled={pending}>
          <KeyRound size={18} className="mr-2" aria-hidden />
          {labels.submit}
        </button>
      </form>
    </ProfileSubpageShell>
  );
}
