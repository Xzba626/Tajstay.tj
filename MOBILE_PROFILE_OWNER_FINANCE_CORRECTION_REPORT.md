# Mobile Profile / Owner Panel / Finance Correction Block — Progress Report

Per the sequential-closure rule, this reports exactly two fully-closed problems with real evidence.
The remaining 13 are honestly listed as not started — no shallow touches, no rounding up.

## PROBLEM 11 — Payment method type showed raw backend enum

**ROOT CAUSE**: `src/components/owner/HotelPaymentMethodsManager.tsx` rendered
`<option value={t}>{t}</option>` directly from the `TYPES = ["CARD","WALLET","BANK","OTHER"]`
array — the literal stored string was also the only visible label. Confirmed by reading the
component before touching it, not assumed.

**CODE CHANGE**: Added a `paymentTypeLabel(locale, type)` presentation function and three new
i18n keys per locale (`owner.paymentMethods.typeCard/typeWallet/typeBank/typeOther`). The Prisma
field (`HotelPaymentMethod.type: String`) and every stored value are **unchanged** — this is
presentation-layer only, per the explicit "don't change the enum just for UI" instruction.

**BUSINESS/BACKEND IMPACT**: None. `POST`/`PATCH` payloads still send/receive the raw `CARD` /
`WALLET` / `BANK` / `OTHER` strings; only what the owner *sees* changed.

**TEST**: No automated test added (pure presentation mapping, four cases); verified live instead.

**MOBILE RUNTIME**: Verified at 375×812 with a real authenticated owner account, real hotel data
(not a mock) — the add-payment-method form now shows "Тип: Карта" instead of "CARD".

**RU/TJ/EN**: RU verified live ("Карта", "Электронный кошелёк", "Банковский счёт", "Другое"). TG
verified live via a locale-cookie switch + reload: "Корт | Ҳамьёни электронӣ | Ҳисоби бонкӣ |
Дигар" — no Russian or raw-enum leakage. EN keys added with the same structure, not runtime-clicked
this pass (same code path as RU/TG, low risk, but not claiming a runtime check that wasn't done).

**EVIDENCE**: Screenshots (RU form + open listbox), live DOM text extraction for TG.

**STATUS: PASS**

---

## PROBLEM 12 — Payment type selector rendered as a dark native OS popup

**ROOT CAUSE**: Same component used a plain `<select>`. A native `<select>`'s dropdown/option list
is rendered by the operating system, not the page's CSS — no amount of styling the trigger element
fixes the popup list itself, which is exactly why it looked like "a dark Android dialog on top of
light TajStay," as described.

**CODE CHANGE**: Replaced the native `<select>` with `PaymentTypeSelect`, a custom
`role="listbox"`/`role="option"` component: click-to-open, click-outside-to-close, `Escape`-to-close,
`aria-expanded`/`aria-haspopup`/`aria-selected` wired correctly. Icons from `lucide-react`
(`CreditCard`, `Wallet`, `Landmark`, `MoreHorizontal`) — the same icon family already used
elsewhere in this project, not emoji. New CSS (`src/styles/owner-command-center.css`): white
surface, `#0f7a4d`-tinted selected row, deliberately **light** even though the surrounding card
uses the owner panel's own darker card chrome — this exact control was named in the spec as
needing to be light regardless of its container.

**TEST**: No automated test added; this is an interactive UI pattern best proven live.

**MOBILE RUNTIME**: Verified at 375×812 — trigger shows the current selection with its icon;
opening it shows a white rounded listbox with all four options, icons, and a checkmark on the
active one (screenshot evidence).

**RU/TJ/EN**: Same evidence as Problem 11 (the label text and the listbox are the same component).

**LIGHT/DARK**: Only Light Mode exists in this codebase right now (Dark Mode is a separate,
much larger unimplemented item — see the "not started" list below); the control was built with
explicit light tokens per spec, ready for a dark-token pass whenever Dark Mode itself is built
project-wide, not before.

**ACCESSIBILITY CHECK**: `Escape` closes the listbox (tested via the component's own keydown
handler, code-reviewed and consistent with the same pattern already used and runtime-verified in
`AdminProfileMenu`/`LocaleSwitcher` elsewhere in this codebase); click-outside closes it (tested
live). Full keyboard arrow-key navigation within the open listbox was **not** implemented or
tested this pass — flagged as a real gap, not silently assumed complete.

**EVIDENCE**: Screenshots (closed + open states, RU).

**STATUS: PASS** for the stated target (no native OS popup, no raw enum, light TajStay surface,
basic keyboard/pointer accessibility); arrow-key listbox navigation is a named remaining gap.

---

## PROBLEMS 1–10, 13–15 — NOT STARTED THIS PASS

Reported exactly as `BLOCKED (not started)`, per the same discipline as the previous batch:

- **1** Profile top-level restructure (remove Settings, add header language+theme controls) — not
  started. Real work: move language selector into a compact header zone, decide the theme-control's
  actual mechanism (see Problem 2).
- **2** Real Dark Mode architecture — not started. This is the single largest item in this block by
  a wide margin (a full semantic-token audit across the entire product, verified in the ADMIN 6.1
  pass to have only ~11 existing dark-theme selectors project-wide). Attempting a shortcut version
  here would produce exactly the "decorative switch with real breakage" outcome explicitly forbidden.
- **3** Security screen scroll/whitespace — not started.
- **4** Reusable ProfileBackButton — not started.
- **5** Profile-wide scroll geometry audit (root vs. compact subpages) — not started.
- **6** Owner Panel "Больше" drawer correction — not started.
- **7** Rejected-hotel edit flow + broken image investigation — not started. This needs a real
  reproduction with an actual rejected hotel's actual uploaded file, not a guess.
- **8** Native file input leaking Russian into Tajik UI — not started, but the root cause is already
  understood in principle (relying on the browser's own `<input type="file">` chrome, which is
  locale-independent of the page and follows the OS/browser language) — real fix is a controlled
  upload component, not yet built.
- **9** Finance screen mixing payment-method config with analytics KPIs — not started. Note: the
  live screenshot taken during Problem 11/12's verification shows the current Finance section
  **does not** currently display revenue/commission/payout KPIs on this exact screen (only the
  Pay-at-check-in toggle and payment methods) — this may already be closer to the target than the
  original screenshot suggested; needs a dedicated check against the exact screen the original
  screenshot was taken from before concluding anything.
- **10** Pay-at-check-in preservation — not touched (correctly — it wasn't broken, and this pass's
  changes didn't go near its logic, confirmed by reading `HotelPaymentMethodsManager.tsx`'s
  `togglePayAtCheckIn` function, which is unchanged).
- **13** Simplify payment details form fields per type — not started.
- **14** Full localization audit of this entire flow — not started (only Problems 11/12's own
  strings were verified).
- **15** Functional (not just visual) runtime audit of Personal/Security/Notifications/Theme/
  Language/Owner/Payment-methods — partially covered incidentally (payment-method create/read
  flow was exercised live as part of proving 11/12), everything else not started.

## Static gates

```
npx tsc --noEmit           → PASS
npx eslint <touched files> → PASS
npm run build (next build) → PASS, exit code 0
```

## Final status block

```
CODE            = Problems 11, 12 only
TEST            = no automated tests added; live runtime verification instead
BUILD           = PASS
MOBILE RUNTIME  = PASS for 11/12 at 375×812; other widths (320/360/390/430) not checked for
                  this specific control this pass
DARK MODE       = N/A — does not exist yet project-wide
I18N            = PASS for 11/12 (RU live-verified, TG live-verified, EN added not runtime-clicked)
SCROLL          = not evaluated this pass (no scroll-affecting change made)
OWNER FLOW      = payment-method create flow exercised live and unaffected in its actual
                  behavior (only the type field's presentation changed)
PAYMENT FLOW    = type selection verified end-to-end through to the visible label; full
                  create/edit/delete regression not re-run this pass (pre-existing logic
                  untouched, low risk, but not claimed as re-tested)
EVIDENCE        = screenshots + live DOM text extraction, documented inline above
```

```
git status --short (new/changed this pass):
 M src/components/owner/HotelPaymentMethodsManager.tsx
 M src/lib/i18n/messages.ts
 M src/styles/owner-command-center.css
?? MOBILE_PROFILE_OWNER_FINANCE_CORRECTION_REPORT.md
```

Continuing sequentially into the next problem, not skipping ahead to Tours/Admin/other blocks.
