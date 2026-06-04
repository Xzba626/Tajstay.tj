# UI/UX upgrade — 10 screens (tracker)

| # | Screen | Changes |
|---|--------|---------|
| 1 | Splash | Plane → 🏨🗺️🔑 icons → logo with gold glow (`SplashScreenClient`, `splash-screen.css`) |
| 2–3 | Profile hub | Gold avatar ring, clickable stat tiles, removed duplicate «Редактировать» menu row, gold owner panel, red logout + confirm, less bottom padding |
| 4 | Profile edit | Inline name fields + photo on one page, sticky save bar (`ProfileEditClient`) |
| 5–6 | Owner/Admin mobile dashboard | Lucide stat icons, horizontal quick actions scroll, removed pull-to-refresh hint |
| 7 | Calendar override form | Room placeholder select, toggle for block (`Switch`, `CalendarOverrideForm`) |
| 8–10 | Calendar grid | Square status cells, compact scrollable legend, right-edge fade on horizontal scroll |

Build: `npm run build`
