# TajStay — Full Technical Audit Report

**Date:** 2026-08-10  
**Scope:** Static engineering audit of repository `Tajstay.tj`  
**Method:** Full inventory + schema review + auth/security pattern analysis + feature wiring checks  
**Not in this pass:** Live browser E2E of every role action (requires running Node 18–20 + Postgres + seeded env). Marked separately as **RUNTIME PENDING**.

**Inventory verified:**
| Asset | Count |
|-------|------:|
| App pages (`page.tsx`) | 50 |
| Layouts | 6 |
| API route handlers | 142 |
| React components (`src/components`) | 217 |
| Lib modules (`src/lib`) | 206 |
| Prisma models | 43 |
| Product tests (`*.test.ts` in src) | **0** |
| Design CSS files (`src/styles`) | 25 (many overlapping) |

---

## 1. Architecture

**Stack (actual):** Next.js 14 App Router monolith · TypeScript · Prisma · PostgreSQL · Auth.js / legacy session · Zod (partial) · REST Route Handlers.

**Layers present:**
- `src/app` — pages + API
- `src/components` / `features` / `widgets` / `entities` / `processes` / `shared` — mixed FSD-ish + legacy
- `src/lib` — domain, auth, services, i18n, security
- `prisma/` — schema + migrations

**Verdict:** Functional monolith with rich domain (booking/PMS/chat/owner apps). Architecture is **usable but overloaded**: god-pages, CSS cascade wars, dual auth cookies, incomplete validation layer.

**Critical meta finding:** `.agents/` directory is **missing** from the workspace at audit time (skills catalog unavailable). Earlier cleanup may have been lost or deleted.

---

## 2. Project structure

### Strengths
- Clear API namespace: `/api/admin`, `/api/owner`, `/api/moderator`, `/api/bookings`, `/api/auth`
- Domain helpers under `src/lib/domain`, `src/lib/pms`, `src/lib/chat`
- Permissions model in `src/lib/auth/permissions.ts`

### Problems
| Issue | Severity | Evidence |
|-------|----------|----------|
| God pages | Blocker (maintainability) | `dashboard/admin/page.tsx` ~1477 LOC; `owner/page.tsx` ~1605 LOC |
| i18n megaton | Warning | `messages.ts` ~5494 LOC |
| CSS megaton + duplicates | Warning | `globals.css` ~3165 LOC; 25 style sheets; `home-pr2.css` not imported |
| Dual onboarding paths | Warning | `/apply/owner` + `/profile/become-owner` + dual APIs |
| Mixed FSD + flat components | Warning | `entities/features/widgets` + huge `components/` |

---

## 3. Frontend

### Pages (50) — status summary

| Area | Pages | Status |
|------|-------|--------|
| Public marketing | `/`, about, faq, contacts, terms, policy | **COMPLETE** (UI recently restyled Pamir; brand green requested for next refactor) |
| Search / map / hotel | `/search`, `/map`, `/hotel/[id]` | **COMPLETE** core browse |
| Auth | sign-in, forgot/reset, verify | **COMPLETE** |
| Guest trips | `/dashboard/bookings`, `/dashboard/guest`, favorites, notifications, chat | **COMPLETE** |
| Booking/payment | `/booking`, `/payment/[code]` | **COMPLETE** MVP escrow/proof flow |
| Owner | `/dashboard/owner` (monolith sections) | **PARTIAL** — feature-rich but UX-heavy |
| Moderator | `/dashboard/moderator` | **PARTIAL** |
| Admin | `/dashboard/admin`, chat-archive, owner-requests | **COMPLETE** ops surface |
| Profile | many split pages under `/profile/**` | **PARTIAL** — possible over-splitting |

### Dead / orphan UI (UNUSED)
| Symbol | Evidence |
|--------|----------|
| `TajstayHero3D` | Defined only; no page imports after home rewrite |
| `AIRecommendationLab` | Defined only; removed from home |
| `HotelStickyBookBar` | Defined only; not wired to hotel page |
| `home-pr2.css` | Exists under `src/styles/`, **not** in `globals.css` imports |

### UI/branding note (for future refactor)
Current tokens drift toward Pamir Light (teal). **Product requirement for next visual pass:** primary **green** + white + neutrals (restore brand green intentionally, drop neon glow).

---

## 4. Backend / API

### Coverage by prefix
| Prefix | Routes | Auth pattern |
|--------|-------:|--------------|
| admin | 32 | `getAdminUser` / `requireUser(["ADMIN"])`; content via `runAdminContentPost` |
| owner | 25 | `getOwnerUser` / middleware cookie gate |
| moderator | 8 | middleware + role checks |
| auth | 20 | public / session |
| bookings | 10 | mixed guest/session + rate limit |
| chat | 7 | `requireUser` + `canAccessBookingChat` |
| profile | 11 | session |
| cron/jobs/seed | 4 | secrets / prod guards |
| other | ~25 | search public, health, push, etc. |

### Validation
- **Zod on ~30/142** routes (~21%)
- Rest: manual `FormData` / `Number()` parsing — **Warning**

### Notable API findings
| ID | Sev | Finding |
|----|-----|---------|
| API-01 | Blocker | Secrets committed in `.env.example` (Google + Telegram) |
| API-02 | Warning | Middleware trusts `tajstay_role` cookie; pages use DB role (soft privilege UX leak) |
| API-03 | Warning | `/api/admin` not in middleware matcher — relies on per-route auth (currently OK for content via wrapper) |
| API-04 | Warning | In-memory `rateLimit` Map — not multi-instance safe |
| API-05 | OK | Seed blocked in production; jobs need `JOB_SECRET` |
| API-06 | OK | Chat init uses `canAccessBookingChat` |
| API-07 | Warning | Telegram webhook accepts POST without secret if env empty |

---

## 5. Database / Prisma (43 models)

### Models inventory
User, PropertyType, Account, OwnerApplication, OwnerApplicationDocumentViewLog, Hotel, RoomType, RoomTypePhoto, RatePlan, Room, HotelStaff, HotelModerator, RoomPhoto, RoomDateOverride, Booking, ChatMessage, ChatArchive, HostProfile, Payment, Payout, Refund, TransactionLog, HotelPhoto, HotelAmenity, Dispute, Review, Notification, PushSubscription, Complaint, Session, VerificationToken, EmailVerificationToken, PasswordResetToken, EmailOtp, OtpChallenge, Favorite, AdminSecurityState, SiteContentState, TelegramChangeRequest, TelegramLoginChallenge, AuthAuditLog, UserDeviceSession, OwnerPaymentMethod.

### Strengths
- Booking indexes on dates/status/roomType
- Soft delete `Hotel.deletedAt`
- Chat archive model + `chatArchivedAt`
- Owner PII encryption path + document view audit log
- Auth audit / device sessions

### Issues
| ID | Sev | Finding |
|----|-----|---------|
| DB-01 | Warning | `User.role` is free `String` — not Prisma enum |
| DB-02 | Warning | Booking status as String — risk of invalid states |
| DB-03 | Warning | Dual room refs (`roomId` + `assignedRoomId` + `roomTypeId`) — complexity / null paths |
| DB-04 | Warning | `RatePlan` / `HotelStaff` barely used in app code vs `HotelModerator` |
| DB-05 | Warning | High write models (ChatMessage, Notification) need retention jobs (cron exists partially) |
| DB-06 | Info | 57 index/unique markers — solid baseline; load test still **RUNTIME PENDING** |

### Load readiness
Schema can support moderate marketplace load. Bottlenecks likely: search without dedicated geo index beyond lat/lng floats, chat polling/streams, admin god-page N+1 queries. **Needs load test** before claiming scale.

---

## 6. Roles (actual)

| Role in code | Exists? | Notes |
|--------------|---------|-------|
| GUEST | Yes | Default |
| OWNER | Yes | After approved application |
| HOTEL_MODERATOR | Yes | Hotel-scoped permissions |
| ADMIN | Yes | Full |
| MANAGER | **No** | Not a platform role |
| SUPER_ADMIN | **No** | Does not exist |
| User (generic) | = GUEST path | |

Permissions matrix: `src/lib/auth/permissions.ts` — moderator ⊂ owner ⊂ admin.

---

## 7. Feature completeness matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Register / login / logout | COMPLETE | Phone/email/Firebase/Telegram/Google |
| Password reset / OTP | COMPLETE | Resend optional |
| Search / filters / map | COMPLETE | |
| Hotel detail / book | COMPLETE | Sticky bar unused |
| Payment proof / owner approve | COMPLETE | MVP escrow |
| Offline bookings | COMPLETE | Owner + moderator |
| Calendar overrides | COMPLETE | |
| Chat per booking | COMPLETE | Archive + cron |
| Reviews | COMPLETE | |
| Favorites | COMPLETE | |
| Owner application + encrypt PII | COMPLETE | Too many docs (see §10) |
| Admin hotel approve/reject | COMPLETE | |
| Payouts | PARTIAL | Created on admin complete; limited owner UI |
| Refunds | PARTIAL | Admin payment path creates; thin UI |
| Disputes | PARTIAL | API + inbox hints; not full product |
| Analytics | PARTIAL | Admin/owner aggregates, not BI |
| Push / Pusher | PARTIAL | Optional integrations |
| Demo reset | **MISSING** | Must design (see §12) |
| Automated tests | **MISSING** | 0 product tests |
| Agent skills catalog | **MISSING** | `.agents` absent |

---

## 8. Performance

| Issue | Sev |
|-------|-----|
| Admin/owner pages load massive parallel Prisma in one RSC | Warning |
| CSS cascade: 20+ sheets fighting | Warning |
| In-memory rate limit | Warning |
| 3D hero removed (good) but other heavy client maps remain | Info |
| No CDN strategy documented for uploads beyond Vercel Blob | Info |

---

## 9. Security

### Blockers
1. **Secrets in git:** `.env.example` lines 37, 61, 63 — rotate Google OAuth client secret + Telegram secrets; replace with empty placeholders.
2. **No automated security/regression tests** for IDOR/auth.

### Warnings
- Role cookie used by middleware without DB verify
- Zod coverage ~21%
- Webhook secret optional in non-prod / empty env
- Job secrets in query string risk (logs/Referer)
- Owner application documents — ensure storage is private (path design exists; runtime ACL **RUNTIME PENDING**)

### OK
- Prisma parameterized queries (no raw user SQL except health `$queryRaw\`SELECT 1\``)
- `safeRedirect` same-origin
- `runAdminContentPost` enforces admin
- Owner hotels POST requires `getOwnerUser`
- Field encryption for owner PII (`OWNER_DATA_ENCRYPTION_KEY`)

---

## 10. Owner flows — deep findings

### Add property (current)
Required: name, city, address, description, cover image, property type.  
Lat/lng: **manual fields**; empty → defaults Dushanbe (`38.5598`, `68.787`) in `owner/hotels/route.ts`.  
**Limit:** 1 hotel per owner (`existingCount >= 1`).

**Refactor recommendations (do not implement in this audit):**
- Map picker / paste Google|Yandex|OSM link → parse coords
- Drop manual lat/lng from required UX
- Minimize required fields: name, city, address, cover, type

### Owner verification (current)
Heavy: passport front/back, selfie, propertyDoc, INN, address, businessName, applicationMeta photos.  
Encryption: YES for PII strings + meta.  
Admin decrypt on review: YES.  
Reject with `rejectionReason`: YES (admin reject routes).

**Target model (gap):**
| Target | Now |
|--------|-----|
| FIO | Yes (fullName) |
| DOB if needed | Not clearly required |
| One management document | **Many** docs required |
| Encrypt at rest | Yes |
| Decrypt only for admin | Yes (pattern) |
| Approve/reject + reason | Yes |

---

## 11. UX / Owner panel IA

**Current:** Single mega-page with sections — high cognitive load.

**Proposed IA (future):**
1. Объект  
2. Комнаты / типы  
3. Бронирования  
4. Календарь  
5. Финансы  
6. Отзывы  
7. Аналитика  
8. Настройки / персонал  

Split `dashboard/owner/page.tsx` into route segments under `/dashboard/owner/*`.

---

## 12. Reset Demo Data — design (not implemented)

**Endpoint (proposed):** `POST /api/admin/demo/reset`  
**Auth:** ADMIN + confirm token (`DEMO_RESET_SECRET` or admin password re-entry)  
**Delete:** bookings (+ cascaded chat/payment/review/notifications where FK allows), payouts, refunds, disputes, transaction logs, favorites optional, analytics aggregates.  
**Keep:** users, roles, hotels structure (or flag `keepProperties`), migrations, SiteContentState, PropertyType.  
**Never:** drop schema / truncate users by default.

---

## 13. All findings (severity register)

### Blockers
| ID | Area | Description | Fix |
|----|------|-------------|-----|
| B1 | Sec | Secrets in `.env.example` | Rotate + scrub |
| B2 | QA | Zero product tests | Vitest + API integration suite |
| B3 | Arch | Admin/Owner god-pages | Split routes |
| B4 | Meta | `.agents` skills missing | Restore from backup if needed |

### Warnings
| ID | Area | Description |
|----|------|-------------|
| W1 | Sec | Middleware role cookie |
| W2 | API | Low Zod coverage |
| W3 | DB | Stringly-typed statuses/roles |
| W4 | UX | Owner onboarding doc overload |
| W5 | UX | Manual coordinates |
| W6 | CSS | Conflicting style layers |
| W7 | Feat | Payouts/refunds/disputes partial |
| W8 | Dead | Orphan hero/AI/sticky components |
| W9 | Perf | In-memory rate limit |
| W10 | Brand | Token drift vs green brand goal |

### OK / strengths
| ID | Note |
|----|------|
| S1 | Rich booking state machine + timers |
| S2 | PMS roles + permissions |
| S3 | Owner PII encryption + view audit |
| S4 | Chat archive policy |
| S5 | Chat access checks |
| S6 | Seed/job production guards |

---

## 14. Unused / delete candidates

- `TajstayHero3D.tsx`, `AIRecommendationLab.tsx`, `HotelStickyBookBar.tsx` (if product confirms)
- `src/styles/home-pr2.css`, possibly `mockup-shell.css` after verifying no class usage
- Consolidate duplicate owner apply entry points after choosing one funnel
- Review `RatePlan` / `HotelStaff` — migrate or remove if superseded by RoomType + HotelModerator

---

## 15. Full refactor plan (post-audit only)

### Phase 0 — Safety (1–2 days)
1. Rotate leaked secrets; clean `.env.example`  
2. Restore `.agents` from `.agents-backup-*` if available; keep slim skills  
3. Add Vitest + 15 critical API tests  

### Phase 1 — Security & API (1 week)
1. Middleware: role from session/JWT only  
2. Zod on all mutating routes  
3. `/api/admin` in middleware matcher  

### Phase 2 — Owner UX (1–2 weeks)
1. Map-based location; remove manual coords  
2. Slim verification to one document + FIO  
3. Split owner dashboard IA  

### Phase 3 — Design system (1 week)
1. Canonical **green + white + neutrals** tokens  
2. Delete conflicting CSS layers  
3. Shared component states (hover/focus/loading/skeleton)  

### Phase 4 — Domain cleanup (1–2 weeks)
1. Enum statuses in Prisma  
2. Unify room assignment model  
3. Complete payouts/refunds/disputes or hide from UI  
4. Demo reset tool  

### Phase 5 — Quality bar
1. Playwright: guest book → pay → owner confirm  
2. Load smoke on `/api/search`  
3. Accessibility AA pass on guest path  

---

## Methodology honesty

| Claim | Status |
|-------|--------|
| Every page file inventoried | **Yes** (50) |
| Every API route inventoried | **Yes** (142) |
| Every Prisma model inventoried | **Yes** (43) |
| Every function executed | **No** — static analysis |
| Every role action live-tested | **No** — **RUNTIME PENDING** |
| Assumptions avoided | Findings cite paths |

**Next step after user approval:** Phase 0 safety (secrets + tests), not visual churn.
