/**
 * BLOCK ADMIN 6.1B — targeted tests for the production correction pass. Same pattern as
 * scripts/test-block56d-static.ts / scripts/test-block61a-admin-shell.ts: plain `tsx` script,
 * pure-function checks, no new test framework.
 *
 * Run: TSX_TSCONFIG_PATH=tsconfig.scripts.json npx tsx scripts/test-block61b-shell-correction.ts
 */
import { shellFor as shellForFromClassify } from "../src/lib/shell/classify";
import { shellFor as shellForFromMiddleware } from "../src/middleware";
import { formatDateTimeShort, formatStayDay, formatStayDateRange, formatNumber } from "../src/lib/i18n/format";
import { m } from "../src/lib/i18n/messages";

let pass = 0;
let fail = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    pass += 1;
  } else {
    fail += 1;
    console.error(`FAIL: ${label}`);
  }
}

// ---- A. Admin route family gets one authoritative shell classification (shared source) ----
check("classify.shellFor and middleware's re-export agree on /dashboard/admin", shellForFromClassify("/dashboard/admin") === shellForFromMiddleware("/dashboard/admin"));
check("classify.shellFor: nested admin route -> admin", shellForFromClassify("/dashboard/admin/chat-archive") === "admin");
check("classify.shellFor: nested owner route -> owner", shellForFromClassify("/dashboard/owner/rooms") === "owner");
check("classify.shellFor: consumer route -> consumer", shellForFromClassify("/profile") === "consumer");
check("classify.shellFor: home -> consumer (brand-link target for AdminHeader)", shellForFromClassify("/") === "consumer");
check("classify.shellFor: prefix false-match guard", shellForFromClassify("/dashboard/administrator") === "consumer");

// ---- G. Locale-dependent formatters never throw, regardless of ICU support for a given locale
//         (root-cause defensive fix for the Notifications 500 hypothesis: a small-icu Node
//         runtime lacking tg-TJ data must degrade gracefully, not crash the server component) ----
const now = new Date("2026-09-15T12:00:00Z");
const yesterday = new Date("2026-09-14T12:00:00Z");
for (const locale of ["ru", "tg", "en"] as const) {
  check(`formatDateTimeShort(${locale}) does not throw and returns a non-empty string`, (() => {
    try {
      const s = formatDateTimeShort(locale, yesterday);
      return typeof s === "string" && s.length > 0;
    } catch {
      return false;
    }
  })());
  check(`formatStayDay(${locale}) does not throw`, (() => {
    try {
      return typeof formatStayDay(locale, now) === "string";
    } catch {
      return false;
    }
  })());
  check(`formatStayDateRange(${locale}) does not throw`, (() => {
    try {
      return typeof formatStayDateRange(locale, now, yesterday) === "string";
    } catch {
      return false;
    }
  })());
  check(`formatNumber(${locale}) does not throw`, (() => {
    try {
      return typeof formatNumber(locale, 1234) === "string";
    } catch {
      return false;
    }
  })());
}

// ---- I. Localized error-boundary mapping RU/TG/EN — every key resolves to a distinct,
//         non-empty, non-fallback-to-path string in all three locales ----
const errorKeys = [
  "admin.errorBoundaryBadge",
  "admin.errorBoundaryTitle",
  "admin.errorBoundaryMessage",
  "admin.errorBoundaryRetry",
  "admin.errorBoundaryBackToAdmin"
];
for (const key of errorKeys) {
  for (const locale of ["ru", "tg", "en"] as const) {
    const value = m(locale, key);
    check(`${key} (${locale}) resolves to real copy, not the raw key`, value !== key && value.length > 0);
  }
  const ru = m("ru", key);
  const tg = m("tg", key);
  const en = m("en", key);
  check(`${key}: ru/tg/en are not all identical (real per-locale translation exists)`, !(ru === tg && tg === en));
}

// ---- J. Admin role label localization (production showed "Админ" under TG — confirm this is
//         the project's OWN existing roles.ADMIN translation table, not a raw enum leak) ----
check('roles.ADMIN (tg) is a real translated string, not the raw "ADMIN" enum value', m("tg", "roles.ADMIN") !== "ADMIN" && m("tg", "roles.ADMIN").length > 0);
check('roles.ADMIN (ru) is a real translated string, not the raw "ADMIN" enum value', m("ru", "roles.ADMIN") !== "ADMIN");

// ---- Drawer mistranslation fix: "Боз" ("again", wrong sense) replaced with "Бештар" ("more") ----
check('admin.mobileMore (tg) is no longer the mistranslated "Боз"', m("tg", "admin.mobileMore") !== "Боз");
check('admin.mobileMore (tg) matches this project\'s own existing "more" word ("Бештар")', m("tg", "admin.mobileMore") === "Бештар");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
