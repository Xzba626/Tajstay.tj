# BLOCK 5.6 — MASTER CHAT: Report (Pass 2 — reliability + light-mode visual rebuild)

Branch `feature/tajstay-full-ui-ux-rebuild`. Baseline SHA at block start: `a293df9961cd8a8be5574f528e8910ee69244170`.
All BLOCK 5.5B changes preserved untouched (verified via `git status` before starting — same 6 modified
files + 4 untracked reports/scripts as at 5.5B close). Its four P1s remain **PARTIAL**, not reopened,
not re-litigated in this block.

## 1. DB blocker — unchanged

Re-checked before and after this pass: Postgres still returns `password authentication failed for
user "postgres"` (the shared-instance credential conflict with the unrelated `koryob` project,
root-caused in BLOCK 5.5A.1/5.5B). Not touched — no credential change, no service restart, no reset.
**Every runtime/DB-dependent claim in this report is CODE ONLY / RUNTIME BLOCKED.**

## 2. Chat architecture map + reliability root cause (research, no code change)

Full map delivered via a background research pass (routes, components, update mechanism, dispute vs
complaint systems, system-message storage). Key findings carried into the fixes below:

- **Reliability root cause, confirmed by exact code citation**: `BookingChatPanel.tsx`'s polling
  `useEffect` caught every failed `pull()` (including a 401 from an expired session) with `.catch()`
  that only called `setError()` — the `setInterval` itself was never stopped. An expired session
  therefore polled forever (every 3.5–8s) repeating the same failure indefinitely, with no recovery
  path and no clear signal to the user beyond a small red string. This is the single most concrete
  explanation for the reported "chat randomly stops working" symptom.
- **No `AbortController` anywhere** in the component — a slow/late response could resolve after a
  newer one and silently overwrite it (`applyMessagesPayload` had no ordering guard).
- **Dispute vs Complaint are two separate, non-integrated systems** — see §5.
- **System messages are stored as finished Russian prose** in `ChatMessage.body` (no `type`/`payload`
  columns) — confirmed architectural debt, not touched this pass (§7).
- **`TripBookingCard.tsx` / `TripChatRow.tsx` are dead code** — zero live imports found anywhere in
  `src/` (only self-references and mentions in docs/STATE.md). Not deleted (see §6).

## 3. Reliability fix — `src/components/chat/BookingChatPanel.tsx`

**Not just "401 → stop polling."** Per explicit correction: a stopped-silently poll loop is still a
dead chat from the user's point of view. Implemented a **controlled auth-expired state**:

- `pull()` now tags a 401 response as `{ authExpired: true }` on the thrown error instead of a plain
  `Error` (`BookingChatPanel.tsx` `pull` callback).
- The polling effect's `stopPolling()` helper now sets **both** `error` and a new `authExpired` boolean
  state, and only then clears the interval/SSE — a transient error (500, network blip) still just logs
  to `error` and keeps polling; only a confirmed-dead session stops the loop.
- New dedicated banner (replacing the earlier "small red string" behavior) rendered above the composer
  when `authExpired`: localized "Сессия истекла — войдите снова" text + a real **"Войти снова"** button
  linking to the existing canonical auth route `/auth/sign-in?next=/chat/booking/{bookingId}` — reused
  the app's existing sign-in flow, no second login mechanism invented.
- Composer (attach button, textarea, send button, file input) is now explicitly `disabled` while
  `authExpired`, and the textarea placeholder switches to the session-expired message, so a guest can't
  type into a channel that will just 401 again.
- **No auto-reload of any kind added** — after a real re-login (navigating to `/chat/booking/{id}` again
  via the CTA), the component remounts fresh and polls normally; this was a deliberate choice per the
  explicit "no infinite auto-reload" instruction rather than trying to silently recover the session
  inside the same mount.
- Sequence-counter race guard (`pullSeqRef`) kept from pass 1: each `pull()` call gets a sequence number;
  a response is applied only if no newer `pull()` has started since — a late/out-of-order response from
  request A can no longer stomp a newer response from request B. **Not** upgraded to `AbortController`:
  evaluated it and did not add it, because the sequence-number guard already satisfies the three
  concrete requirements given (no state update from an obsolete request, no duplicate polling loop, no
  stale-payload rollback) without adding request-cancellation complexity/lifecycle risk for a component
  that isn't leaking timers (cleanup already correctly clears `setInterval`/`EventSource` on unmount,
  confirmed by direct reading, not assumed).
- New i18n keys added: `chat.sessionExpired`, `chat.sessionExpiredCta`, `chat.quickRepliesShow`,
  `chat.quickRepliesHide` — RU/TG/EN all present in `src/lib/i18n/messages.ts`.

**Status: CODE ONLY.** `tsc --noEmit` and targeted `eslint` clean. The actual expiry-then-recovery
runtime sequence (real cookie expiry, real 401, real banner, real re-login, real resumed polling)
**could not be executed** — needs a live DB-backed session; explicitly BLOCKED, not claimed as PASS.

## 4. Quick-reply pill compaction — `src/components/chat/BookingChatPanel.tsx`

- Owner (5) and Admin (4) persistent quick-reply pill rows, previously always visible whenever
  `canSend && !chatArchived`, are now collapsed behind a "Быстрые ответы ▾" / "Ҷавобҳои зуд ▾" /
  "Quick replies ▾" toggle (`aria-expanded` + `aria-controls="chat-quick-replies-panel"` wired to the
  revealed panel's `id`). Selecting a reply sends it and closes the panel again.
- **Guest's 3 contextual quick-replies were checked, not auto-exempted**: they only render during
  `WAITING_PAYMENT`/`WAIT_PROOF` (a bounded, urgent window), there are 3 not 5, and they're
  action-relevant to an in-progress payment — collapsing them behind a toggle would hide a
  time-sensitive action from a guest mid-payment. Decision: keep them visible, but their colors were
  still wrong (dark-glass) and are fixed in §5.
- Not verified in a real mobile/desktop viewport this pass (DB blocker — no live booking to open chat
  against). Keyboard focus order and `aria-expanded` wiring were checked by direct code reading only.

**Status: CODE ONLY, layout/interaction not runtime-verified.**

## 5. Light-mode visual rebuild — inventory + fix

**Finding, confirmed by reading `src/styles/chat.css` in full**: TajStay already has a complete,
correctly-tokenized **light-mode** chat design system (`chat-shell`, `chat-header*`, `chat-pill*`,
`chat-date-divider`, `chat-bubble*`, `chat-messages`, `chat-side-card`, `chat-proof-card*`) built on
`--taj-color-*` / `--taj-chat-*` tokens from `src/styles/tokens.css` (`--taj-chat-bg: #f7fcf9`,
`--taj-chat-bubble-guest`: green gradient, `--taj-chat-bubble-host: #ffffff`). This is **not a
dark-mode toggle bug** — TajStay has no dark mode implemented anywhere — it is that
`BookingChatPanel.tsx` was still wired to an **earlier, unmigrated dark-glassmorphism Tailwind
palette** (`bg-slate-950/90`, `border-white/10`, `bg-white/5`, `text-slate-*`, `rgba(15,23,42,…)`)
that coexisted with, and in several places visually overrode, the correct light system. Root cause:
**incomplete migration**, not a missing design system.

**Fix approach, per instruction not to do a mechanical find/replace**: classified every surface by
semantic role first, then mapped each to the *existing* token/class, adding zero new raw hex values
except where the app's own already-used semantic colors (amber `#d97706`/`#92400e` for warnings,
`#b91c1c`/`#b45309` matching `chat-pill--bad`/`chat-proof-card__status--pending`) needed reuse for
consistency with the rest of the file.

| Surface | Before | After |
|---|---|---|
| Status pill (header) | Hand-rolled `rgba()` per status, dark-tinted text | `statusPillClass()` now returns `.chat-pill .chat-pill--{ok,wait,review,bad}` — the existing light-mode variants in `chat.css` |
| Header bar (non-embedded) | `bg-slate-950/90`, `text-white`, `text-slate-400` | `bg-[var(--taj-color-bg-card-solid)]`, `text-[var(--taj-color-text)]`, `text-[var(--taj-color-text-muted)]` |
| Header avatar circle | Green/white gradient meant for dark bg | `bg-[#0f7a4d]/12` + `text-[#0f7a4d]` — brand green on light |
| Admin extend/pause/resume timer buttons | amber/white dark-glass | Existing amber semantic (`#d97706`/`#b45309`) + `--taj-color-*` |
| Overlay close (×) button | `border-white/10 bg-white/5 text-slate-200` | `--taj-color-border` / `--taj-color-bg-card-solid` / `--taj-color-text-secondary` |
| Date separator ("СЕГОДНЯ") | Custom `bg-white/5` heavy pill, `text-slate-500` | `.chat-date-divider` (already a thin, light, non-CTA-looking pill in `chat.css`) |
| System message ("🛡️ Система: …") | Large violet-tinted card, `rounded-xl border-violet-400/20 bg-violet-500/10` | `.chat-bubble--system` (already a small, muted, centered light card in `chat.css`) |
| Message bubble meta/time text | `text-[#d1fae5]/…` / `text-slate-400/500` ad hoc | `.chat-bubble__meta` / `.chat-bubble__time` classes + `text-white/85` (mine, on green) / `--taj-color-text-muted` (theirs, on white) |
| Message delete (×) button | `bg-red-500/90` | `bg-red-600` (kept red — semantically correct, just solid instead of translucent-on-dark) |
| Archived / read-only banners | `border-amber-400/20 bg-amber-500/10 backdrop-blur-md` / `border-white/10 bg-white/5` dark-glass | `.chat-side-card` (existing light card class) + semantic amber text `#b45309` |
| Empty-state text | `text-slate-500` | `--taj-color-text-muted` |
| Toast | `bg-[rgba(15,23,42,0.92)] text-slate-100` dark floating card | `.chat-side-card` + `--taj-color-text` |
| "Действия" actions card | Already using tokens for the outer card (from pass-1-adjacent code) but inner labels/links still `text-slate-400/500`, `bg-white/5`, `text-[#d1fae5]` | All switched to `--taj-color-*` / brand-green-on-light (`#0f7a4d` text on `#0f7a4d/10` bg) |
| Guest 3 quick-reply buttons | `border-white/12 bg-white/5 text-slate-200` (2 of 3) | `--taj-color-border` / `--taj-color-bg-card-solid` / `--taj-color-text-secondary` |
| Owner/Admin quick-reply chips (now behind toggle) | `text-[#d1fae5]` (owner) / `text-indigo-100` (admin) on translucent dark | `text-[#0f7a4d]` (owner, green-on-light) / `text-indigo-700` (admin, darkened for light-bg contrast) |
| `.chat-compose` / `.chat-compose__quick` / `.chat-compose__quick button` / `.chat-compose__row` (`src/styles/chat.css`) | Hardcoded dark green glass (`rgba(1,47,26,0.86)` etc.) — only `.chat-compose`/`.chat-compose__row`/`.chat-compose__input` were being forced light by `globals.css`'s separate "palette lock" `!important` overrides; `.chat-compose__quick button` was **not** covered by that lock and could still render dark | Fixed at the source in `chat.css` itself to `--taj-color-*` tokens, removing the need for the parallel globals.css override to carry it |
| Composer error text | `text-red-300` (low contrast on white) | `text-[#b91c1c]` (same red already used for `chat-pill--bad`) |
| File-name preview | `text-[#d1fae5]/90` | `--taj-color-text-secondary` |

**Explicitly NOT changed**: the lightbox's full-screen black backdrop (`bg-black/90`) — a fullscreen
image viewer being black is standard UI, not the "black card" complaint; the confirm-cancel and
confirm-admin-cancel modals (`bg-[rgba(15,23,42,0.95)]`) — **left as debt**, flagged below, not fixed
this pass (time-boxed; these are less frequently seen than the header/messages/composer and did not
appear in the user's screenshots).

### Per-screenshot defect status

| Defect | Root cause | Fix | Static evidence | Runtime evidence | Status |
|---|---|---|---|---|---|
| A. "Подтверждено" low contrast | Hand-rolled pale-green-on-pale-green `rgba()` pill | Routed through `.chat-pill--ok` (existing light variant, green text `#0f7a4d` on `rgba(34,197,94,0.12)`) | Code read, class swap confirmed | BLOCKED (DB) | PARTIAL |
| B. "СЕГОДНЯ" heavy black pill | Custom `bg-white/5 text-slate-500` never resolved to the intended `.chat-date-divider` | Now literally uses `.chat-date-divider` | Code read | BLOCKED (DB) | PARTIAL |
| C. Giant system message | Custom violet card, no size cap beyond `max-w-[92%]` | Now `.chat-bubble--system` (already compact/muted in `chat.css`) | Code read | BLOCKED (DB) | PARTIAL |
| D. Persistent quick replies | Owner/admin pill rows always rendered | Collapsed behind toggle (§4) | Code read | BLOCKED (DB) | PARTIAL |
| E. Composer bulkiness | N/A — composer already used `.chat-compose*` classes | Fixed the one leak (`.chat-compose__quick button` dark bg at the CSS source) | Code read | BLOCKED (DB) | PARTIAL |
| F. Floating assistant over mobile chat | Not touched this pass | — | — | — | **NOT ADDRESSED** (see §8) |
| G. Bottom nav eating fullscreen chat viewport | Not touched this pass | — | — | — | **NOT ADDRESSED** (see §8) |
| H. Whole-page scroll instead of message-region scroll | Not touched this pass — `.chat-messages`/`.chat-page__thread` already define `flex:1; overflow-y:auto; min-height:0` correctly in `chat.css`, but `BookingChatPanel`'s own non-page presentations (`density`, `overlay`) use fixed px heights (`h-[min(720px,…)]`) that were not audited end-to-end against real mobile viewport/keyboard behavior | — | Partial code read only | — | **NOT VERIFIED** |
| I. Excess whitespace | Not independently re-measured this pass | — | — | — | **NOT ADDRESSED** |
| J. Dashboard-in-dashboard nesting | Partially addressed by the "Действия" card recolor, but the actual nesting (multiple stacked cards) was not restructured | — | — | — | **NOT ADDRESSED** |

**Being explicit rather than declaring a false COMPLETE**: this pass fixed the *color/token* layer for
every chat surface that could be reached via `BookingChatPanel.tsx` and `chat.css`. It did **not**
touch composition/layout (F, G, H, I, J above) — those require the mobile-fullscreen-layout and
header-compaction work from Sections 9/10/11 of the original block, and a real device/viewport check
that the DB outage currently blocks even for a code-only layout change (can't safely verify a
`100dvh`/safe-area layout without rendering it against a real booking). Recoloring is not being
reported as "chat visual rebuild complete."

## 6. Dead chat UI

`TripBookingCard.tsx` / `TripChatRow.tsx` — re-confirmed zero live imports anywhere in `src/`
(grep across the whole tree found only their own files and prose mentions in `docs/` and
`.agent/STATE.md`). **Not deleted.** Both still call live backend routes (`BookingChatLauncher`,
`/api/complaints/create`) — if ever re-wired, they'd resurrect the old single-textarea complaint form.
Marked **DEAD / UNREFERENCED CANDIDATE** — cleanup deferred until after a runtime confirmation pass
(can't rule out a dynamic import or story/dev harness reference without grepping build output, which
needs a completed build — the isolated build in §9 succeeded, which is at least consistent with these
files being safely tree-shakeable dead code, but that is not the same as proof no route depends on them).

## 7. Dispute vs Complaint reconciliation — decision, not yet executed

Traced both systems fully (schema, routes, role checks, lifecycle):

- **`Dispute`** (`prisma/schema.prisma` `Dispute` model; `src/app/api/disputes/route.ts`): live,
  reachable from `DisputeActions.tsx` inside every booking chat room. `POST` role-checks
  guest/owner/admin via `authorizeBookingAccess`-equivalent logic, prevents duplicate `OPEN` disputes
  per booking, notifies guest+owner+all admins via `createNotification`. `GET` is per-booking only —
  **no aggregated admin list exists** for `Dispute` rows anywhere in `dashboard/admin/page.tsx`.
- **`Complaint`** (`Complaint` model; `/api/complaints/create`, `/api/admin/complaints/resolve`):
  creation UI (`TripBookingCard.tsx`) is dead (§6) — the route itself still works and is guest-only,
  rate-limited. Admin **does** have a full list/resolve view for `Complaint` (`dashboard/admin/page.tsx`
  `activeSection === "complaints"`).

**Decision (architecture trace only, no migration executed)**: `Dispute` is the more complete
*live* system (already wired into the real chat UI, already has role/notification plumbing) and
should become canonical; `Complaint` has the better *admin* surface today, which is the one gap
`Dispute` needs closed. Recommended path: build an admin "Споры" (Disputes) list mirroring the
existing Complaints tab, sourced from `Dispute`, then treat `Complaint` creation as legacy-frozen
(not deleted — real historic rows may exist, unverifiable while DB is down) rather than attempting a
data migration blind.

**This admin Disputes list view was NOT built this pass** — it is a genuine new feature (new
`activeSection`, query, resolve route, i18n, nav entry) and building it without any way to
runtime-verify it against the down DB risked shipping an unverified admin surface under time
pressure. Flagged explicitly as the next concrete step rather than silently deferred.

**No destructive action taken** on `Complaint` — schema, routes, and existing rows (if any) are
untouched.

## 8. Explicitly not started this pass (per original block scope and time-boxing)

- Mobile fullscreen chat layout rebuild (Section 9 of the original spec) — header compaction (Section 8/§10 spec ref), floating-assistant/bottom-nav suppression on active chat, single-scroll-container guarantee. These are layout/composition changes, riskier to make blind without a live render, and were not started.
- Role-specific UI separation beyond what already exists (Section 9 of spec) — not audited this pass.
- System-event semantic model / localization migration design (Section 10) — not started; existing plain-Russian-`body` storage confirmed unchanged.
- Admin Disputes list (see §7).
- Confirm-cancel / confirm-admin-cancel modal recoloring — left dark, flagged as remaining debt.

## 9. Quality gate

- `npx tsc --noEmit` — PASS, clean, re-run after every edit.
- `npx eslint` on every touched `.ts`/`.tsx` — PASS, clean. (`chat.css` has no CSS linter configured in this repo — not a gate here.)
- `npm run build` — PASS, isolated single run, exit 0 (first attempt hit an unrelated Windows `EPERM` on `.next/trace`, discarded per this session's build-race discipline; re-run cleanly succeeded).
- No runtime/browser verification performed — DB outage blocks opening any real booking chat.

## 10. Verdict (superseded/extended by §12's 5.6A continuation — final matrix below)

```
CHAT ARCHITECTURE                 = PASS (full map + reliability root cause, evidence-cited)
CHAT RELIABILITY CODE             = PASS STATIC (401/authExpired handling, controlled re-login
                                     state, composer disabled on expiry, sequence-guard race fix;
                                     tsc/eslint/build clean)
CHAT RELIABILITY RUNTIME          = BLOCKED (DB outage — cannot open a real session to expire it)
CHAT LIGHT MODE                   = PASS STATIC (header/pill/date/system-message/toast/banner/
                                     composer/dispute-card token reconciliation; build clean)
CHAT MOBILE LAYOUT CODE           = PASS STATIC (collapsible booking-context block; bottom-nav +
                                     floating-assistant suppression on /chat/booking via existing
                                     isShellHiddenRoute gate, unit-verified 9/9)
CHAT MOBILE RUNTIME               = BLOCKED (DB outage — no authenticated session reachable)
CHAT DESKTOP                      = NOT INDEPENDENTLY RUNTIME-CHECKED (layout unchanged by design —
                                     desktop twin-render kept always-expanded)
CHAT ROLE SEPARATION              = PARTIAL (mutually-exclusive role gates confirmed by code
                                     reading; no tabulated render matrix, no multi-role fixture test)
CHAT DISPUTE FLOW                 = PASS STATIC (guest "Пожаловаться" compact entry, light-mode
                                     recolor, no schema change; Dispute confirmed canonical
                                     direction)
ADMIN DISPUTES                    = PASS STATIC (built in BLOCK 5.6B — "Жалобы и споры" tab
                                     extended with a Dispute grid + resolve action; build/tsc/lint
                                     clean; RUNTIME BLOCKED, not exercised against a real row)
CHAT SECURITY                     = NOT RE-TESTED THIS PASS (existing authorization checks read,
                                     not independently re-verified against a live matrix)
CHAT ATTACHMENTS                  = NOT TOUCHED (out of scope this pass)
CHAT LOCALIZATION                 = PASS STATIC for every new/changed string (RU/TG/EN present:
                                     sessionExpired*, quickReplies*, guestCancel*, dispute.open)
CHAT ACCESSIBILITY                = PARTIAL (ChatConfirmDialog: role/aria/Escape/focus added and
                                     code-verified; quick-reply toggle: aria-expanded/aria-controls
                                     added; full runtime a11y pass not performed)
CHAT ARCHIVE/READ-ONLY            = UNCHANGED (pre-existing chatArchived/canSend gating, not
                                     re-audited or extended this pass)

BLOCK 5.6 CODE     = COMPLETE for the scope actually addressed above; NOT COMPLETE overall — the
                     role-render matrix and system-event semantic model remain unbuilt and are
                     named explicitly rather than silently dropped (§12.6, §13).
BLOCK 5.6 RUNTIME  = BLOCKED (shared-Postgres credential conflict from BLOCK 5.5A.1, still
                     unresolved as of this report)
BLOCK 5.6          = PARTIAL
```

No blanket COMPLETE. Static gates (tsc/eslint/build) are clean on every file touched across both
passes; every user-facing/runtime claim is explicitly BLOCKED by the still-unresolved shared-Postgres
credential conflict from BLOCK 5.5A.1, not glossed over as inspection-only PASS.

## 12. BLOCK 5.6A — Closure Continuation (same block, not a new one)

Corrected course per feedback: the mobile layout/composition items listed as "NOT ADDRESSED" in
§5/§8 above were in-scope for the original BLOCK 5.6, not a future visual block. DB outage blocks
**runtime** verification, not safe frontend/layout/component implementation. Continued in the same
block. DB re-checked again at the start of this continuation — still down, same credential
conflict, not touched.

### 12.1 Kept unchanged (explicitly not re-touched)
`chat.css` token reconciliation, `authExpired` handling + re-login CTA, composer-disabled-on-expiry,
sequence guard, owner/admin quick-reply collapse, Dispute-canonical / Complaint-freeze direction,
private attachment architecture (untouched, out of scope this pass).

### 12.2 Mobile fullscreen chat + bottom-nav + floating-assistant suppression

**Root cause of the F/G screenshot defects (floating assistant over composer, bottom nav eating
viewport)**: both `TstAssistant.tsx` and `MobileBottomNav.tsx` already shared one existing gate,
`isShellHiddenRoute()` (`src/constants/app-navigation.ts`), used to suppress both on `/auth/*` and
the two dashboard shells — it simply never included the chat route. **Fix**: added `/chat/booking`
to `SHELL_HIDDEN_PREFIXES`. One line, reuses the exact mechanism already built for this purpose,
suppresses both the assistant and the bottom nav on the active chat screen simultaneously, and
does not touch either component's own code. Does not affect any other route (confirmed by a
prefix-match, not substring-match, implementation — `/chat/booking` will not accidentally hide
the nav on an unrelated `/chatbot`-style route).

**Static evidence**: added a standalone unit check (`isShellHiddenRoute` imported directly, no
DB/browser needed) asserting `/chat/booking/123` → hidden, and every other representative route
(`/`, `/search`, `/profile`, `/dashboard/guest`, `/chatbot`) → still visible; all 9 cases pass.
**Runtime evidence**: attempted to open `/chat/booking/999999` in the real dev server (which is
running locally); it redirected to `/` because the route requires an authenticated session and
login itself needs the down database — so a real logged-in confirmation could not be obtained.
**Status: CODE COMPLETE + UNIT-VERIFIED, VISUAL RUNTIME BLOCKED** (not claimed as visually PASS).

**Booking Wizard has the same assistant-overlap symptom per your screenshots** — confirmed as
carried-forward Booking visual debt, NOT touched (explicitly out of scope for this chat block).

### 12.3 Mobile "dashboard-in-dashboard" / page-level scroll (`BookingRoom.tsx`, `chat.css`)

**Root cause**: `BookingRoom.tsx` rendered the booking-context header, review banner, proof-sent
banner, `DisputeActions`, existing-review card, and the leave-review form **unconditionally, all
stacked above** `.chat-page__layout` (the thread+aside grid). `.chat-page__thread` already had a
correct internal-scroll contract in `chat.css` (`flex:1; overflow-y:auto` inside a height-capped
container on mobile) — the actual bug was everything *above* it forcing the whole page to scroll
before the thread was even reached, which is the literal "dashboard-in-dashboard" complaint.

**Fix**: that entire pre-thread block is now wrapped in a single collapsible `<details>` — the
exact same collapsible pattern the aside already used for payment/timeline content (not a new UI
pattern). Default state: **closed on mobile**, so the message thread is what's immediately visible
and scrollable; **open by default** only when there's something the user was specifically sent
here for (`focusReview`, an active `ON_REVIEW` banner, or a just-sent payment proof) so nothing
material is silently hidden. **Always expanded on desktop** (`lg:block`, mirroring the aside's own
`lg:block` twin-render technique) — desktop layout unchanged. New `.chat-page__context` /
`.chat-page__context-inner` classes added to `chat.css` on existing tokens, with the collapsed
inner content capped at `max-height: 45dvh; overflow-y: auto` so an *expanded* context block on a
short viewport can't itself blow past the screen and create a second competing scroll container
(kept to a strict single-primary-scroll intent, even if not exhaustively device-tested).

**Status**: CODE COMPLETE. `tsc`/eslint clean, isolated build (exit 0) succeeded. **Not
runtime-verified** — same auth/DB blocker as above; the collapsible-details technique itself is
already proven correct in this exact codebase (the aside has used it since before this block), so
this is a structural reuse, not a novel unverified pattern, but the specific interaction with
`BookingChatPanel`'s own scroll region on a real phone was not observed.

### 12.4 Confirm dialogs (`ChatConfirmDialog.tsx`)

Both hand-rolled dark `fixed inset-0` confirm blocks (guest cancel, admin cancel) — which had no
`Escape` handling, no focus management, and no dialog ARIA semantics — replaced by one new
`src/components/chat/ChatConfirmDialog.tsx`. Scoped to chat actions only, not a project-wide dialog
rewrite. Reuses the existing `.modal-surface`/`liquid-glass` visual system (already forced to light
tokens by `globals.css`'s palette lock) rather than inventing new styling. Implements: `role`
`alertdialog` + `aria-modal` + `aria-labelledby`/`aria-describedby`, `Escape`-to-cancel (unless
busy), auto-focus on the confirm button when opened, disabled state while busy, Cancel/Confirm
button pair. New i18n keys added for the guest-cancel copy (`chat.guestCancelTitle/Desc/Confirm`,
RU/TG/EN) — the admin-cancel dialog already had its own keys, reused unchanged.
**Status**: CODE COMPLETE, `tsc`/eslint clean. Focus-trap/Escape behavior verified by code reading
only (no headless a11y test framework in this repo to run without a browser session against a real
booking) — not claimed as a runtime a11y PASS.

### 12.5 Guest "Пожаловаться" compact entry (`DisputeActions.tsx`)

Re-examined per the explicit instruction not to build a third complaint system: `DisputeActions`
already **was** the single-button compact toggle the spec asked for (confirmed in the original
audit — not "four pills"), but it had two remaining problems: (1) its container rendered as an
always-visible bordered/dark card even when there was nothing to show, adding to the "stack of
cards" clutter now that it lives inside the new collapsible context block; (2) it used
`bg-amber-950/20`/`text-amber-100`/`bg-black/20` dark-glass colors identical to the rest of the
file's original palette. **Fix**: when idle (no open dispute, no history, form not open), it now
renders nothing but a small unobtrusive text action — reworded from "Открыть спор" (legal/internal
phrasing) to the requested **"Пожаловаться"** (RU) / "Шикоят кардан" (TG) / "Report an issue" (EN).
The full card (with border/background, now on light `--taj-color-*`/amber-`#d97706` tokens) only
appears once a dispute actually exists or the form is open. A Cancel button was added to the
open-form state (previously only had Submit, no way to back out without leaving text unsent).
**No schema change** — still posts `reason` as free text to the existing `Dispute.reason` field;
did not attempt to add a `category` field, per the explicit instruction not to force a migration
without DB access. This remains flagged as a schema follow-up, not implemented.
**Status**: CODE COMPLETE, `tsc`/eslint clean, build clean. Not runtime-verified (same blocker).

### 12.6 Explicitly still NOT done this pass (honest, not silently dropped)

- **Admin Disputes list** (§7's recommended next step) — still not built. This is a genuinely new
  admin surface (new `activeSection`, list query, an "Open" detail action, Russian-only admin copy,
  restrained nav badge) and, unlike the fixes above, isn't a small reuse of an existing mechanism —
  building it in the same pass without any way to see it against a live booking/dispute row was
  judged too large a net-new surface to add safely under the remaining scope of this pass.
- **Role-render matrix** (guest/owner/manager/admin — what's visible/hidden per role) — not
  produced as a table. Spot-checked in code (isGuest/isOwner/isAdmin gates throughout
  `BookingChatPanel.tsx`/`BookingRoom.tsx` are mutually exclusive on `currentUserRole`, a single
  enum from the authenticated session — an account cannot simultaneously be guest+owner+admin by
  construction) but not exhaustively tabulated per your specific "admin account also created a
  booking" scenario, which needs a real multi-role fixture to reproduce.
- **Archive/read-only state architecture** — `chatArchived`/`canSend` already exist and already
  disable the composer and show a banner (present before this block); not re-audited or extended
  this pass beyond what already existed.
- **System-event semantic model** (`eventType`/`payload`) — not started; still plain-Russian
  `ChatMessage.body`, unchanged.
- Booking Wizard, Profile, general Owner/Admin redesign — correctly not touched, per instruction.

## 13. BLOCK 5.6B — Admin Disputes List (closure continuation, same block)

DB re-checked again at start of this pass — still down, same credential conflict, not touched.

**Built, per §12.6's named next step**: rather than a new sidebar entry/section, the existing
"Жалобы" (Complaints) admin tab was relabeled **"Жалобы и споры"** (RU) / "Шикоятҳо ва баҳсҳо" (TG)
/ "Complaints & disputes" (EN) and now renders a second grid below the existing Complaint cards,
sourced from the canonical `Dispute` model, reusing the exact `AdminSectionHead`/`AdminRecordCard`/
`AdminDataToolbar`/`Pagination`/`EmptyState` primitives the Complaints grid already uses — no new
admin UI pattern invented. Chose to extend the existing section rather than add a new
`AdminSection`/sidebar entry, per the "smallest safe IA change" instruction — this needed no
changes to `AdminSidebar.tsx`, the section-routing enum, or mobile drawer groups.

Each dispute card shows: guest label (`getBookingGuestLabel`) · hotel name (`bookingHotel()`,
try/catched exactly like the BLOCK 5.5B P1-1 pattern — a malformed booking relation falls back to
"Отель не определён" instead of crashing the page), status badge (reused `complaintStatusVariant`,
which already generically handles OPEN/RESOLVED), opened-by / against user names, creation time,
the full reason text, any existing resolution note, and a direct "Открыть переписку" link to
`/chat/booking/{id}` so an admin can jump straight into the actual conversation — satisfying the
"admin can open the related booking conversation" requirement without embedding chat controls
inside the admin list itself (kept the two surfaces separate, per the explicit instruction not to
turn every chat into a permanent moderation dashboard).

**New resolve action**: `POST /api/admin/disputes/resolve` (`src/app/api/admin/disputes/resolve/route.ts`)
— a direct structural mirror of the pre-existing `/api/admin/complaints/resolve` (same
`getAdminUser()`/`forbiddenJson()` auth pattern, same native-form POST + redirect shape), sets
`status: "RESOLVED"`, an optional free-text `resolution`, and `resolvedAt`. No schema change.

**Explicitly not built**: a global sidebar/nav badge showing an open-dispute count (would require
touching `AdminSidebar.tsx`'s props and the layout that feeds it — judged out of the minimal-IA
scope for this pass); a dedicated dispute detail page (the reason/resolution/actions all fit on the
existing card, so a separate route wasn't needed). Both noted as easy follow-ups, not silently
dropped.

**Status**: CODE COMPLETE. `tsc`/eslint clean; one isolated `npm run build`, exit 0. **Runtime
unverified** — same DB/auth blocker as every other item in this block; the query, the resolve
route, and the "Открыть переписку" link have not been exercised against a real `Dispute` row.

## 11. Next steps (in order, once DB is restored) — superseded by §14, kept for history

~~1. Full runtime matrix...~~ — still the eventual destination, see §14's consolidated matrix.
~~2. Build and verify the Admin Disputes list (§7).~~ **CORRECTED (this was the documentation
inconsistency flagged in review)**: the list itself was built in §13 (BLOCK 5.6B). What remains is
**runtime-verify** the Admin Disputes list, not build it — re-worded here rather than silently
edited, so the correction itself is visible.
~~3. Mobile fullscreen layout rebuild + floating-assistant/bottom-nav suppression (§8).~~ — DONE in
§12 (BLOCK 5.6A).
~~4. Confirm-dialog recoloring (§5, explicitly deferred).~~ — DONE in §12.4 (BLOCK 5.6A).
5. Re-run BLOCK 5.2–5.4 regression scripts alongside the new chat reliability behavior — still
   pending, unchanged.

Not starting Booking Wizard visual rebuild, Profile, or general Owner/Admin redesign — out of scope
per instruction, unchanged across every continuation of this block.

## 14. BLOCK 5.6C — Role Separation + Archive Lifecycle Audit + System-Event Architecture

DB re-checked again at the start of this pass — still down, same credential conflict, not touched.
Per explicit instruction, this is a **mandatory** continuation, not an optional next step: role
separation, archive lifecycle, and system-event architecture are treated as in-scope for BLOCK 5.6
itself, not deferred to a future block.

### 14.1 Role-render matrix — architecture trace (before any code change)

Traced the actual render path: `src/app/chat/booking/[bookingId]/page.tsx` calls
`authorizeBookingAccess(booking, user)` (`src/lib/pms/bookingAuthorization.ts:17-30`), which
correctly computes three **independent** booleans: `isGuest = booking.userId === user.id`,
`isOwner = bookingHotel(booking).ownerId === user.id`, `isAdmin = user.role === "ADMIN"` — these
are not mutually exclusive by construction (an admin can also be a booking's guest).

**Confirmed defect, exactly matching the reported screenshot**: the page then used **raw
`user.role`**, not these participant-aware booleans, in two places: the chat `title` (line 64:
`user.role === "ADMIN" ? titleAdmin : ...`) and, critically, `currentUserRole={user.role as ...}`
(line 88) — the single prop that `BookingRoom.tsx` and `BookingChatPanel.tsx` both derive their own
`isAdmin`/`isOwner` flags from (`BookingRoom.tsx:105`, `BookingChatPanel.tsx:341` — confirmed by
grep, both derive purely from this one prop, nothing else). Consequence: **an admin account that is
also the guest on its own booking got the full moderation UI** — "АДМИН · чат брони" title, the
admin quick-reply set, the delete-message (×) button, the "Очистить чат" purge button, the admin
cancel dialog, and the big "Подтвердить оплату и бронь" button — instead of a normal guest
conversation. This is not a cosmetic issue: it's a genuine participant-context vs.
privileged-access confusion in the presentation layer.

**Fix**: introduced a single `presentationRole: "GUEST" | "OWNER" | "ADMIN"` computed as
`isGuest ? "GUEST" : isOwner ? "OWNER" : "ADMIN"` (`page.tsx`) — participant context always wins;
the ADMIN presentation is now only reached when the viewer is neither the booking's guest nor the
hotel's owner, i.e. a genuine moderation visit. This is passed as `currentUserRole` and used for
`title`/`counterpartPreview` instead of raw `user.role`/`isAdmin`. **No new query parameter, flag,
or client-controlled input was introduced** — this is purely a reordering of priority over booleans
the backend already computed authoritatively, so there is no new privilege-escalation surface: a
non-admin guest still cannot become "ADMIN" by any means, and an admin visiting *someone else's*
booking (isGuest=false, isOwner=false) still correctly gets the moderation view — e.g. via the
"Открыть переписку" link from the new Admin → Жалобы и споры list (§13), with zero special-casing
needed for that flow.

**Backend authorization is unaffected and remains authoritative, on purpose**: the actual
moderation API routes (`/api/admin/chat/messages/[messageId]` DELETE, `/api/admin/chat/booking/
[bookingId]` DELETE, `/api/admin/disputes/resolve`, `/api/admin/bookings/[id]/cancel`) all
independently gate on `requireUser(["ADMIN"])`/`getAdminUser()` — the real account role, not
presentation context. This is deliberate and pre-existing, not something this fix changes: an
admin-as-guest's presentation now correctly hides those controls, but the account's actual platform
privilege is a separate, unconditional property of being an admin — consistent with "backend
authorization remains authoritative."

**Render matrix** (columns: what the UI conditionally shows, traced directly from
`BookingChatPanel.tsx`/`BookingRoom.tsx`/`DisputeActions.tsx` source, not inferred):

| Capability | GUEST | OWNER | ADMIN (moderation context) | ADMIN-AS-OWN-BOOKING-GUEST |
|---|---|---|---|---|
| Read messages | ✅ | ✅ | ✅ | ✅ (as GUEST now, was ❌ wrong-UI before fix) |
| Send / attach | ✅ if `canSend` | ✅ if `canSend` | ✅ if `canSend` | ✅ as GUEST |
| Submit payment proof | ✅ (`ProofUploadPanel`, guest-only) | ❌ | ❌ | ✅ as GUEST |
| Confirm payment (big button) | ❌ | ❌ | ✅ (`adminConfirmPaymentFromChat`) | ❌ (fixed — was ✅, wrong) |
| Review/reject proof | ❌ | ✅ (`PaymentReviewCard`, `isOwner\|\|isAdmin`) | ✅ | ❌ (fixed) |
| "Пожаловаться" (open dispute) | ✅ (`canOpen = role !== ADMIN`) | ✅ | ❌ (moderates, doesn't file) | ✅ as GUEST (fixed — was ❌, wrong) |
| Quick-reply set shown | Guest's 3 contextual (WAITING_PAYMENT/WAIT_PROOF only) | Owner's 5 (collapsed toggle) | Admin's 4 (collapsed toggle) | Guest's 3 (fixed — was admin's 4, wrong) |
| Delete message / purge chat | ❌ | ❌ | ✅ | ❌ (fixed — was ✅, wrong) |
| Cancel booking | ✅ if `canGuestCancel` | ❌ (no self-serve owner cancel — known debt) | ✅ if `canAdminCancel` | ✅ as GUEST (fixed — was admin-cancel, wrong) |
| Resolve dispute | ❌ | ❌ | ❌ **inside chat** — only via Admin → Жалобы и споры (§13), by design (kept the two surfaces separate) | ❌ |
| Owner check-in / arrival-payment actions | ❌ | ✅ | ❌ | ❌ |
| Archived/read-only behavior | Composer disabled, banner shown, history readable | Same | Same, plus admin can still read via `getAdminBookingChatTimeline` even when archived (§14.2) | Same as GUEST |

**Manager/Staff role**: traced and confirmed **does not exist** as a distinct role anywhere in chat
authorization — `authorizeBookingAccess`/`canAccessBookingChat` only recognize GUEST/OWNER/ADMIN
(a `Hotel.ownerId` single-owner model, no separate staff/manager account type in the schema). Not
fabricated a row for it in the matrix above; noted here so it isn't mistaken for an oversight.

**Status**: CODE COMPLETE + FIX APPLIED. `tsc`/eslint clean, isolated build exit 0. **Not
runtime-verified** — the exact admin-as-guest scenario needs a real fixture (one user account that
is both an ADMIN and the guest on a real booking) against a live database to see the corrected UI
render; not reproducible while Postgres is down. Marking **ROLE SEPARATION = CODE PASS / RUNTIME
BLOCKED**, not COMPLETE.

### 14.2 Archive / read-only lifecycle — architecture trace + one flagged product decision

Traced the full lifecycle across `src/app/api/chat/booking/[bookingId]/messages/route.ts` and
`src/lib/chat/bookingChat.ts` — **this turned out to be a more complete, more correct architecture
than assumed going into this audit**:

- **Immediate read-only on terminal status** (`messages/route.ts:19-30`): `isBookingChatLocked()`
  returns true the instant `Booking.status` enters `EXPIRED`/`CANCELLED`/`CANCELLED_BY_GUEST`/
  `REJECTED`/`COMPLETED`, or `chatArchivedAt` is set. `CHECKED_IN` and `ON_REVIEW` are **not**
  locked — a guest still mid-stay or mid-payment-review can still write. This answers "what
  happens after CHECKED_IN/COMPLETED" precisely: CHECKED_IN stays writable, COMPLETED locks
  immediately.
- **Backend-enforced, not just a disabled textarea** — confirmed the exact critical rule the
  instruction demanded: `POST .../messages` (`messages/route.ts:134-136`) checks
  `isBookingChatLocked(booking)` **server-side** and returns `403 "Чат закрыт для новых
  сообщений"` before ever creating a `ChatMessage` row. A direct API call bypassing the UI cannot
  write to a locked chat. This is a **PASS**, not a gap — the disabled-textarea UI is a courtesy
  reflection of a real backend rule, not the rule itself.
- **Two-tier lifecycle already exists**: tier 1 (above) is immediate read-only on terminal status;
  tier 2 is cold-storage archival 15 days after checkout for the same terminal statuses
  (`bookingChat.ts:296-320`, `findBookingsEligibleForChatArchive`/`runChatArchiveJob`), which sets
  `ChatMessage.isArchived = true` on every row and `Booking.chatArchivedAt` — **non-destructive**,
  no row deletion (deletion only happens via the separate, explicit
  `adminPurgeBookingChatCompletely`, an admin-only irreversible action, unrelated to the scheduled
  job). This already matches "should become read-only, not disappear, not run forever as active" —
  a real, working design, not something needing invention.
- **Dispute-vs-lock interaction — confirmed as a real gap, not a false alarm**: `isBookingChatLocked`
  has no awareness of `Dispute.status`. If a booking reaches a terminal status while a `Dispute`
  is still `OPEN` (e.g., a guest disputes right after a REJECTED payment), the chat locks
  immediately and neither party can add further detail through it, even though the dispute is
  still active. There is no existing carve-out for this case anywhere in the code.
- **A second real gap, more significant**: once `chatArchivedAt` is set (tier-2 cold storage),
  `GET .../messages` (`messages/route.ts:83-88`) returns an **empty message list** to any
  non-admin caller (`if (archivedFlag && user.role !== "ADMIN") return { messages: [], ... }`) —
  only `getAdminBookingChatTimeline` (admin-only) can still read archived history. This means a
  guest or owner **loses read access to their own old conversation** once the 15-day job runs,
  which does not match "оставаться доступным для истории" as stated (unless "history" was meant to
  mean admin-side history/audit specifically, which is a legitimate but different intent).

**Per the explicit instruction not to silently choose a product rule here — STOP, options
presented, not decided**:
- **Option A**: keep current behavior — cold-storage archive is intentionally admin/audit-only;
  guests/owners are expected to rely on the Trips/History pages (not raw chat) for their own
  post-stay record. (Consistent with "no NO_SHOW flow"/other places where History, not chat, is the
  guest's durable record.)
- **Option B**: change tier-2 `GET` to still return the archived messages (read-only) to the
  original guest/owner, just with `canSend: false` — i.e. cold storage should mean
  "no more writes," not "no more reads for participants."
- **Option C**: add a dispute carve-out to `isBookingChatLocked` — if an `OPEN` `Dispute` exists
  for the booking, do not lock the chat regardless of `Booking.status`, so the dispute can be
  discussed to resolution even after the stay itself has ended.

None of A/B/C were implemented — each is a real product-behavior change to existing, working code,
not a bug fix, and the instruction is explicit that ambiguous cases should be surfaced, not decided
silently. **Status: ARCHIVE POLICY ARCHITECTURE = PASS (traced, mostly already correct)**;
**ARCHIVE BACKEND ENFORCEMENT = PASS** (the core write-lock is real and backend-enforced);
**two flagged gaps (Option B/C above) = OPEN PRODUCT DECISION, NOT IMPLEMENTED**.

### 14.3 System-event inventory (trace only — no schema change made)

Every writer of a `SYSTEM`-role `ChatMessage`, found by grepping `addBookingSystemMessage(` and
`senderRole: "SYSTEM"` across the whole `src/` tree (11 call sites, all cited):

| Writer | Current body (RU, verbatim) | Proposed `eventType` | Payload | Visible to |
|---|---|---|---|---|
| `initializeBookingChat.ts:55` (`buildChatInitWelcome`) | Locale-aware welcome (pay-now or pay-at-checkin variant — **the one writer already locale-aware today**) | `booking.welcome` | `{ variant: "pay_now" \| "pay_at_checkin", payMin, reviewMin }` | all |
| `messages/route.ts:205-216` (inline, not via helper) | "🛡️ Система: Чек получен. Отведено 5 минут…" | `proof.received` | `{ reviewMinutes: 5 }` | all |
| `paymentReviewActions.ts:140-146` | "Администратор подтвердил оплату (проверка спора)." / owner variant | `payment.confirmed` | `{ byRole: "ADMIN"\|"OWNER" }` | all |
| `paymentReviewActions.ts:211-214` | "Чек отклонён. {reason} Пожалуйста, отправьте новый чек." | `proof.rejected` | `{ reason: string }` | all |
| `payments/proof/route.ts:194-197` | "Чек отправлен. Ожидается проверка…" | `proof.submitted` | `{}` | all |
| `bookings/[id]/cancel-by-guest/route.ts:68-71` | "Бронирование отменено пользователем. Сессия закрыта." | `booking.cancelled_by_guest` | `{}` | all |
| `owner/bookings/[id]/confirm-arrival-payment/route.ts:80-83` | "Оплата при заселении подтверждена. Гость заселён." | `arrival_payment.confirmed` | `{}` | all |
| `owner/bookings/[id]/check-in/route.ts:44-47` | "Владелец подтвердил заселение. Средства заморожены до завершения." | `checkin.confirmed` | `{}` | all |
| `jobs/expire-bookings/route.ts:59-62` | "Бронь отменена по истечении 15 минут. Чат закрыт." | `booking.expired` | `{}` | all |
| `jobs/expire-bookings/route.ts:112-115` | "Время проверки чека истекло. Оплата отклонена." | `proof.review_expired` | `{}` | all |
| `admin/bookings/[id]/cancel/route.ts:52-55` | "Бронирование отменено администратором." | `booking.cancelled_by_admin` | `{}` | all |

**Model proposal (additive, backward-compatible — matches the instruction's "prepared, not
production-migrated" requirement)**: add two **nullable** columns to `ChatMessage` —
`eventType String?` and `payload String?` (JSON-encoded, mirroring how `TransactionLog.payload`
already stores JSON as a `String` elsewhere in this schema — reusing an existing convention, not
inventing a new one). Every writer above would populate `eventType`+`payload` **in addition to**
the existing `body` (still written verbatim, unchanged) — legacy rows keep `eventType: null` and
render exactly as before (`body` as-is); new rows carry both, and the client can prefer rendering
from `eventType`+`payload` through a small locale-aware lookup table when present, falling back to
raw `body` when `eventType` is null. This is additive-only: no column removed, no existing row
touched, no `NOT NULL` constraint added.

**Not implemented this pass — deliberately, per the explicit ambiguity-STOP instruction**: the
exact localization-key naming convention (`chat.systemEvent.*` vs. reusing `status.*`-style keys),
whether `initializeBookingChat.ts`'s already-locale-aware welcome message should be the first
migrated writer (it's the natural pilot case since it already separates variant from prose), and
whether historical `SYSTEM` rows should get a one-time best-effort `eventType` backfill (parsing
existing Russian `body` text to guess the event, which is inherently lossy/fuzzy and itself a
product-risk decision) are all real open questions this pass does not resolve unilaterally. A local
Prisma migration file *could* be safely authored and applied once the DB is back (additive columns
are low-risk), but writing the actual migration SQL now, unable to run `prisma migrate dev` against
a live database to confirm it applies cleanly, was judged unsafe to claim as "prepared" without
that confirmation — so this stays **architecture-traced and modeled, not code-implemented**.

**Status: SYSTEM EVENT INVENTORY = PASS (complete, 11/11 writers cited). SYSTEM EVENT MODEL =
PROPOSED, NOT IMPLEMENTED. LOCALIZATION = NOT STARTED. LEGACY COMPATIBILITY = DESIGNED (additive,
non-destructive) BUT NOT CODED.**

### 14.4 Admin Disputes security static audit (`/api/admin/disputes/resolve`)

Checked against every item on the explicit checklist, by direct code reading:

| Check | Result |
|---|---|
| Unauthenticated denied | ✅ `getAdminUser()` → `getSessionUser()` returns null → `forbiddenJson()` → 403 |
| Non-admin denied | ✅ `getAdminUser()` explicitly checks `user.role !== "ADMIN"` → null → 403 |
| Dispute ID validated | ✅ `Number(form.get("id"))`; falsy (`0`/`NaN`) → redirect, no query issued |
| Nonexistent dispute → controlled response | ❌ **FOUND, FIXED THIS PASS** — was a plain `prisma.dispute.update()`, which throws `P2025` on no match (uncontrolled 500); changed to `updateMany` (mirroring the atomic pattern from BLOCK 5.5B's `admin/bookings/complete/route.ts`) — now always resolves deterministically (`count: 0` for a bad id, no exception) |
| Already-RESOLVED behaves deterministically | ✅ Idempotent — re-applying `RESOLVED`+new `resolution`+new `resolvedAt` is a safe no-op-shaped update, never errors |
| Resolution length bounded | ✅ `.slice(0, 2000)` |
| No arbitrary booking mutation | ✅ Only touches the `Dispute` row; never writes `Booking` |
| No cross-entity ID confusion | ✅ `id` is used exclusively as `Dispute.id`, never conflated with `bookingId` |
| No client-supplied `resolvedAt`/`status` override | ✅ Both are server-set constants (`"RESOLVED"`, `new Date()`), never read from the form body |
| Redirect cannot be used as open redirect | ✅ `publicUrl(req, "/dashboard/admin?section=complaints")` — a fixed literal path, not derived from any request-controlled value |

**One defect found and fixed** (the nonexistent-id case); everything else already correct by
construction. **Status: ADMIN DISPUTES SECURITY STATIC = PASS STATIC** (all 10 checks now pass by
code reading). **ADMIN DISPUTES SECURITY RUNTIME = BLOCKED** — not exercised against a live
database; the fix itself (does `updateMany` on a bad id really return count 0 and redirect cleanly
in practice) has not been executed.

### 14.5 Consolidated evidence matrix (per §9's required format)

```
ROLE ARCHITECTURE            = PASS       (independent isGuest/isOwner/isAdmin booleans, correct)
ROLE SEPARATION CODE         = PASS       (presentationRole fix applied, admin-as-guest closed)
ROLE SEPARATION RUNTIME      = BLOCKED

ARCHIVE POLICY ARCHITECTURE  = PASS       (two-tier lifecycle already existed, traced in full)
ARCHIVE BACKEND ENFORCEMENT  = PASS       (server-side lock confirmed, not UI-only)
ARCHIVE RUNTIME              = BLOCKED
ARCHIVE OPEN PRODUCT DECISIONS = 2 flagged, NOT DECIDED (dispute-carve-out; post-archive read access)

SYSTEM EVENT INVENTORY       = PASS       (11/11 writers cited)
SYSTEM EVENT MODEL           = PARTIAL    (additive schema proposed, not coded)
SYSTEM EVENT LOCALIZATION    = NOT STARTED
LEGACY MESSAGE COMPATIBILITY = PARTIAL    (design guarantees compatibility; nothing implemented yet)

ADMIN DISPUTES CODE          = PASS       (built BLOCK 5.6B)
ADMIN DISPUTES SECURITY STATIC = PASS     (10/10 checks; 1 defect found+fixed this pass)
ADMIN DISPUTES RUNTIME       = BLOCKED

CHAT RELIABILITY CODE        = PASS STATIC (unchanged from BLOCK 5.6)
CHAT RELIABILITY RUNTIME     = BLOCKED
CHAT MOBILE CODE             = PASS STATIC (unchanged from BLOCK 5.6A)
CHAT MOBILE RUNTIME          = BLOCKED
CHAT DESKTOP RUNTIME         = NOT INDEPENDENTLY CHECKED
CHAT ACCESSIBILITY           = PARTIAL     (unchanged from BLOCK 5.6A)
CHAT SECURITY                = PARTIAL     (disputes/resolve audited+fixed this pass; broader chat
                                             authorization matrix not re-tested end-to-end)
CHAT RU/TG/EN                = PASS STATIC (every new/changed string has RU/TG/EN; system-event
                                             localization itself NOT STARTED, see above)

STATIC TESTS (tsc/eslint)    = PASS
BUILD                        = PASS       (isolated, exit 0)
DB STATUS                    = BLOCKED    (shared-Postgres credential conflict, still unresolved)

BLOCK 5.6 CODE      = substantially closable scope now closed (role fix, archive trace, system-event
                      inventory+model proposal, disputes security audit+fix); 2 explicit open product
                      decisions (§14.2) and the system-event implementation itself remain
BLOCK 5.6 RUNTIME   = BLOCKED
BLOCK 5.6 OVERALL   = PARTIAL
```

Not using COMPLETE anywhere as a substitute for missing runtime evidence. Not starting BLOCK 5.7.
`.agent/STATE.md` updated in the same edit as this section.

## 15. BLOCK 5.6D — Archive Policy Implementation + Semantic System Events

Both open product decisions from §14.2 were made by the user (Option B for cold-archive read
access, a scoped Option C for the dispute carve-out) and are implemented below exactly as
specified — not re-litigated. DB re-checked again at the start of this pass — still down, same
credential conflict, not touched.

### 15.1 Archive policy — implemented

**Schema**: additive-only, two nullable columns on `ChatMessage` (`prisma/schema.prisma`):
`eventType String?`, `eventPayload String?`. Migration file authored at
`prisma/migrations/20260915120000_chat_message_semantic_events/migration.sql` (two plain
`ALTER TABLE ... ADD COLUMN`, nothing destructive). **Not applied** — `prisma migrate dev`/`deploy`
needs a live database connection to run and record the migration in `_prisma_migrations`; with
Postgres down, this stays a hand-authored, unverified-against-a-live-DB file. `npx prisma validate`
and `npx prisma generate` both succeed (schema-only, no DB needed) — confirmed, not assumed.

**Write lock, extracted and made dispute-aware** — moved out of the route file into a new pure,
exported, independently-testable module `src/lib/chat/chatLock.ts`:
```ts
function isBookingChatLocked(booking: { chatArchivedAt: Date | null; status: string }, hasOpenDispute: boolean): boolean {
  if (booking.chatArchivedAt) return true;      // D: cold storage always locks, unconditionally
  if (hasOpenDispute) return false;             // B: terminal + OPEN dispute stays writable
  return TERMINAL_NO_NEW_MESSAGES.has(booking.status); // A / C: normal terminal-status lock
}
```
`hasOpenDispute` is computed fresh in both `GET` and `POST` of `messages/route.ts` via
`prisma.dispute.findFirst({ where: { bookingId, status: "OPEN" } })` immediately before the check
— never cached, never trusted from client state. This exact function is what the 5-case static
test (§15.4) exercises directly, with no mocking needed since it takes plain values.

**Dispute-bypass protection** — traced `POST /api/disputes` (the only creation path) and confirmed
it previously had **no** lifecycle restriction at all: any authorized participant could open a
dispute regardless of booking age. Added one check before dispute creation: `if (booking.
chatArchivedAt) return 409` — a cold-archived booking can no longer have a new dispute opened
against it, closing the exact bypass described ("create a dispute long after archive to reawaken
the chat"). This is deliberately asymmetric with the write-lock's dispute carve-out: a dispute that
was already `OPEN` **before** archival is protected by the *other* half of this design (below), not
by this check — this check only stops **new** disputes from being opened post-archive.

**Archive job made dispute-aware** — `findBookingsEligibleForChatArchive()`
(`src/lib/chat/bookingChat.ts`) gained one additional `where` clause: `disputes: { none: { status:
"OPEN" } }`. The scheduled 15-day cold-storage job now simply skips any booking with a still-open
dispute — it becomes eligible again on a later run once the dispute resolves. This is the
"legitimate pre-existing dispute never gets its communication channel destroyed by the archive job"
guarantee, implemented as a pure eligibility-query change rather than special-casing the lock
function for an already-archived-but-still-disputed state (which the accepted model explicitly
rules out: cold storage is unconditionally read-only, full stop).

**Cold-archive READ access — fixed to match Option B**: `GET .../messages` no longer returns an
empty list to non-admins once `chatArchivedAt` is set. Root cause was two-layered, not one: (1) the
route used to special-case that response directly, and (2) even without that special case, the
normal `getBookingChatMessages()` filters `isArchived: false` — and the archive job flips every
row's `isArchived` to `true`, so it would have returned nothing anyway. Added
`getArchivedBookingChatMessages()` (`bookingChat.ts`) — the same shape as the live query, minus the
`isArchived` filter, still excluding soft-deleted (`deletedAt` set) rows — and the route now uses it
whenever `chatArchivedAt` is set, for guest/owner/admin alike. `canSend` stays `true→false` exactly
as before (still computed from `isBookingChatLocked`, which is unconditionally `true` once
archived) — the response now correctly reads as "here is your history, `chatArchived: true`,
`canSend: false`," not "here is nothing." No new endpoint was created, per the explicit instruction
— the existing `GET` was extended, not duplicated.

**`adminPurgeBookingChatCompletely` untouched** — confirmed it remains the separate, explicit,
privileged destructive action it already was; nothing in this pass changed its behavior or blurred
it with the non-destructive lifecycle archive.

### 15.2 System-event architecture — implemented

**Writer contract**: one centralized function, `addBookingSystemEvent({ bookingId, eventType,
payload })` (`src/lib/chat/systemEvents.ts`), replacing the old free-text `addBookingSystemMessage`
at all **11** call sites (re-grepped immediately before starting this work — still exactly 11, no
12th writer had appeared since the BLOCK 5.6C inventory). Every call now passes a typed
`SystemEventType` + a typed payload (a discriminated `PayloadMap`, so a caller cannot pass a
mismatched payload shape for a given event — this is caught by `tsc`, not just convention). The
function centrally: derives a legacy-compatible RU `body` (bounded, deterministic, one `switch` in
one place — not 11 separate hand-written strings anymore), serializes the payload as bounded JSON
(`JSON.stringify`, hard-capped at 2000 chars), and writes `senderRole: "SYSTEM"` + `body` +
`eventType` + `eventPayload` in one `prisma.chatMessage.create`. The one writer that runs inside an
existing `$transaction` (`messages/route.ts`'s proof-received message) was **not** switched to call
the new async function (which isn't transaction-aware) — it now populates `eventType`/`eventPayload`
inline instead, with a comment explaining why, so it still renders identically to every other event
via the same renderer.

Old `addBookingSystemMessage` (`bookingChat.ts`) was **not deleted** — marked `@deprecated` with an
explanation that zero in-repo callers remain (re-confirmed by grep after migrating all 11), kept
only in case something outside this repo depends on its exact signature.

**Renderer**: one centralized `renderSystemEvent(locale, { eventType, eventPayload, body })`
(same file) used by **every** live-render consumer, not scattered per-consumer switches:
- `BookingChatPanel.tsx` (the live chat bubble)
- `bookingTimeline.ts` → `BookingTimeline.tsx` (the booking-room sidebar timeline) — `getBookingTimeline()`
  gained a `locale` parameter (defaulting to `"ru"` for the one other theoretical caller position,
  though only one real call site exists and was updated to pass the viewer's actual locale)

**Deliberately left alone**: the admin chat-archive **export** view
(`dashboard/admin/chat-archive/ChatArchiveClient.tsx`) — confirmed by reading it that this is a
static export/download surface, not a live render, matching the instruction's own distinction
("fallback body is the audit representation") — exports should show the fixed historical text, not
a live-relocalized string, so it was correctly left reading raw `body` and not touched.

**Fallback behavior, exactly as specified**:
- `eventType === null` (every legacy row) → renders `body` verbatim, unchanged.
- Unrecognized `eventType` (forward-compat: an older deployed client reading a row written by a
  newer version with an event type it doesn't know) → falls back to `body`.
- Malformed/unparsable `eventPayload` → caught, falls back to `body`, never throws.
- None of these paths render an empty message.

**RU/TG/EN**: all 13 `chat.systemEvent.*` keys added to all three locale blocks in
`src/lib/i18n/messages.ts` (one key per event, plus the two `booking.welcome` variants). The exact
RU strings match the previously-hardcoded legacy text verbatim (so a fresh install with no existing
rows sees identical copy to before this change) — TG/EN are natural-language translations of the
same meaning, not machine-literal.

**Payload semantics checked, not assumed**: the report's own §14.3 flagged `checkin.confirmed`'s
"Средства заморожены до завершения" (escrow language) as needing verification against
`payOnArrival`. Re-read `owner/bookings/[id]/check-in/route.ts` line-by-line: it explicitly
`return`s a 400 error if `booking.payOnArrival` is true, *before* ever reaching the system-message
write — so `checkin.confirmed` is **provably** Pay-Now-only, not merely assumed to be. No
`paymentModel`/`variant` field was added to its payload — one is not needed, since there is only
one call site and it is structurally incapable of firing for a pay-at-check-in booking. This is
directly asserted by test case 20b in §15.4.

**Historical backfill — explicitly not done**, per instruction: every pre-existing `SYSTEM` row
keeps `eventType: null` forever; no attempt was made to parse old Russian `body` text to guess an
event type for it.

### 15.3 What was NOT implemented this pass (and why)

- **The migration was not applied** to any database (none is reachable). The schema/model/renderer
  are all code-complete and internally consistent (confirmed by `tsc`+the static test suite), but
  "additive migration is safe" and "additive migration actually applies cleanly to the real schema"
  are two different claims — only the first is backed by evidence here.
- **Admin-dispute-security runtime tests (matrix items 27-29)** — no test-mocking infrastructure
  exists in this repo (no Jest/Vitest configured anywhere, confirmed by checking `package.json`)
  and building one just to fake a Prisma client was judged out of scope for a single route; those
  three checks remain covered only by the direct code-reading security audit already done in §14.4,
  not by an executable test.
- **DB-integration test cases (archive matrix items 6-10)**: reading archived history as guest/
  owner/admin, and the archive job actually skipping a real disputed booking, all require a live
  database row to observe — explicitly listed as BLOCKED in the consolidated matrix below, not
  simulated or assumed to pass.

### 15.4 Static test suite

New file: `scripts/test-block56d-static.ts` — pure-function tests, **zero database dependency**,
run directly with `npx tsx`. Covers: 8 archive/lock cases (the 5 required + 3 extra: the
"archived-and-disputed still locked" backstop, and confirming `CHECKED_IN`/`ON_REVIEW` are
correctly excluded from the terminal set), 12 system-event cases (all of #11–22 from the required
matrix, including the exact-string checks for RU/TG/EN, legacy/unknown/malformed fallback, reason
interpolation, both welcome variants, and a same-row-different-locale check), 4 role-presentation
cases (#23–26, including the admin-as-own-guest fix), and 3 route-hiding regression checks carried
over from BLOCK 5.6A. **Result: 28/28 passed**, executed and its actual output captured, not
assumed:
```
28 passed, 0 failed
```

### 15.5 Consolidated evidence matrix (final, per the required format)

```
ARCHIVE POLICY CODE              = PASS       (all four rules A-D implemented in chatLock.ts)
ARCHIVE WRITE LOCK CODE          = PASS       (dispute-aware, unit-tested, 8/8 cases)
ARCHIVE READ HISTORY CODE        = PASS       (getArchivedBookingChatMessages wired into GET)
DISPUTE LOCK CARVE-OUT CODE      = PASS       (hasOpenDispute computed fresh per request)
DISPUTE REOPEN/BYPASS PROTECTION = PASS       (chatArchivedAt check added to POST /api/disputes)
ARCHIVE JOB DISPUTE-AWARENESS    = PASS       (disputes: {none: {status: OPEN}} added to eligibility query)

SYSTEM EVENT SCHEMA              = PASS STATIC (additive migration authored, validate+generate OK,
                                                 NOT applied to any live DB)
SYSTEM EVENT WRITER COVERAGE     = PASS       (11/11 writers migrated, re-confirmed by grep)
SYSTEM EVENT RU                  = PASS       (13/13 keys, verbatim-matched to legacy text)
SYSTEM EVENT TG                  = PASS       (13/13 keys, natural-language translation)
SYSTEM EVENT EN                  = PASS       (13/13 keys, natural-language translation)
SYSTEM EVENT LEGACY FALLBACK     = PASS       (unit-tested, case 14)
SYSTEM EVENT UNKNOWN FALLBACK    = PASS       (unit-tested, case 15)
SYSTEM EVENT MALFORMED PAYLOAD   = PASS       (unit-tested, case 16, no crash)
SYSTEM EVENT PAY-AT-CHECKIN SEMANTICS = PASS  (proven, not assumed — route-level guard cited;
                                                unit-tested, cases 20/20b)

ROLE REGRESSION STATIC           = PASS       (unit-tested, cases 23-26)
ADMIN DISPUTE SECURITY STATIC    = PASS       (code-read audit only, §14.4 — no mock-based test;
                                                items 27-29 of the original matrix NOT executable
                                                without test infrastructure this repo doesn't have)

TSC                               = PASS
ESLINT                            = PASS      (every touched file, explicitly listed)
TESTS                             = PASS      (28/28, scripts/test-block56d-static.ts, executed)
PRISMA VALIDATION                 = PASS      (`prisma validate` + `prisma generate`, schema-only)
BUILD                             = PASS      (isolated `npm run build`, exit 0)
DB STATUS                         = BLOCKED   (shared-Postgres credential conflict, still unresolved,
                                                re-checked at both start and end of this pass)

BLOCK 5.6 CODE     = CLOSED for the scope the user authorized (reliability, light mode, mobile
                     layout, shell suppression, confirm dialogs, guest complaint entry, Admin
                     Disputes list + security fix, role-separation fix, archive policy A-D,
                     dispute bypass protection, semantic system-event architecture with RU/TG/EN).
                     Nothing further is code-addressable without either a live database or a new
                     product-scope decision the user hasn't asked for yet.
BLOCK 5.6 RUNTIME  = BLOCKED (Postgres still unreachable — every runtime claim above stays
                     evidence-gated at CODE/STATIC, not asserted as PASS at runtime)
BLOCK 5.6 OVERALL  = PARTIAL
```

Not starting BLOCK 5.7. `.agent/STATE.md` updated in the same pass with this section's DONE/OPEN/
NEXT — the only two things this block can still do without a live database are (a) nothing further
that is safely code-addressable is currently identified, and (b) the moment Postgres is reachable
again, the full consolidated runtime matrix across 5.6/5.6A/5.6B/5.6C/5.6D needs to run before any
of the above CODE-level PASS marks can become a real, evidence-backed COMPLETE.
