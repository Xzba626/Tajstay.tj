import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

const TIP_KEYS = ["photos", "messages", "calendar", "rules"] as const;

export function OwnerHelpTips({ locale }: { locale: Locale }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {TIP_KEYS.map((key) => (
        <div key={key} className="rounded-2xl border border-emerald-200/30 bg-emerald-950/20 p-5">
          <h3 className="text-sm font-semibold text-emerald-100">{m(locale, `owner.help.tips.${key}.title`)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{m(locale, `owner.help.tips.${key}.text`)}</p>
        </div>
      ))}
    </div>
  );
}
