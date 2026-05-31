"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

type Props = {
  locale: Locale;
  name: string;
  imageUrl: string | null;
};

export function ProfilePhotoUpload({ locale, name, imageUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(imageUrl);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const bitmap = await createImageBitmap(file);
      const size = Math.min(bitmap.width, bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas error");
      const sx = (bitmap.width - size) / 2;
      const sy = (bitmap.height - size) / 2;
      ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, 512, 512);
      bitmap.close();

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Blob error"))), "image/webp", 0.82);
      });

      setPreview(URL.createObjectURL(blob));
      const form = new FormData();
      form.set("photo", new File([blob], "avatar.webp", { type: "image/webp" }));
      const res = await fetch("/api/profile/photo", { method: "POST", body: form, credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : m(locale, "profile.errSave"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errSave"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-panel flex flex-col items-center gap-3">
      <ProfileAvatar name={name} imageUrl={preview} size="lg" />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
        }}
      />
      {error ? (
        <p className="taj-form-error taj-form-error--compact" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn-secondary w-full max-w-xs"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? m(locale, "profile.saving") : m(locale, "profile.changePhoto")}
      </button>
    </div>
  );
}
