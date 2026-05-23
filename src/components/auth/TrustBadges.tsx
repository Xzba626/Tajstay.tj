import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { TrustBadge } from "@/lib/auth/trustBadges";
import { cn } from "@/lib/cn";

const STYLES: Record<string, string> = {
  phoneVerified: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
  emailVerified: "bg-teal-500/15 text-teal-200 ring-teal-400/30",
  ownerVerified: "bg-amber-500/15 text-amber-100 ring-amber-400/30"
};

type Props = {
  locale: Locale;
  badges: TrustBadge[];
  size?: "sm" | "md";
  className?: string;
};

export function TrustBadges({ locale, badges, size = "sm", className }: Props) {
  if (!badges.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {badges.map((b) => (
        <span
          key={b.key}
          className={cn(
            "inline-flex items-center gap-1 rounded-full font-semibold ring-1",
            size === "sm" ? "px-2 py-0.5 text-[10px] sm:text-xs" : "px-2.5 py-1 text-xs",
            STYLES[b.key] ?? "bg-white/10 text-white ring-white/15"
          )}
        >
          <span aria-hidden>✓</span>
          {m(locale, b.i18nKey)}
        </span>
      ))}
    </div>
  );
}
