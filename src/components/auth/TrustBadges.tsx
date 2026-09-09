import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { TrustBadge } from "@/lib/auth/trustBadges";
import { cn } from "@/lib/cn";

const STYLES: Record<string, string> = {
  phoneVerified: "bg-[#0f7a4d]/10 text-[#0f7a4d] ring-[#0f7a4d]/25",
  emailVerified: "bg-[#0f7a4d]/10 text-[#0f7a4d] ring-[#0f7a4d]/25",
  ownerVerified: "bg-amber-50 text-amber-800 ring-amber-300"
};

type Props = {
  locale: Locale;
  badges?: TrustBadge[];
  size?: "sm" | "md";
  className?: string;
};

export function TrustBadges({ locale, badges = [], size = "sm", className }: Props) {
  if (!badges.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {badges.map((b) => (
        <span
          key={b.key}
          className={cn(
            "inline-flex items-center gap-1 rounded-full font-semibold ring-1",
            size === "sm" ? "px-2 py-0.5 text-[10px] sm:text-xs" : "px-2.5 py-1 text-xs",
            STYLES[b.key] ?? "bg-slate-100 text-slate-700 ring-slate-200"
          )}
        >
          <span aria-hidden>✓</span>
          {m(locale, b.i18nKey)}
        </span>
      ))}
    </div>
  );
}
