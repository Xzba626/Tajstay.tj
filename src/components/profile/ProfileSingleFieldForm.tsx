"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { patchProfileJson, postProfileJson } from "@/components/profile/profileClient";
import { ProfileAccountScreen } from "@/components/profile/ProfileAccountScreen";

type Props = {
  locale: Locale;
  title: string;
  label: string;
  fieldKey: string;
  apiUrl: string;
  backHref: string;
  initialValue?: string;
  method?: "PATCH" | "POST";
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
  initialValue = "",
  method = "PATCH",
  inputType = "text",
  placeholder
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const body = { [fieldKey]: value };
      if (method === "POST") {
        await postProfileJson(apiUrl, body, locale);
      } else {
        await patchProfileJson(apiUrl, body, locale);
      }
      router.refresh();
      router.push(backHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errSave"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProfileAccountScreen backHref={backHref} backLabel={m(locale, "common.back")} title={title}>
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
            required={fieldKey !== "surname"}
          />
        </label>
        {error ? (
          <p className="taj-form-error taj-form-error--compact" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? m(locale, "profile.saving") : m(locale, "profile.save")}
        </button>
      </form>
    </ProfileAccountScreen>
  );
}
