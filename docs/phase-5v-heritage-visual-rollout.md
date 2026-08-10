# Phase 5V — Heritage Visual Rollout (group 1)

**Status:** Shell + Home + Auth + Profile visually applied. **Not** Search/Hotel/Booking/Owner/Admin yet.  
**Rule:** Foundation ≠ done. This phase counts only when the browser shows white canvas + wired motifs.

## Visible changes

| Surface | What changed in the browser |
|---------|------------------------------|
| Global `@layer base` | Dark `bg-brand-900 text-white` → soft white canvas + dark text |
| Glass / brand-gradient / ds-input in `@layer components` | Light surfaces + emerald primary |
| Splash | No `#004724` — soft white/emerald splash |
| Mobile drawer | White panel + dark text (was `#032d1f`) |
| Header ≥1200 | Live `TajPattern` divider (not CSS bars only) |
| Footer | Heritage divider + border token |
| Home | `home-hero-pamir--heritage`, `HomeHeroMedia` + HeroVideo contract (desktop video if env set; mobile poster), section motifs wired (divider / pamir / chakan / crown) |
| Auth | White page/card via `heritage-rollout.css`; Crown motif on welcome; solid emerald CTA |
| ProfileHub | Chakan wash on hero; light owner/admin banners |

## Files (key)

- `src/styles/heritage-rollout.css` **(new)**
- `src/app/globals.css` — import + `@layer` light rewrite
- `src/app/page.tsx`, `HomeHeroMedia.tsx`, `HomeSectionHeader.tsx`, `HomeReviewsSection.tsx`
- `src/components/heritage/HeroVideo.tsx` — bleed + mobile poster
- `Header.tsx`, `Footer.tsx`, `SignInClient.tsx`, `ProfileHubView.tsx`
- `splash-screen.css` overridden via rollout; `profile-hub.css`, `admin-mobile-app.css` banners

## Unchanged (by design)

API · Prisma · auth/booking logic · routes · roles · Owner/Admin full pages (next groups)

## Next groups (need approval to continue)

2. Search / Hotel / Booking / Payment / Chat  
3. Owner  
4. Admin  

## Verify locally

```powershell
npm run dev
# open /  /auth/sign-in  /profile
# hard refresh — expect white canvas, emerald CTAs, thin motifs
```

Hero video file: set `NEXT_PUBLIC_HERO_VIDEO_MP4` (optional). Without it, poster/cover still shows heritage hero chrome.
