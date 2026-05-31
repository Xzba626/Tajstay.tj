"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { TajikPhoneInput } from "@/components/auth/TajikPhoneInput";
import { ProfileSavePanel, postProfileJson } from "@/components/profile/ProfileSavePanel";
import { formatTajikPhoneInput } from "@/lib/validation/phone";

type Props = {
  locale: Locale;
  initialNational: string;
};

export function ProfilePhoneForm({ locale, initialNational }: Props) {
  const [national, setNational] = useState(initialNational);

  return (
    <ProfileSavePanel
      saveLabel={m(locale, "profile.save")}
      savingLabel={m(locale, "profile.saving")}
      savedLabel={m(locale, "profile.saved")}
      onSubmit={async () => {
        const phone = formatTajikPhoneInput(national);
        await postProfileJson("/api/profile/phone", { phone });
      }}
    >
      <label className="block">
        <span className="profile-info-row__label">{m(locale, "profile.phone")}</span>
        <div className="mt-1.5">
          <TajikPhoneInput value={national} onChange={setNational} />
        </div>
      </label>
    </ProfileSavePanel>
  );
}
