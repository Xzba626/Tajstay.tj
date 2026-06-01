"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { postProfileJson } from "@/components/profile/profileClient";
import { ProfileAccountScreen } from "@/components/profile/ProfileAccountScreen";

type Props = { locale: Locale };

export function ProfilePasswordClient({ locale }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await postProfileJson("/api/profile/password", { password, confirm }, locale);
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
      title={m(locale, "profile.changePassword")}
    >
      <form onSubmit={onSubmit} className="profile-panel profile-panel--stack mt-4">
        <label className="block">
          <span className="profile-info-row__label">{m(locale, "profile.passwordNew")}</span>
          <div className="relative mt-1.5">
            <input
              className="premium-input w-full pr-12"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? m(locale, "profile.hidePassword") : m(locale, "profile.showPassword")}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="profile-info-row__label">{m(locale, "profile.passwordConfirm")}</span>
          <input
            className="premium-input mt-1.5"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            autoComplete="new-password"
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
