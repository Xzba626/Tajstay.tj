"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSavePanel, postProfileJson } from "@/components/profile/ProfileSavePanel";

type Props = {
  locale: Locale;
  initialEmail: string;
};

export function ProfileEmailForm({ locale, initialEmail }: Props) {
  const [email, setEmail] = useState(initialEmail);

  return (
    <ProfileSavePanel
      saveLabel={m(locale, "profile.save")}
      savingLabel={m(locale, "profile.saving")}
      savedLabel={m(locale, "profile.saved")}
      onSubmit={async () => {
        if (!email.trim()) {
          await postProfileJson("/api/profile/email", { clear: true });
        } else {
          await postProfileJson("/api/profile/email", { email: email.trim() });
        }
      }}
    >
      <label className="block">
        <span className="profile-info-row__label">{m(locale, "profile.email")}</span>
        <input
          className="premium-input mt-1.5"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="name@example.com"
        />
      </label>
    </ProfileSavePanel>
  );
}
