"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { patchProfileJson } from "@/components/profile/profileClient";

type Props = {
  locale: Locale;
  fullName: string;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
};

export function ProfileEditClient({ locale, fullName, firstName, lastName, imageUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [preview, setPreview] = useState<string | null>(imageUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  async function onPhoto(file: File) {
    setBusy(true);
    setError(null);
    try {
      const bitmap = await createImageBitmap(file);
      const size = Math.min(bitmap.width, bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(m(locale, "profile.errPhotoProcess"));
      const sx = (bitmap.width - size) / 2;
      const sy = (bitmap.height - size) / 2;
      ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, 512, 512);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(m(locale, "profile.errPhotoProcess")))), "image/webp", 0.82);
      });
      setPreview(URL.createObjectURL(blob));
      const form = new FormData();
      form.set("photo", new File([blob], "avatar.webp", { type: "image/webp" }));
      const res = await fetch("/api/profile/photo", { method: "POST", body: form, credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : m(locale, "profile.errSave"));
      setDirty(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errSave"));
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await patchProfileJson("/api/profile/name", { firstName: first.trim() }, locale);
      await patchProfileJson("/api/profile/surname", { surname: last.trim() }, locale);
      setDirty(false);
      router.refresh();
      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errSave"));
    } finally {
      setBusy(false);
    }
  }

  const canSave = dirty || first.trim() !== firstName || last.trim() !== lastName;

  return (
    <div className="profile-edit-screen">
      <Link href="/profile" className="mb-3 inline-flex text-sm font-medium text-[var(--green-accent)]">
        ← {m(locale, "common.back")}
      </Link>
      <h1 className="mockup-screen__title">{m(locale, "profile.editProfile")}</h1>

      <div className="profile-edit-screen__body mt-4 space-y-4">
        <div className="profile-hero-card profile-hero-card--edit">
          <ProfileAvatar name={fullName} imageUrl={preview} size="lg" className="profile-avatar--gold-ring" />
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onPhoto(file);
            }}
          />
          <button
            type="button"
            className="btn-secondary mt-3 w-full max-w-xs"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? m(locale, "profile.saving") : m(locale, "profile.changePhoto")}
          </button>
        </div>

        <div className="profile-panel profile-panel--stack space-y-3">
          <label className="block">
            <span className="profile-info-row__label">{m(locale, "profile.firstName")}</span>
            <input
              className="premium-input mt-1.5"
              value={first}
              onChange={(e) => {
                setFirst(e.target.value);
                setDirty(true);
              }}
              autoComplete="given-name"
            />
          </label>
          <label className="block">
            <span className="profile-info-row__label">{m(locale, "profile.lastName")}</span>
            <input
              className="premium-input mt-1.5"
              value={last}
              onChange={(e) => {
                setLast(e.target.value);
                setDirty(true);
              }}
              autoComplete="family-name"
            />
          </label>
          {error ? (
            <p className="taj-form-error taj-form-error--compact" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="profile-edit-screen__save">
        <button type="button" className="btn-primary w-full" disabled={busy || !canSave} onClick={() => void onSave()}>
          {busy ? m(locale, "profile.saving") : m(locale, "profile.save")}
        </button>
      </div>
    </div>
  );
}
