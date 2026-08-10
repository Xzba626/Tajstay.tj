# TajStay Heritage Visual Layer

> **Modern Tajik Heritage** — белая архитектура UI + тонкий национальный орнамент + emerald CTA.  
> Phase 2 Design System **не заменяется**. Heritage — слой поверх DS.  
> **Phase 5F Foundation** implemented; Phase 5a Home **not started**.

```text
                 TajStay
                    │
        ┌───────────┴───────────┐
        │                       │
   Design System          Heritage Layer
   (Phase 2 tokens)       (patterns + cultural accents + hero video contract)
        │                       │
        └───────────┬───────────┘
                    │
               ALL PAGES
```

**Продуктовая идея:** не «сайт, украшенный узорами», а современный цифровой сервис Таджикистана. Орнамент = контур / рамка / divider / микроакцент — **не wallpaper**.

**Не возвращаем** тёмный `#004724` chrome.

---

## Hard rules

1. **One screen = one dominant heritage motif** (see `HERITAGE_MOTIF_BY_SCREEN`). Divider / Corner / Micro may accompany; never stack Chakan+Crown+Pamir+flag stripes on one viewport.
2. Buttons stay **emerald** — never gold/red primary CTAs.
3. Flag language via tokens (green UI / white canvas / red rare / gold heritage) — **not** literal tricolor bars everywhere.
4. Pattern density: desktop 100% · tablet ~60% · mobile ~35–40% (`--heritage-density`).
5. Hero video: cinematic still-life loop when assets exist; poster + `prefers-reduced-motion` otherwise. **No hardcoded remote production URL.**

---

## 1. Colors

### Canonical DS (locked — Phase 2)

| Role | Token | Hex |
|------|-------|-----|
| Primary | `--color-primary` | `#087F5B` |
| Primary Dark | `--color-primary-dark` | `#065F46` |
| White | `--color-surface` | `#FFFFFF` |
| Soft bg | `--color-background-soft` | `#F8FAFC` |
| Text | `--color-text` | `#111827` |
| Secondary | `--color-text-secondary` | `#6B7280` |
| Border | `--color-border` | `#E5E7EB` |

### Cultural accent tokens (Heritage — additive)

```css
--taj-red: #C1121F;   /* rare accent / danger cue — never full-screen */
--taj-gold: #D4A72C;  /* heritage / success micro / destination index */
--taj-blue: #2563A6;  /* rare cultural-geographic accent */
--taj-green: var(--color-primary);
```

| Share | Allowed |
|------:|---------|
| 80–90% | white, soft bg, emerald, gray text |
| 10–20% | ornament, gold, red, blue, photography |

---

## 2. Pattern family (`TajPattern` / `TajikPattern`)

| Kind | Role |
|------|------|
| `main` | Primary geometric diamond wash (Home/Search/Hotel/Footer) |
| `chakan` | Floral embroidery abstraction (Profile/Favorites/Reviews/Empty) |
| `crown` | Flag-inspired micro crown (Auth/Admin/Payment success) |
| `pamir` | Mountain polyline (Hero/Search/Hotel/404) |
| `dushanbe` | Arch geometry (About/city cards) |
| `divider` | Section separator `──── ◇ ✦ ◇ ────` |
| `corner` | Card / menu corner accent |
| `micro` | Label / title / status diamond |

Code: `src/components/ds/TajikPattern.tsx` · styles: `src/styles/heritage.css` · map: `src/lib/heritage/motifs.ts`

### Dominant motif by screen

| Screen | Motif |
|--------|-------|
| Home | Pamir |
| Search | Main |
| Hotel | Pamir |
| Booking / Payment / Success | Crown |
| Chat | Micro |
| Profile / Favorites | Chakan |
| Login / Register | Crown |
| About | Dushanbe |
| Owner | Micro |
| Admin | Divider |
| 404 | Pamir |
| Footer | Main |

### Forbidden / Allowed

❌ full-screen wallpaper · heavy 4-side ethnic borders · random mixed styles · red+gold+green everywhere · ornament inside dense tables / payment forms / every chat bubble  

✅ divider · corner · micro · section-header · empty-state · hero wash · footer · thin card accent  

---

## 3. Hero Video contract (Phase 5F)

| Piece | Path |
|-------|------|
| Resolve sources | `src/lib/heritage/heroVideo.ts` → `resolveHeroVideoSources()` |
| UI shell | `src/components/heritage/HeroVideo.tsx` |
| Default poster | `/public/heritage/hero-poster.svg` |
| Env | `NEXT_PUBLIC_HERO_VIDEO_MP4` / `_WEBM` / `_POSTER` (see `.env.example`) |

Behavior: muted · loop · playsInline · autoplay · object-fit cover · scrim for text · poster if no src / error / `prefers-reduced-motion`.

**Not wired into Home yet** — Phase 5a.

Cinematic intent: near-static shot (water/grass/clouds), 6–12s seamless loop — not a flying camera reel.

---

## 4. Screen density matrix

| Screen | Ornament |
|--------|----------:|
| Home | ★★★ |
| Search | ★ |
| Hotel | ★★ |
| Booking / Payment | ★ |
| Payment Success | ★★★ |
| Chat | ★ |
| Profile / Favorites | ★★ |
| Login / Register | ★★★ |
| Owner / Admin dashboards | ★ |
| Owner Finance / Admin tables | ☆ |
| 404 / Empty / Footer | ★★–★★★ |

---

## 5. Phase status

| Phase | Status |
|-------|--------|
| **5F Heritage Foundation** | Done (tokens, patterns, density, motif map, hero contract, VQA-01–04) |
| **5a Home** | **Blocked** — wait for explicit approval |
| 5b+ Search → … | Not started |

Business logic / API / Prisma / auth / booking / roles: unchanged.
