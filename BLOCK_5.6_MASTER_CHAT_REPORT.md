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

## 10. Verdict

```
RELIABILITY FIX (401 loop + controlled auth-expired state)   = CODE COMPLETE, RUNTIME BLOCKED
REQUEST RACE GUARD (sequence counter, no AbortController)     = CODE COMPLETE, RUNTIME BLOCKED
QUICK-REPLY PILL COMPACTION (owner/admin)                     = CODE COMPLETE, RUNTIME/A11Y BLOCKED
GUEST QUICK-REPLIES (kept visible, recolored)                 = CODE COMPLETE, RUNTIME BLOCKED
LIGHT-MODE COLOR/TOKEN REBUILD (header/pills/bubbles/system/  = CODE COMPLETE, RUNTIME BLOCKED
  date-divider/composer/toasts/banners)
MOBILE FULLSCREEN LAYOUT REBUILD                              = NOT STARTED
ROLE-SPECIFIC UI SEPARATION                                   = NOT AUDITED THIS PASS
DISPUTE vs COMPLAINT RECONCILIATION DECISION                  = DECIDED (Dispute canonical), NOT EXECUTED
ADMIN DISPUTES LIST                                           = NOT BUILT (recommended next step)
SYSTEM-EVENT SEMANTIC MODEL                                   = NOT STARTED
DEAD CHAT UI (TripBookingCard/TripChatRow)                    = CONFIRMED DEAD, NOT DELETED

BLOCK 5.6 MASTER CHAT (this pass) = PARTIAL
```

No blanket COMPLETE. Static gates (tsc/eslint/build) are clean; every user-facing/runtime claim is
explicitly BLOCKED by the still-unresolved shared-Postgres credential conflict from BLOCK 5.5A.1,
not glossed over as inspection-only PASS.

## 11. Next steps (in order, once DB is restored)

1. Full runtime matrix from the original BLOCK 5.6 spec: real Guest↔Owner chat session, auth-expiry
   simulate-and-recover, 10+ minute reliability session, mobile 375×812 + desktop, RU/TG/EN sampling.
2. Build and verify the Admin Disputes list (§7).
3. Mobile fullscreen layout rebuild + floating-assistant/bottom-nav suppression (§8).
4. Confirm-dialog recoloring (§5, explicitly deferred).
5. Re-run BLOCK 5.2–5.4 regression scripts alongside the new chat reliability behavior.

Not starting Booking Wizard visual rebuild, Profile, or general Owner/Admin redesign — out of scope
per instruction. `.agent/STATE.md` updated separately with this pass's DONE/OPEN/NEXT.
