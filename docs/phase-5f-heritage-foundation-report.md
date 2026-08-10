# Phase 5F — Heritage Foundation (stop report)

**Status:** Complete — **Phase 5a Home not started.**  
**Date:** 2026-08-10  
**Canon:** Modern Tajik Heritage (white canvas + emerald CTA + Heritage Layer)

## Validation

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **Pass** |
| `npm run lint` | **Pass** (pre-existing OwnerOnboarding `exhaustive-deps` warnings only) |
| `next build` | Compile reached **✓ Compiled successfully**; full finish interrupted by hung typecheck after earlier SIGTERM kills of concurrent `next` processes. Prefer re-run `npm run build` alone (no `npm run dev`) to confirm. |

## Changed files

### Tokens / CSS
- `src/styles/tokens.css` — `--taj-red` `#C1121F`, `--taj-gold` `#D4A72C`, `--taj-blue` `#2563A6`, density vars
- `src/styles/heritage.css` — **new** pattern + hero video shell + density consumers
- `src/styles/ds-components.css` — pattern rules moved to heritage.css
- `src/app/globals.css` — import `heritage.css`; **VQA-01/02** auth CTAs → light DS
- `src/styles/home.css` — **VQA-03** mobile Sign In chip
- `src/styles/profile-hub.css` — **VQA-04** light ProfileHub hero (+ readable logout)

### Patterns / heritage
- `src/components/ds/TajikPattern.tsx` — family: Main, Chakan, Crown, Pamir, Dushanbe, Divider, Corner, Micro (+ legacy `subtle`/`footer`)
- `src/components/ds/index.ts` — exports `TajPattern` / `TajPatternKind`
- `src/lib/heritage/motifs.ts` — **one screen = one dominant motif** map
- `src/components/ui/EmptyState.tsx` — Chakan wash + Micro
- `src/components/layout/UserMenu.tsx` — left clean (no decorative motif; chrome stays DS-only until a screen motif is explicitly required)

### Hero video contract (not wired to Home)
- `src/lib/heritage/heroVideo.ts` — env-based `resolveHeroVideoSources()`
- `src/components/heritage/HeroVideo.tsx` — muted loop + poster + reduced-motion
- `src/components/heritage/index.ts`
- `public/heritage/hero-poster.svg`
- `.env.example` — optional `NEXT_PUBLIC_HERO_VIDEO_*`

### Docs
- `docs/heritage-visual-layer.md` — full canon + density + motif map + video
- `DESIGN.md` / `.agents/skills/tajstay-design/SKILL.md` — accent hex sync

## Regression notes

- **Kept:** Phase 2 DS, breakpoints, business logic, routes, role matrix, bottom nav.
- **Fixed:** VQA-01…04 light-chrome auth/profile contrast.
- **Not done:** Phase 5a Home redesign; production hero video asset; mass `premium-*` rebind.
- **Dark `#004724`:** still not used as app chrome.

## Next (needs explicit approval)

**Phase 5a — Home:** Pamir-dominant hero with `HeroVideo` + white search card + section motifs per density matrix.
