"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { patchProfileJson } from "@/components/profile/profileClient";

type Props = {
  locale: Locale;
  title: string;
  label: string;
  fieldKey: string;
  apiUrl: string;
  backHref: string;
  inputType?: string;
  placeholder?: string;
};

export function ProfileSingleFieldForm({
  locale,
  title,
  label,
  fieldKey,
  apiUrl,
  backHref,
  inputType = "text",
  placeholder
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await patchProfileJson(apiUrl, { [fieldKey]: value });
      setSaved(true);
      router.refresh();
      window.setTimeout(() => router.push(backHref), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errSave"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mockup-screen">
      <Link href={backHref} className="mb-4 inline-flex text-sm text-[var(--green-accent)]">
        ← {m(locale, "common.back")}
      </Link>
      <h1 className="mockup-screen__title">{title}</h1>
      <form onSubmit={onSubmit} className="profile-panel profile-panel--stack mt-4">
        <label className="block">
          <span className="profile-info-row__label">{label}</span>
          <input
            className="premium-input mt-1.5"
            type={inputType}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
          />
        </label>
        {error ? (
          <p className="taj-form-error taj-form-error--compact" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-sm font-medium text-[var(--green-accent)]">{m(locale, "profile.saved")}</p>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? m(locale, "profile.saving") : m(locale, "profile.save")}
        </button>
      </form>
    </div>
  );
}
