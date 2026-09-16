# TAJSTAY — MASTER SCREENSHOT CORRECTION BLOCK, BATCH 01 — Progress Report

Per the mandatory sequential-closure rule, this reports exactly what has real PASS evidence and
stops there — it does not distribute shallow effort across all 17 issues to look complete.

## ISSUE 01 — Desktop header: black notification bell

**ROOT CAUSE**: Two separate, unrelated global CSS rules in `src/app/globals.css` — both legacy
"reset accidental dark-theme classes back to a brand-safe default" rules using **substring**
attribute selectors (`[class*="..."]`), which match a Tailwind class ANYWHERE the substring
appears, not just as a whole class:

1. `[class*="bg-white/"], [class*="bg-slate-900/"], [class*="bg-slate-950/"] { background: ...
   !important; border-color: rgba(42,74,64,.9) !important; box-shadow: var(--ds-shadow-soft)
   !important; ... }` — meant to neutralize old translucent dark-glass cards (`bg-white/10` etc.),
   but the bell's own `hover:bg-white/[0.12]` class token also contains the literal substring
   `bg-white/`, so it matched too. `--ds-shadow-soft` resolves to `0 10px 28px rgba(0,0,0,.28)` —
   exactly the heavy near-black halo visible in the screenshot.
2. `button[class*="border"], a[class*="border"] { border-color: rgb(0 53 29 / 1); color:
   rgb(134 201 160 / 1); ... }` (no `!important`, but wins on raw specificity — an element+attribute
   selector beats a single Tailwind utility class) — matches almost any bordered button in the
   entire app, including this one's plain `border` utility, and was independently darkening the
   border and tinting the icon color green instead of white.

Both were found by downloading and grep'ing the actual compiled CSS output (`curl` +
`grep`), not guessed — this session's live CSSOM introspection (`document.styleSheets[0].cssRules`)
throws in this sandboxed environment, so the usual method was replaced with reading the compiled
file directly, and the exact matching selectors and values are quoted above.

**FILES CHANGED**: `src/components/layout/NotificationBell.tsx` only. The two hazardous global
selectors themselves were **not** rewritten — they have other real, working consumers (legacy
dark-glass cards) that were not regression-tested in this pass; narrowing a broad `!important`
rule blindly under time pressure would trade one confirmed bug for an unconfirmed one elsewhere.
Documented in-code as a known landmine for whoever next touches a `bg-white/*` or bordered button
class anywhere in this app.

**IMPLEMENTATION**: Changed `hover:bg-white/[0.12]` → `hover:bg-[rgba(255,255,255,0.12)]` (avoids
the substring entirely, same visual hover effect) and added `!border-white/35` / `!text-white`
(these two specific overrides have no competing `!important` from the landmine rules, so they win
cleanly without needing to touch the landmine itself).

**TARGET COMPARISON** — measured via `getComputedStyle`, not eyeballed:

| Property | Before | Target | After |
|---|---|---|---|
| box-shadow | `rgba(0,0,0,.28) 0 10px 28px` | light/none | `rgba(0,0,0,.05) 0 1px 2px` (Tailwind `shadow-sm`) |
| border-color | `rgb(0,53,29)` (near-black-green) | translucent white | `rgba(255,255,255,.35)` |
| icon/text color | `rgb(134,201,160)` (green tint) | white | `rgb(255,255,255)` |

**TEST**: No automated test added (this is a pure CSS/class fix with no logic branch to unit-test);
verified via live computed-style assertions instead, which is the strongest available check for a
CSS cascade bug.

**REAL RUNTIME**: Verified live with a real authenticated guest session (not a mock), at both
1280×800 and 1440×900. Screenshot confirms the bell now renders as a normal white outline on the
green header, matching the language-switcher control next to it — no longer a black square.

**MOBILE**: The specific black-bell defect is desktop-header-only (`NotificationBell.tsx` — the
public consumer header at these widths shows the same component; mobile home-screen check at
390×844 during this pass showed a clean header with no black-bell artifact).

**DESKTOP**: 1280 and 1440 verified. 1920 not verified — this session's Browser pane cannot
physically render a viewport wider than its own screenshot capture surface (same documented
limitation from the ADMIN 6.1A pass); not fabricated as tested.

**EVIDENCE**: `getComputedStyle` output before/after (quoted above), before/after screenshots,
compiled-CSS grep output identifying the exact two selectors.

**STATUS: PASS**

---

## ISSUE 15 — Broken/strange mobile header icon (investigated, NOT reproduced locally)

Checked the mobile Home header at 390×844 with a real authenticated session — it rendered a clean
initials avatar ("T" in a green circle), no broken-image artifact. I do not have direct access to
the production screenshots you described (2–9) as image files to compare pixel-for-pixel, and this
specific defect did not reproduce on Home. Given ISSUE 01 already proved this codebase has a
genuine, systemic pattern of broad substring-matching CSS rules silently breaking unrelated
components, this remains a credible, not-yet-located defect — most likely on a different screen
(Search/Tours/History, none of which were reached this pass) or specific to a real-device/production
condition this local session can't reproduce.

**STATUS: BLOCKED** — external blocker: cannot reproduce without either (a) the actual screenshot
files to identify which exact screen/component shows it, or (b) reaching the specific screens
(Search/Tours/History) in a later pass of this same batch, which sequential-closure discipline
does not yet permit since ISSUES 02–14 haven't been reached.

---

## ISSUES 02–14, 16–17 — NOT REACHED THIS PASS

Per the batch's own sequential-closure rule, these are reported exactly as `BLOCKED` (not started,
not attempted, not partially guessed) rather than left silently unmentioned:

- **02** Mobile Home stable-first-screen-after-refresh — not investigated this pass (distinct from
  the earlier `100dvh` fix; this issue specifically demands testing the pull-to-refresh lifecycle,
  which needs a dedicated reproduction pass).
- **03** Mobile search bar proportions — not started.
- **04** Mobile Search IA (hide marketing sections) — not started.
- **05** Mobile map CTA — not started.
- **06** Mobile hotel result card rework — not started.
- **07** Two-column mobile hotel grid — not started.
- **08** Desktop promo contrast — not started.
- **09–10** Tours visual rework + category photo carousels — not started. This is a large media-
  pipeline feature (licensed photo sourcing, optimization, carousel UX) and should not be rushed.
- **11–13** Tours as a real data feature (schema, Admin CRUD, user category flow) — not started.
  This requires a Prisma schema investigation and design before any code, per the block's own
  "investigate existing schema first" rule.
- **14** Owner consumer-History role separation — not started, but investigated conceptually: this
  is a real, well-defined, likely-quick fix once reached (find the History page's owner-role
  branch and remove the redirect-to-owner-panel notice for personal consumer bookings) — flagged
  as a good next target, not attempted this pass.
- **16** Typography/density consistency audit — not started.
- **17** Floating Assistant collision check — not started.

**STATUS: BLOCKED (not started)** for all of the above — none rounded up to PASS, none silently
dropped from this report.

---

## Static gates (for the one completed issue)

```
npx tsc --noEmit           → PASS
npx eslint <touched file>  → PASS
npm run build (next build) → PASS, exit code 0
```

## Final status block

```
CODE               = ISSUE 01 only
STATIC             = PASS
TESTS              = N/A (no test added; verified via live computed-style assertion)
BUILD              = PASS
DB                 = not touched this pass
BACKEND            = not touched this pass
FRONTEND           = NotificationBell.tsx only
MOBILE RUNTIME     = spot-checked (Home only, ISSUE 01 confirmed not present there)
DESKTOP RUNTIME    = PASS at 1280/1440 for ISSUE 01; 1920 unavailable (tooling limitation)
ROLE MATRIX        = not applicable to this issue (header renders identically per role)
SECURITY           = not applicable (presentation-only change)
I18N               = not applicable (no new strings)
DEPLOYED           = not deployed
PRODUCTION RUNTIME = PENDING OWNER DEPLOYMENT
USER VISUAL ACCEPTANCE = PENDING
```

```
git status --short:
 M src/components/layout/NotificationBell.tsx
?? BATCH_01_SCREENSHOT_CORRECTION_REPORT.md
 (plus all prior-session files already known to you from earlier reports — MASTER_COMPLETION_* etc.)

HEAD SHA: unchanged from last checkpoint commit (working-tree edit only, not committed)
Branch: feature/tajstay-full-ui-ux-rebuild
Migrations: none added this pass
Production revision: not verified — no deployment access from this environment
```

## Why this report stops at one PASS instead of a partial pass on all 17

The batch's own rule 0 explicitly forbids "quickly implement everything, then run tests once."
Issue 01 alone required real forensic work — two independent, previously-unknown global CSS
landmines, found by downloading and grepping compiled output because live introspection wasn't
available — that a shallow per-issue pass would not have found or fixed correctly. Distributing
the same remaining effort thinly across the other 16 issues would produce exactly the
"technically touched but not proven" result this whole batch exists to prevent. Continuing
sequentially into ISSUE 02 next, not starting Tours/Admin CRUD/Owner separation out of order.
