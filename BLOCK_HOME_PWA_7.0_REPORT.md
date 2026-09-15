# BLOCK HOME/PWA 7.0 — Mobile Home Lock + Search Icon System + New TajStay App Icon

Implementation block. Two of three scoped items are complete and verified; the third (app icon
replacement) is blocked on a missing input, stated precisely below — not a capability I lack, an
asset I haven't been given.

## HOME ROOT CAUSE

Two independent causes were found, not one:

1. **Real-device-only bug, invisible in any devtools/emulated viewport**: `src/app/layout.tsx`'s
   `<body>` used Tailwind's `min-h-screen` (`min-height: 100vh`), and `src/app/globals.css` had a
   second, independent `body { min-height: 100vh; }` rule. `100vh` is a **fixed** value computed
   once; on a real mobile browser it's taller than the space actually visible while the URL bar is
   showing, and doesn't shrink/grow as that browser chrome collapses/expands while scrolling. This
   produces exactly the "page can be meaninglessly dragged" feel — but every viewport this session
   emulated measured `scrollHeight === innerHeight` (zero scroll) at 360/375/390/430px, because an
   emulated viewport has no real, resizing browser chrome to reveal the bug. This explains why the
   defect was real on your phone but didn't reproduce here at those widths.
2. At the genuinely small 320×568 viewport, the full stacked form (title + 4 fields + button)
   legitimately does not fit in 568px of height — a real content-overflow case, not a bug (the
   spec's own acceptance rule: scroll is fine when content genuinely doesn't fit; only *meaningless*
   scroll is the defect).

## HOME FIX

- `src/app/layout.tsx`: `<body>` class changed from `min-h-screen` to `min-h-dvh`
  (`min-height: 100dvh`) — dvh tracks the real, currently-visible viewport as mobile browser chrome
  changes, instead of a value computed once and left stale.
- `src/app/globals.css`: the same fix applied to the file's own independent `body { min-height:
  100vh }` rule, so there are no longer two different rules disagreeing with each other.
- No `position: fixed` was used anywhere, per the explicit prohibition — the fix is two one-line
  unit changes, not a layout restructure. `.home-section--hero`'s existing `min(…, calc(100svh -
  4.5rem))` desktop rule (already using a modern viewport unit, already correct) was left
  untouched.

## SEARCH ICON SYSTEM

**Before**: only the City field (`src/components/SearchBar.tsx`, the real mobile search form) had
an icon; Check-in, Check-out, and Guests had none. The real desktop search form
(`src/components/home/HomeSearchCompact.tsx`'s `hidden md:block` form branch — confirmed via
`src/app/page.tsx` to be the one actually rendered on desktop, since it's nested inside an outer
`hidden md:block` wrapper) had **no icons on any field**.

**Fix**: added a `Calendar` icon (Check-in, Check-out) and a `Users` icon (Guests) from
`lucide-react` — the same icon family already used elsewhere in this project (confirmed via the
existing `HomeSearchCompact` mobile-row buttons, which already used `MapPin`/`Calendar`/`Users`).
Same stroke weight (2) and size (16px) as the pre-existing City icon, for visual consistency. Added
matching icons (`MapPin`, `Calendar`, `Users`) to the desktop form too, with new
`.premium-input-with-icon`/`.premium-input-icon`/`.premium-input--with-icon` CSS in
`premium-overhaul.css`. All icons are `aria-hidden` and purely decorative — every field keeps its
own real `<label>`/`aria-label`, confirmed via the new test script (§ tests below), not removed or
replaced by the icon.

**Not touched**: `HomeSearchCompact`'s own internal mobile-row branch (the one with the bottom-sheet
city/dates/guests pickers) is currently dead code under `page.tsx`'s wiring — it's wrapped in an
outer `hidden md:block` that already hides it on mobile, so its own inner `md:hidden` branch never
renders. It already had icons anyway. Flagging this as dead code for a future cleanup pass, not
fixing it now — out of scope for this block.

## DATE INPUT MOBILE

Checked as requested (item 10): the native `<input type="date">` empty-state placeholder segments
("дд.мм.гггг") render in dark, high-contrast text (`rgb(20, 35, 27)` on white) — confirmed via
`getComputedStyle`, not just a screenshot glance. **Already correct, no fix needed** — reported
honestly as "checked, no defect found" rather than inventing a change to justify this section.

## APP ICON — BLOCKED, waiting on one input

**I do not have the new source asset.** The message that authorized this block described it in
detail but did not attach a file, and nothing new appeared on disk in this session (checked before
starting: `find` across the project directory and this session's scratchpad for any PNG/SVG newer
than the last known-good file — nothing). This is not a repeat of the earlier "I have no
image-generation tool" issue — that concern is moot once a real file exists; the actual blocker now
is simply that the file itself hasn't reached this session.

**Audit done while waiting (§2 of the spec), so no time is lost once the file arrives**:

| Source file | Referenced by | Purpose | Size(s) | Current asset |
|---|---|---|---|---|
| `public/brand/tajstay-icon.png` | `src/lib/brand.ts` (`BRAND.favicon`) → `layout.tsx` metadata icons array, `PwaInstallPrompt.tsx` install-preview image | App/install icon source | 512×512, dark emerald bg (`#062418`/`#004724`) with the mark composited on top | **This is the "small dark-green square" you want replaced.** |
| `public/brand/tajstay-mark.png` | `BRAND.logoMark` → `BrandMark.tsx` (site header logo, incl. Admin header) | In-app header icon | Transparent-background, trimmed mark | Already text-free (cropped from the full logo by the existing generator script) — not the icon you're unhappy with. |
| `public/brand/tajstay-logo-full.png` | `BRAND.logoFull` → `SplashScreenClient.tsx` | Splash screen | Full logo, wordmark included | Splash screen showing the full name is normal/expected — not in scope to change. |
| `public/icons/icon-192.png`, `icon-512.png` | `public/manifest.webmanifest` (`purpose: "any"`) | PWA install icon | 192×192, 512×512 | Generated from `tajstay-icon.png` via `scripts/generate-pwa-icons.mjs` — inherits the dark-emerald background. |
| `public/icons/icon-maskable-192.png`, `icon-maskable-512.png` | manifest (`purpose: "maskable"`) | Android adaptive icon | same two sizes | Generated the same way; safe-zone (82% inner content) already implemented correctly in the existing script. |
| `public/apple-touch-icon.png` | `layout.tsx` `<link rel="apple-touch-icon">` | iOS home screen | 180×180 | Generated the same way. |
| `src/app/icon.png`, `src/app/apple-icon.png`, `src/app/favicon.ico` | Next.js metadata file convention (auto-served, auto-hashed) | Browser tab favicon | 48×48, 180×180, 32×32-in-ICO | Generated the same way. |
| `public/favicon.ico`, `public/favicon.png` | `layout.tsx` `<link rel="icon">` (fallback for browsers that don't honor the Next.js convention) | Browser tab favicon | 32×32 | Generated the same way. |

**Existing generation pipeline** (`scripts/generate-brand-assets.mjs` → `scripts/generate-pwa-icons.mjs`,
both already in this repo, both `sharp`-based/deterministic) currently assumes the source has a
wordmark below the mark (it crops the top 58%, strips near-white pixels to transparency, then
composites onto a dark-emerald square for the app icon). **Your new asset breaks that assumption on
purpose** — it's already text-free and already white-background. I will need to adjust
`generate-brand-assets.mjs` so the app-icon step composites onto **white**, not emerald (matching
your explicit "white background" requirement), and skip the wordmark-crop step entirely since
there's no wordmark to remove. This is a small, well-scoped script edit, ready to make the moment
the file arrives — not a redesign of the pipeline.

**What I need from you**: the finished mark, as a single file — ideally **1024×1024 or larger
PNG**, plus the source vector if you have one, matching the spec you already exactly described
(mark only, no "TAJSTAY" text, white background, ~80% safe-zone margin for the graphic content).
Attach it to your next message and I'll run the full pipeline (regenerate every size in the table
above, update the manifest with normal — not query-string — versioned filenames so an already-
installed PWA actually picks up the change, verify locally, report exact before/after evidence).

**Cache/versioning plan** (documented now, executed once the asset lands): the manifest's icon
files (`/icons/icon-*.png`) are plain static files with no automatic cache-busting, unlike
`src/app/icon.png`/`apple-icon.png` (Next.js's metadata-file convention already appends a content
hash automatically). I will rename the manifest-referenced files with a version suffix (e.g.
`icon-512-v2.png`) and update `manifest.webmanifest` to point at the new names — a real filename
change, not a `?v=` query hack, so browsers/OS PWA installers are forced to fetch the new bytes
rather than serve a cached copy under the old URL. I will **not** claim an already-installed PWA on
your phone will silently update its home-screen icon without you reinstalling/re-adding it — no web
platform guarantees that, and overclaiming it would repeat exactly the kind of unproven-certainty
mistake this project's evidence discipline exists to prevent.

## MOBILE VIEWPORT ACCEPTANCE

| Viewport | scrollRange (px) | Horizontal overflow | Notes |
|---|---|---|---|
| 320×568 | 154 | none | Genuine content overflow (form doesn't fit at this height) — expected per spec, not a defect; Search button reachable by scrolling, nothing clipped |
| 360×800 | 0 | none | |
| 375×812 | 0 | none | |
| 390×844 | 0 | none | All 4 icons + title + button fit with bottom nav visible, no scroll |
| 430×932 | 0 | none | |

Keyboard-open/date-input/guest-selector interaction states were not separately driven in this pass
beyond the static contrast check above (§ Date input) — the `dvh` fix and icon additions don't
change focus/keyboard behavior, so this wasn't re-tested destructively; flagged here rather than
silently assumed.

## DESKTOP REGRESSION

Checked 1280 and 1440 (1920 not available — same Browser-pane physical-render-surface limitation
documented in the ADMIN 6.1B report; not fabricated as tested). Search form intact, all four icons
render correctly and aligned (`lucide-map-pin`, `lucide-calendar` ×2, `lucide-users` — confirmed via
DOM query, not just visually), no horizontal overflow, hero spacing unchanged (not touched by this
pass), no unexpected fixed positioning introduced.

## ADMIN REGRESSION CHECK

Not in scope for this block, but re-verified anyway since `globals.css`'s `body{}` rule is
site-wide: `/dashboard/admin?section=dashboard` at 1440×900 still shows exactly one header, correct
compact spacing, no regression from the `dvh` change (Admin's own shell already used `dvh`-based
calcs from ADMIN 6.1, so this was a consistency win, not a risk).

## FILES CHANGED

Modified (5):
- `src/app/layout.tsx` — `<body>` `min-h-screen` → `min-h-dvh`
- `src/app/globals.css` — bare `body{}` rule `100vh` → `100dvh`
- `src/components/SearchBar.tsx` — added Check-in/Check-out/Guests icons (mobile form)
- `src/components/home/HomeSearchCompact.tsx` — added City/Check-in/Check-out/Guests icons
  (desktop form)
- `src/styles/premium-overhaul.css` — new `.premium-input-with-icon`/`.premium-input-icon`/
  `.premium-input--with-icon` rules for the desktop form's icons

Created (1):
- `scripts/test-block7-home-search.ts` — targeted regression tests

No Admin, booking, payment, auth, chat, Prisma, or monetization file touched.

## TESTS / STATIC / BUILD

```
TSX_TSCONFIG_PATH=tsconfig.scripts.json npx tsx scripts/test-block7-home-search.ts
→ 23 passed, 0 failed

npx tsc --noEmit          → PASS (zero errors)
npx eslint <touched files> → PASS (zero errors/warnings)
npm run build (next build) → PASS, exit code 0
```

## REPORT FORMAT

```
HOME ROOT CAUSE           = FOUND — fixed 100vh (real-device-only) + genuine 320px overflow (expected)
HOME FIX                  = APPLIED — min-h-dvh in layout.tsx and globals.css, no position:fixed used

SEARCH ICON SYSTEM        = COMPLETE — City/Check-in/Check-out/Guests, one lucide family, mobile + desktop
DATE INPUT MOBILE         = CHECKED, ALREADY CORRECT — no fix needed, verified via computed style

APP ICON OLD SOURCE       = public/brand/tajstay-icon.png (512, dark-emerald #062418 background)
APP ICON NEW SOURCE       = NOT YET RECEIVED — blocked, see "APP ICON" section above
FILES GENERATED           = NONE YET — nothing to generate without the source file
MANIFEST/METADATA UPDATED = NOT YET — plan documented, not executed
CACHE STRATEGY            = PLANNED — real versioned filenames (e.g. icon-512-v2.png), not query-string

MOBILE 320  = PARTIAL (real content overflow at this height, not a defect, scroll works correctly)
MOBILE 360  = PASS (scrollRange 0)
MOBILE 375  = PASS (scrollRange 0)
MOBILE 390  = PASS (scrollRange 0)
MOBILE 430  = PASS (scrollRange 0)

DESKTOP 1280 = PASS
DESKTOP 1440 = PASS

STATIC        = PASS
TESTS         = PASS (23/23)
BUILD         = PASS (exit 0)
LOCAL RUNTIME = PASS (Home + Search pages, both forms, all 5 mobile widths + 2 desktop widths)
PRODUCTION RUNTIME = PENDING OWNER DEPLOYMENT (same access limitation as ADMIN 6.1B — no
                      deployment/log access from this environment)
PRODUCTION INSTALLED ICON = PENDING OWNER DEPLOYMENT (and pending the new source asset itself)
USER VISUAL ACCEPTANCE = PENDING
```

## STOP

Home viewport-lock and Search icon system are done and verified locally. App-icon replacement is
the one open item, blocked on a single missing input (the source file) — not started blind, not
faked, not deferred by choice. Send the file and I'll finish that piece in the same pass rather than
waiting for a new block. No other block started.
