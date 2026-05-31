"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { TajikPhoneInput } from "@/components/auth/TajikPhoneInput";
import { patchProfileJson } from "@/components/profile/profileClient";
import { formatTajikPhoneInput } from "@/lib/validation/phone";

type Props = { locale: Locale };

export function ProfilePhoneClient({ locale }: Props) {
  const router = useRouter();
  const [national, setNational] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const phone = formatTajikPhoneInput(national);
      await patchProfileJson("/api/profile/phone", { phone });
      router.refresh();
      router.push("/profile/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errSave"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mockup-screen">
      <Link href="/profile/account" className="mb-4 inline-flex text-sm text-[var(--green-accent)]">
        ← {m(locale, "common.back")}
      </Link>
      <h1 className="mockup-screen__title">{m(locale, "profile.phone")}</h1>
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
    </div>
  );
}
