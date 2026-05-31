"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSavePanel, postProfileJson } from "@/components/profile/ProfileSavePanel";

type Props = {
  locale: Locale;
};

export function ProfilePasswordForm({ locale }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  return (
    <ProfileSavePanel
      saveLabel={m(locale, "profile.save")}
      savingLabel={m(locale, "profile.saving")}
      savedLabel={m(locale, "profile.saved")}
      onSubmit={async () => {
        await postProfileJson("/api/profile/password", { password, confirm });
        setPassword("");
        setConfirm("");
      }}
    >
      <label className="block">
        <span className="profile-info-row__label">{m(locale, "profile.passwordNew")}</span>
        <input
          className="premium-input mt-1.5"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
        />
      </label>
      <label className="block">
        <span className="profile-info-row__label">{m(locale, "profile.passwordConfirm")}</span>
        <input
          className="premium-input mt-1.5"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
        />
      </label>
    </ProfileSavePanel>
  );
}
