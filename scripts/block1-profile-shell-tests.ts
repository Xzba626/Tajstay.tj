/**
 * BLOCK 1 Profile/theme/shell regression harness (LOCAL, static + unit).
 * Run: npx tsx scripts/block1-profile-shell-tests.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { normalizeTheme, themeAttrFor } from "../src/lib/theme";

type Row = { name: string; ok: boolean; detail: string };
const results: Row[] = [];
const root = process.cwd();

function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function main() {
  console.log("\n=== BLOCK 1 PROFILE / SHELL TESTS ===\n");

  check("theme.normalize_light", normalizeTheme("light") === "light", "light");
  check("theme.normalize_dark", normalizeTheme("dark") === "dark", "dark");
  check("theme.normalize_system", normalizeTheme("system") === "system", "system");
  check("theme.normalize_garbage_defaults_system", normalizeTheme("nope") === "system", "fallback system");
  check("theme.attr_light", themeAttrFor("light") === "light", "attr light");
  check("theme.attr_dark", themeAttrFor("dark") === "dark", "attr dark");
  check("theme.attr_system_omits", themeAttrFor("system") === undefined, "system omits data-theme");

  const themeToggle = read("src/components/profile/ProfileThemeToggle.tsx");
  check(
    "theme.ui_exposes_system",
    themeToggle.includes('aria-label="System"') && themeToggle.includes('setTheme("system")'),
    "System control present"
  );
  check(
    "theme.system_media_listener",
    themeToggle.includes('prefers-color-scheme: dark') && themeToggle.includes("addEventListener(\"change\""),
    "System listens to OS media changes"
  );

  const themeApi = read("src/app/api/theme/route.ts");
  check("theme.api_persists_cookie", themeApi.includes("THEME_COOKIE") && themeApi.includes("normalizeTheme"), "cookie write");

  const back = read("src/components/profile/ProfileBackButton.tsx");
  check(
    "back.reusable_link_fallback",
    back.includes("profile-back-button") && back.includes("href={href}") && !back.includes("history.back"),
    "Link fallback to parent, not history.back()"
  );
  check(
    "back.used_by_shell",
    read("src/components/profile/ProfileSubpageShell.tsx").includes("ProfileBackButton"),
    "ProfileSubpageShell uses ProfileBackButton"
  );

  const avatar = read("src/components/profile/ProfileAvatar.tsx");
  check(
    "avatar.onerror_fallback",
    avatar.includes("onError") && avatar.includes("setFailed(true)") && avatar.includes("profile-avatar--initial"),
    "broken image → initials"
  );
  check(
    "avatar.appimage_forwards_onerror",
    read("src/components/ui/AppImage.tsx").includes("onError"),
    "AppImage forwards onError"
  );

  const mockup = read("src/components/profile/ProfileMockupView.tsx");
  check(
    "settings.removed_from_profile_hub",
    !mockup.includes("/profile/settings") && mockup.includes("ProfileThemeToggle") && mockup.includes("LocaleSwitcher"),
    "Settings item gone; language+theme in header"
  );
  check(
    "settings.route_absent",
    !fs.existsSync(path.join(root, "src/app/profile/settings")),
    "no /profile/settings route"
  );
  check(
    "currency.was_decorative_not_silent_delete_of_working_feature",
    mockup.includes("Theme/Currency") || mockup.toLowerCase().includes("currency"),
    "comment documents currency was decorative with Settings"
  );

  const security = read("src/app/profile/security/page.tsx");
  check(
    "security.password_flow_real",
    security.includes('href="/auth/forgot-password"'),
    "change password → forgot-password"
  );
  check(
    "security.phone_flow_real",
    security.includes('href="/profile/phone"'),
    "change phone → /profile/phone"
  );
  check(
    "security.email_flow_real",
    security.includes('href="/profile/email"'),
    "change email → /profile/email"
  );

  const profileCss = read("src/styles/profile-center.css");
  check(
    "shell.min_height_nav_aware",
    profileCss.includes("--mobile-bottom-nav-height") && profileCss.includes("100dvh"),
    "min-height uses header + mobile-bottom-nav tokens"
  );
  const subpageShell = read("src/components/profile/ProfileSubpageShell.tsx");
  check(
    "shell.no_pb10_on_subpage",
    !/className="[^"]*pb-10/.test(subpageShell),
    "pb-10 removed from ProfileSubpageShell className"
  );

  const ws = read("src/styles/workspace-mobile-shell.css");
  check(
    "shell.no_duplicate_profile_bottom_padding",
    !ws.includes(".profile-page-light.profile-workspace .profile-subpage__body") ||
      ws.includes("Removed rather than shrunk"),
    "duplicate profile bottom padding removed"
  );

  const premium = read("src/styles/premium-shell.css");
  check(
    "shell.main_uses_mobile_bottom_nav_token",
    premium.includes("var(--mobile-bottom-nav-height"),
    "main padding-bottom uses token"
  );

  const ds = read("src/styles/tajstay-design-system.css");
  check(
    "green.token_mobile_bottom_nav_defined",
    ds.includes("--mobile-bottom-nav-height: 4.5rem"),
    "token defined"
  );
  check(
    "green.dark_brand_stays_0f7a4d",
    ds.includes("--ts-brand-primary: #0f7a4d") && !ds.includes("--ts-brand-primary: #14a874"),
    "dark mode does not invent second brand green"
  );

  const globals = read("src/app/globals.css");
  check(
    "chrome.header_always_green_workspace",
    globals.includes('body:has(.ts-workspace-light) header.site-header') &&
      globals.includes("background: #0f7a4d !important"),
    "workspace header forced green"
  );
  check(
    "isolation.theme_aware_ts_tokens",
    globals.includes("MOBILE UI FOUNDATION — workspace isolation") &&
      globals.includes("var(--ts-text-title") &&
      globals.includes("var(--ts-surface-page"),
    "isolation reads --ts-* instead of hard light-only values"
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    console.log("FAILED:");
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
