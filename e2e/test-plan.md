# TajStay E2E test plan (human scenarios)

Plain-language scenarios for AI + Playwright MCP. Not automated specs yet — entry point for browser QA and future `@playwright/test` generation.

**Base URL:** `http://localhost:3000` (dev) or preview deploy URL.

---

## Smoke — anonymous

### S1 Home loads
- Open `/`
- Expect: header, search entry, bottom nav (Home active)

### S2 Search
- Open `/search`
- Apply city/dates if UI present
- Expect: results or empty state with hint

### S3 Tours placeholder
- Open `/tours`
- Expect: page renders without error

---

## Auth — guest

### S4 Sign in
- Open `/auth/sign-in`
- Complete sign-in (OTP/sim per env)
- Expect: redirect; session visible in header/profile

### S5 Profile hub
- Open `/profile`
- Expect: Account Center layout (sections Main / Personal / Account / App)
- Tap History → lands on `/history` (not duplicate history UI inside profile)

### S6 Favorites link
- From profile → Favorites → `/favorites`

---

## History

### S7 Tabs
- Open `/history`
- Switch: confirmed, unconfirmed, past, cancelled, all
- Expect: URL `?tab=` updates; cards use HistoryRecordCard pattern

### S8 Booking detail
- From a history card → open detail
- Expect: `/chat/booking/[id]` or documented detail route

---

## TST Assistant

### S9 Open / close
- Open TST from FAB
- Close via UI control
- Expect: no body scroll lock stuck; FAB visible when closed

### S10 History intent
- Ask (ru/en): «покажи подтверждённые брони»
- Expect: navigates to `/history?tab=confirmed` (auth required)

---

## Mobile layout

### S11 Viewport 390px
- Repeat S5, S7, S9 at mobile width
- Expect: no horizontal scroll on profile/history; bottom nav not covered

---

## Regression triggers (re-run after changes)

- Navigation / bottom tabs
- Profile IA
- History classify tabs
- TST drawer + auth gates
- Payment link from history card
