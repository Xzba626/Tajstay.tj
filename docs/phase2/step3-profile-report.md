# Step 3 — Profile Redesign Report

**Status:** COMPLETE (presentation layer) — authenticated browser QA **PARTIAL** (local Postgres unavailable)

**Date:** 2026-08-30

---

## Changed

| Area | Change |
|------|--------|
| **Identity** | Horizontal compact card: avatar (56px), name, role (Owner/Admin only), verification chips, edit icon button |
| **Summary** | Two-column strip: bookings + favorites counts (no cashback — no backend) |
| **Menu structure** | Grouped: **Основное** (History, Favorites, Notifications) + **Настройки** (Language, Security, Settings, Personal on mobile, Subscriptions) |
| **Desktop contacts** | Separate **Личные данные** group: Personal, Phone, Email, Telegram with meta |
| **Mobile density** | Smaller rows (2.75rem), compact icons, visible group titles, no per-row cards |
| **Promo banners** | Light green surface (`primary-soft`) instead of dark gradient |
| **Logout** | Light-theme destructive colors, focus/pressed states |
| **Guest state** | White canvas, readable title/copy contrast fix |
| **Subpages shell** | `profile-page-light` on `ProfileSubpageShell` |
| **i18n** | Added `profile.sectionSettings` (ru/tg/en) |

---

## Why

- **Audit:** Existing routes/actions preserved; presentation was fragmented (duplicate sections, dark-theme leaks, fake cashback).
- **Critique:** Removed generic "Пользователь" label; identity + summary fit first viewport; menu matches app-style IA spec.
- **Distill / Quieter:** Dropped verbose meta on primary rows; reduced radius/shadows; white + green only.
- **Arrange:** Clear hierarchy: identity → summary → primary nav → settings → role promo → logout.
- **A11y:** Focus rings on rows/buttons, aria-labels on nav groups, 44px-class touch targets, reduced-motion respected.
- **Polish:** Hover/active/pressed on menu rows and edit button.

---

## Existing functionality preserved

All routes unchanged:

- `/history`, `/favorites`, `/notifications`
- `/profile/settings`, `/profile/security`, `/profile/personal`
- `/profile/phone`, `/profile/email`, `/profile/telegram`, `/profile/subscriptions`
- `/profile/become-owner`, `/dashboard/owner`, `/dashboard/admin`
- Logout flow (`ProfileLogoutConfirm` + `/api/auth/logout`)
- Booking/favorites/notification/auth logic untouched
- No schema/API changes

---

## Skills actually used

| Skill | Applied to |
|-------|------------|
| **audit** | Mapped routes vs UI before editing; no logic removal |
| **critique** | Removed cashback, generic role text, dark banners, hidden mobile IA |
| **frontend-design** | White canvas, `#15803d` primary, semantic-only accents |
| **arrange** | Identity / summary / groups / secondary promo order |
| **distill** | Fewer sections, no duplicate language in main group |
| **quieter** | Flat borders, 0.75rem radius, no heavy shadows |
| **polish** | Interaction states on rows, buttons, summary links |
| **a11y** | Focus-visible, contrast fix on guest title, semantic nav labels |
| **test** | Browser QA guest mobile + desktop (see below) |

---

## Build

```
npm run build → PASS (exit 0)
```

## Lint

```
npm run lint → PASS (exit 0, 5 pre-existing owner-onboarding warnings)
```

---

## Browser QA

| Viewport | State | Result |
|----------|-------|--------|
| **390px** | Guest | PASS — white profile canvas, title readable after contrast fix, sign-in CTA |
| **1280px** | Guest | PASS — desktop header, profile block top-left, green primary button |
| **390px** | Authenticated | **BLOCKED** — Postgres auth failed locally; cannot seed/login as `guest@tajstay.local` |
| Settings / language flow | — | **DEFERRED** — requires authenticated session |

**Human-like QA (guest):**

| Question | Answer |
|----------|--------|
| Q1 — Whose profile in 3s? | Yes — "Профиль" + sign-in prompt |
| Q2 — History in 5s? | N/A (menu visible only when signed in) |
| Q3 — Primary actions clear? | Sign-in CTA is obvious |
| Q4 — Overloaded? | No — minimal guest state |
| Q5 — Visual noise? | Low on guest view |
| Q6 — Fake buttons? | No |
| Q7 — Missing affordances? | No |

**Authenticated QA (expected after DB available):** identity name visible, History/Favorites in first group, Settings group second, edit → personal, language → settings.

---

## Accessibility

- Dark text on white surfaces (`#0f172a` / `#334155`)
- Warning badges use `--warning` on light bg
- Notification badge: white on destructive red
- Keyboard: `:focus-visible` + `--focus-ring` on interactive rows
- Icon-only edit button has `aria-label`
- `prefers-reduced-motion: reduce` disables press transforms

---

## i18n

- New key: `profile.sectionSettings` (ru: Настройки, tg: Танзимот, en: Settings)
- Reuses existing keys for all menu labels
- Long strings (tg/en) use ellipsis on row meta via CSS

---

## Security impact

None — UI-only. Logout still uses existing POST `/api/auth/logout` with loading lock.

---

## Remaining problems

1. **Authenticated profile QA** needs running Postgres + `npm run db:seed`
2. **App shell footer** still dark below profile white canvas on mobile (shell-level, not profile component)
3. **Settings subpage** still uses legacy `mockup-menu` styles — visual parity deferred
4. **Language row** and **Settings row** both link to `/profile/settings` (intentional entry points; could split hash `#language` later)

---

## Files changed

- `src/components/profile/ProfileMockupView.tsx`
- `src/styles/profile-center.css`
- `src/components/profile/ProfileLogoutConfirm.tsx`
- `src/components/profile/ProfileSubpageShell.tsx`
- `src/app/profile/page.tsx`
- `src/lib/i18n/messages.ts`

---

## Screenshots / evidence

Captured in browser session (2026-08-30):

- Mobile 390px guest profile — white canvas + sign-in
- Desktop 1280px guest profile — title + CTA on white background

---

**Next step (when ready):** Step 4 — Admin redesign (not started per instructions).
