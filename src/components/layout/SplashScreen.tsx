import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { SplashScreenClient } from "@/components/layout/SplashScreenClient";

export async function SplashScreen() {
  const locale = getLocale();
  return <SplashScreenClient subtitle={m(locale, "splash.subtitle")} />;
}
