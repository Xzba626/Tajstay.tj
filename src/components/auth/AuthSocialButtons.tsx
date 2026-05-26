"use client";

import type { Locale } from "@/lib/i18n/locale";
import { TelegramLoginPanel, type TelegramLoginLabels } from "@/components/auth/TelegramLoginPanel";

type Props = {
  locale: Locale;
  isRegister: boolean;
  googleOAuthEnabled: boolean;
  telegramLoginEnabled: boolean;
  showTelegramConfigWarning: boolean;
  telegramBotUsername?: string | null;
  telegramFlowActive: boolean;
  onTelegramFlowChange: (active: boolean) => void;
  labels: {
    googleContinue: string;
    googleRegister: string;
    googleSignInError: string;
    telegramContinue: string;
    telegramRegister: string;
    telegramRegisterHint: string;
    telegramConfigWarning: string;
    telegram: TelegramLoginLabels;
  };
  onTelegramSuccess: () => void | Promise<void>;
  onError: (message: string) => void;
  onGoogle: () => void;
};

export function AuthSocialButtons({
  locale,
  isRegister,
  googleOAuthEnabled,
  telegramLoginEnabled,
  showTelegramConfigWarning,
  telegramBotUsername,
  labels: L,
  telegramFlowActive,
  onTelegramFlowChange,
  onTelegramSuccess,
  onError,
  onGoogle
}: Props) {
  if (telegramFlowActive) return null;

  return (
    <>
      {showTelegramConfigWarning ? (
        <p className="taj-form-error taj-form-error--inline" role="status">
          {L.telegramConfigWarning}
          {telegramBotUsername ? ` (@${telegramBotUsername.replace(/^@/, "")})` : ""}
        </p>
      ) : null}

      {isRegister && telegramLoginEnabled ? (
        <p className="taj-field-hint taj-field-hint--center">{L.telegramRegisterHint}</p>
      ) : null}

      <div className="taj-social-grid">
        {telegramLoginEnabled ? (
          <TelegramLoginPanel
            locale={locale}
            expanded={false}
            onExpandedChange={onTelegramFlowChange}
            labels={{
              ...L.telegram,
              signIn: isRegister ? L.telegramRegister : L.telegramContinue
            }}
            onSuccess={onTelegramSuccess}
            onError={onError}
          />
        ) : null}

        {googleOAuthEnabled ? (
          <button type="button" className="taj-social-button" onClick={onGoogle}>
            <span className="taj-google-mark" aria-hidden>
              G
            </span>
            <span>{isRegister ? L.googleRegister : L.googleContinue}</span>
          </button>
        ) : null}
      </div>
    </>
  );
}
