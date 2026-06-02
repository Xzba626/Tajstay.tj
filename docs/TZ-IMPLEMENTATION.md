# TajStay — TZ implementation tracker

Canonical spec: pasted in project chat (Parts 1–3). This file maps TZ → **actual repo paths** and tracks progress.

**PMS / RBAC / офлайн-синхронизация (для разработчиков):** см. [`docs/PMS-RBAC-SYNC.md`](./PMS-RBAC-SYNC.md) — архитектура панели владельца, персонала, матрица прав, синхронизация, архив.

## Architecture mapping (TZ vs codebase)

| TZ path | Actual path |
|---------|-------------|
| `app/profile/phone` | `/profile/account/phone` (+ redirect from `/profile/phone`) |
| `app/auth/login` | `/auth/sign-in` |
| `app/bookings` | `/dashboard/bookings` (guest) |
| `app/admin/*` | `/dashboard/admin/*` |
| `app/owner/*` | `/dashboard/owner/*` |
| `api/chats/*` | `/api/chat/booking/[bookingId]/*` |
| `lib/db.ts` | `src/lib/prisma.ts` |
| Roles `USER` | **`GUEST`** (use GUEST / OWNER / ADMIN) |
| DB `sqlite` in TZ sample | **PostgreSQL** in production (`prisma/schema.prisma`) |

## Part 1 — Design system

| Item | Status | Notes |
|------|--------|-------|
| CSS variables §1.1 | ✅ | `src/styles/tz-design-tokens.css` + legacy bridges |
| Playfair + Nunito | ✅ | fontsource in `layout.tsx`, `--font-body` / `--font-display` |
| Typography scale §1.2 | ✅ | `src/styles/tz-typography.css` |
| btn-primary / secondary / icon | ⚠️ | Existing `.btn-primary` in premium CSS; align to TZ heights gradually |
| Input + floating label | ⚠️ | `.tz-input-field` base; floating label = next step |
| StatusBadge | ✅ | `src/components/ui/StatusBadge.tsx` |
| Skeleton shimmer | ✅ | `src/components/ui/Skeleton.tsx` + `.tz-skeleton` |
| Toast | ⚠️ | `GlobalToast` + `.tz-toast` styles; unify API later |
| 8 animation rules | 📋 | Documented in TZ; apply per-screen incrementally |

## Profile stabilization (before new features)

| Item | Status |
|------|--------|
| Email save without OTP (logged in) | ✅ `POST /api/profile/email` |
| Phone save without OTP | ✅ `POST /api/profile/phone` |
| Telegram change isolated (`TelegramChangeRequest`, `cht_`) | ✅ |
| Telegram login/register (`linkUserId` removed) | ✅ |
| i18n profile keys | ✅ ru / tg / en |
| Remove duplicate email OTP API | ✅ deleted `email/request`, `email/confirm` |
| PR branch | `cursor/profile-account-fixes-97cc` → merge to `main` |

## Part 2 — Screens

Existing routes; pixel-perfect pass per TZ is **incremental** (home, search, hotel, booking steps, chat, profile, bottom nav).

## Part 3 — Backend / Admin

| Item | Status |
|------|--------|
| Prisma schema (full) | ✅ exists (Int ids, not cuid — do not rewrite blindly) |
| 35+ API routes | ✅ ~110 route files under `src/app/api` |
| PDF receipt | 🔍 locate `generateReceipt` / booking document routes |
| Admin payment confirm | ✅ `api/admin/bookings/.../confirm-payment` |
| Chat on booking create | ✅ booking + chat APIs |

## Recommended order for Cursor

1. Merge **profile-account-fixes** → `main`, deploy, smoke-test profile + auth.
2. Finish Part 1 atoms (floating label, Toast hook, ripple on primary button).
3. One screen at a time from Part 2 checklist (home → search → hotel → booking).
4. Admin/owner only after profile + guest flows are stable.

## Build rule

After each batch: `npm run build` must pass before push.
