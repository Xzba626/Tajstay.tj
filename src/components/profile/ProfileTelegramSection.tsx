"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { TelegramLoginPanel, type TelegramLoginLabels } from "@/components/auth/TelegramLoginPanel";
import { postProfileJson } from "@/components/profile/ProfileSavePanel";

type Props = {
  locale: Locale;
  connected: boolean;
  displayValue: string;
  labels: TelegramLoginLabels;
};

export function ProfileTelegramSection({ locale, connected, displayValue, labels }: Props) {
  const router = useRouter();
  const [flowActive, setFlowActive] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    if (disconnecting) return;
    setDisconnecting(true);
    setError(null);
    try {
      await postProfileJson("/api/profile/telegram/disconnect", {});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : m(locale, "profile.errSave"));
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="profile-panel profile-panel--stack">
      <div className="mockup-contact !p-0 !shadow-none !border-0 !bg-transparent">
        <div className="mockup-contact__icon" aria-hidden>
          <Send size={32} strokeWidth={1.5} />
        </div>
        <div className="mockup-contact__value">{displayValue}</div>
        <p className="mockup-contact__hint">{m(locale, "profile.contactTelegramHint")}</p>
      </div>

      {error ? (
        <p className="taj-form-error taj-form-error--compact" role="alert">
          {error}
        </p>
      ) : null}

      {connected ? (
        <button
          type="button"
          className="btn-secondary w-full"
          disabled={disconnecting}
          onClick={() => void disconnect()}
        >
          {disconnecting ? m(locale, "profile.saving") : m(locale, "profile.disconnectTelegram")}
        </button>
      ) : (
        <>
          {!flowActive ? (
            <button type="button" className="btn-primary w-full" onClick={() => setFlowActive(true)}>
              {m(locale, "profile.connectTelegram")}
            </button>
          ) : null}
          <TelegramLoginPanel
            expanded={flowActive}
            onExpandedChange={setFlowActive}
            labels={labels}
            challengeUrl="/api/profile/telegram/challenge"
            verifyUrl="/api/profile/telegram/verify"
            onSuccess={() => {
              setFlowActive(false);
              router.refresh();
            }}
            onError={(msg) => setError(msg)}
          />
        </>
      )}
    </div>
  );
}
