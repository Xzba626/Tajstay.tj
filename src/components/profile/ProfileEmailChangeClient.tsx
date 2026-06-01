"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { postProfileJson } from "@/components/profile/profileClient";
import { ProfileAccountScreen } from "@/components/profile/ProfileAccountScreen";

type Props = { locale: Locale; initialEmail?: string };

export function ProfileEmailChangeClient({ locale, initialEmail = "" }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const trimmed = email.trim();
      if (!trimmed) {
        await postProfileJson("/api/profile/email", { clear: true }, locale);
      } else {
        await postProfileJson("/api/profile/email", { email: trimmed }, locale);
      }
      router.refresh();
      router.push("/profile/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errSave"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProfileAccountScreen
      backHref="/profile/account"
      backLabel={m(locale, "common.back")}
      title={m(locale, "profile.email")}
      hint={m(locale, "profile.contactEmailHint")}
    >
      <form onSubmit={onSubmit} className="profile-panel profile-panel--stack mt-4">
        <label className="block">
          <span className="profile-info-row__label">{m(locale, "profile.newEmail")}</span>
          <input
            className="premium-input mt-1.5"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="name@example.com"
          />
        </label>
        {error ? <p className="taj-form-error taj-form-error--compact">{error}</p> : null}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? m(locale, "profile.saving") : m(locale, "profile.save")}
        </button>
      </form>
    </ProfileAccountScreen>
  );
}
