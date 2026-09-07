import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

const TIP_KEYS = ["photos", "messages", "calendar", "rules"] as const;

export function OwnerHelpTips({ locale }: { locale: Locale }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {TIP_KEYS.map((key) => (
        <div key={key} className="owner-panel owner-panel--accent">
          <h3 className="owner-panel__title">{m(locale, `owner.help.tips.${key}.title`)}</h3>
          <p className="owner-panel__body">{m(locale, `owner.help.tips.${key}.text`)}</p>
        </div>
      ))}
    </div>
  );
}
