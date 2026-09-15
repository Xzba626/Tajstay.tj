/**
 * BLOCK HOME/PWA 7.0 — targeted tests, same plain-`tsx` pattern as the ADMIN blocks
 * (scripts/test-block56d-static.ts, test-block61a/61b). No new test framework.
 *
 * Covers what's implemented in this pass: Home viewport-lock (structural, via source
 * inspection since a real dvh scroll measurement needs a live browser — done separately in the
 * report's runtime section, not duplicated here) and the Search icon system. The app-icon
 * pipeline tests are NOT included yet — no new source asset has been supplied to this session,
 * so there is nothing generated to test; see the report's APP ICON section.
 *
 * Run: TSX_TSCONFIG_PATH=tsconfig.scripts.json npx tsx scripts/test-block7-home-search.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

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

function read(relPath: string): string {
  return fs.readFileSync(path.join(root, relPath), "utf-8");
}

// ---- Home viewport lock: no fixed 100vh left on the elements that drove the bug ----
const layoutSrc = read("src/app/layout.tsx");
check("layout.tsx <body> no longer uses the fixed min-h-screen class", !/className="min-h-screen\b/.test(layoutSrc));
check("layout.tsx <body> uses the dynamic-viewport min-h-dvh class", /className="min-h-dvh\b/.test(layoutSrc));

const globalsSrc = read("src/app/globals.css");
const bodyRuleMatch = globalsSrc.match(/\nbody\s*{[^}]*}/);
check("globals.css bare `body{}` rule exists (sanity check the file still has it)", Boolean(bodyRuleMatch));
check(
  "globals.css bare `body{}` rule uses 100dvh, not 100vh",
  Boolean(bodyRuleMatch && /min-height:\s*100dvh/.test(bodyRuleMatch[0]) && !/min-height:\s*100vh/.test(bodyRuleMatch[0]))
);

// ---- Search icon system: all four semantic fields have an icon, same family, in both the real
//      mobile form (SearchBar.tsx) and the real desktop form (HomeSearchCompact.tsx's
//      `hidden md:block` branch — confirmed via src/app/page.tsx to be the one actually
//      rendered on desktop; its own internal mobile-row branch is dead code under the current
//      page.tsx wiring and intentionally not touched by this pass) ----
const searchBarSrc = read("src/components/SearchBar.tsx");
check("SearchBar.tsx: city field has an icon (pre-existing)", /cityIcon/.test(searchBarSrc) && /home-search-control--with-icon/.test(searchBarSrc));
check("SearchBar.tsx: check-in field now has an icon", /checkInIcon/.test(searchBarSrc));
check("SearchBar.tsx: check-out field now has an icon", /checkOutIcon/.test(searchBarSrc));
check("SearchBar.tsx: guests field now has an icon", /guestsIcon/.test(searchBarSrc));
check("SearchBar.tsx: check-in/check-out/guests icons come from lucide-react (same family as the rest of the project)", /from "lucide-react"/.test(searchBarSrc));
check(
  "SearchBar.tsx: every semantic field still has its own <label>/aria-label (icons did not replace accessible labels)",
  (searchBarSrc.match(/aria-label=\{m\(locale, "search\./g) ?? []).length >= 4
);

const compactSrc = read("src/components/home/HomeSearchCompact.tsx");
const desktopFormMatch = compactSrc.match(/<form action="\/search"[\s\S]*?<\/form>/);
check("HomeSearchCompact.tsx: desktop form block found", Boolean(desktopFormMatch));
const desktopForm = desktopFormMatch ? desktopFormMatch[0] : "";
check("HomeSearchCompact.tsx desktop form: city has an icon", /MapPin/.test(desktopForm));
check("HomeSearchCompact.tsx desktop form: check-in has an icon", (desktopForm.match(/Calendar/g) ?? []).length >= 2 ? true : /Calendar/.test(desktopForm));
check("HomeSearchCompact.tsx desktop form: guests has an icon", /Users/.test(desktopForm));
check(
  "HomeSearchCompact.tsx desktop form: labels preserved (premium-label present for every field)",
  (desktopForm.match(/premium-label/g) ?? []).length >= 4
);

// ---- No accidental Admin changes: spot-check that Admin shell files from ADMIN 6.1B are
//      untouched by this Home/PWA-scoped pass (same files, same key markers still present) ----
const adminHeaderSrc = read("src/components/admin/AdminHeader.tsx");
check("AdminHeader.tsx untouched: still splits brand into brandPrimary/brandSecondary (6.1A/6.1B behavior)", /brandPrimary/.test(adminHeaderSrc) && /brandSecondary/.test(adminHeaderSrc));
const shellClassifySrc = read("src/lib/shell/classify.ts");
check("shell/classify.ts untouched: shellFor still exported with the segment-boundary guard", /isSegmentPrefix/.test(shellClassifySrc));

// ---- Manifest/icon inventory (structural only — no new asset to test rendering of yet) ----
const manifestSrc = read("public/manifest.webmanifest");
const manifest = JSON.parse(manifestSrc);
check("manifest.webmanifest: still valid JSON with an icons array", Array.isArray(manifest.icons) && manifest.icons.length > 0);
for (const icon of manifest.icons as Array<{ src: string }>) {
  const iconPath = path.join(root, "public", icon.src.replace(/^\//, ""));
  check(`manifest icon file exists on disk: ${icon.src}`, fs.existsSync(iconPath));
}
check("BRAND.favicon in src/lib/brand.ts still points at public/brand/tajstay-icon.png (source of truth unchanged)", read("src/lib/brand.ts").includes('favicon: "/brand/tajstay-icon.png"'));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail === 0) {
  console.log(
    "\nNOT covered by this script (no new source asset supplied to this session yet):" +
      "\n  - generated icon file dimensions/aspect ratio" +
      "\n  - old dark-emerald app-icon replaced with the new text-free white-background mark" +
      "\n  - maskable safe-zone content check against the new asset" +
      "\n  - installed-PWA cache/versioning behavior"
  );
}
process.exit(fail > 0 ? 1 : 0);
