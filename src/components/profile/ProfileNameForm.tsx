"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { ProfileSavePanel, postProfileJson } from "@/components/profile/ProfileSavePanel";

type Props = {
  locale: Locale;
  initialName: string;
};

export function ProfileNameForm({ locale, initialName }: Props) {
  const parts = initialName.trim().split(/\s+/).filter(Boolean);
  const [firstName, setFirstName] = useState(parts[0] ?? "");
  const [lastName, setLastName] = useState(parts.slice(1).join(" "));

  return (
    <ProfileSavePanel
      saveLabel={m(locale, "profile.save")}
      savingLabel={m(locale, "profile.saving")}
      savedLabel={m(locale, "profile.saved")}
      onSubmit={async () => {
        const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
        await postProfileJson("/api/profile/name", { name });
      }}
    >
      <label className="block">
        <span className="profile-info-row__label">{m(locale, "profile.firstName")}</span>
        <input
          className="premium-input mt-1.5"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoComplete="given-name"
        />
      </label>
      <label className="block">
        <span className="profile-info-row__label">{m(locale, "profile.lastName")}</span>
        <input
          className="premium-input mt-1.5"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          autoComplete="family-name"
        />
      </label>
    </ProfileSavePanel>
  );
}
