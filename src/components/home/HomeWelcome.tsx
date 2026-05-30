import { getSessionUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

export async function HomeWelcome({ locale }: { locale: Locale }) {
  const user = await getSessionUser();
  if (!user) return null;

  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;

  return (
    <p className="mockup-welcome md:hidden">
      {m(locale, "home.welcome", { name: firstName })}
    </p>
  );
}
