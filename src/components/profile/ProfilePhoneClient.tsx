"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { TajikPhoneInput } from "@/components/auth/TajikPhoneInput";
import { postProfileJson } from "@/components/profile/profileClient";
import { formatTajikPhoneInput } from "@/lib/validation/phone";
import { ProfileAccountScreen } from "@/components/profile/ProfileAccountScreen";

type Props = { locale: Locale; initialNational?: string };

export function ProfilePhoneClient({ locale, initialNational = "" }: Props) {
  const router = useRouter();
  const [national, setNational] = useState(initialNational);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const phone = formatTajikPhoneInput(national);
      await postProfileJson("/api/profile/phone", { phone }, locale);
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
      title={m(locale, "profile.phone")}
      hint={m(locale, "profile.contactPhoneHint")}
    >
      <form onSubmit={onSubmit} className="profile-panel profile-panel--stack mt-4">
        <label className="block">
          <span className="profile-info-row__label">{m(locale, "profile.newPhone")}</span>
          <div className="mt-1.5">
            <TajikPhoneInput value={national} onChange={setNational} />
          </div>
        </label>
        {error ? <p className="taj-form-error taj-form-error--compact">{error}</p> : null}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? m(locale, "profile.saving") : m(locale, "profile.save")}
        </button>
      </form>
    </ProfileAccountScreen>
  );
}
