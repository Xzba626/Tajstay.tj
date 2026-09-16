export type ThemePreference = "system" | "light" | "dark";

export const THEME_COOKIE = "tajstay_theme";

export function normalizeTheme(input?: string | null): ThemePreference {
  if (input === "light" || input === "dark" || input === "system") return input;
  return "system";
}

/** The `data-theme` attribute value to render server-side for a given preference. "system" means
 * omit the attribute entirely so the `@media (prefers-color-scheme: dark)` CSS fallback decides —
 * this is what lets "System" actually track the OS without any client-side JS re-render. */
export function themeAttrFor(pref: ThemePreference): "light" | "dark" | undefined {
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  return undefined;
}
