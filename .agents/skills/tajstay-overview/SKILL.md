---
name: tajstay-overview
description: 'TajStay stack truth: Next.js 14 App Router monolith, Prisma/PostgreSQL, Auth.js + REST Route Handlers. Use before any architecture or API work so agents do not invent Drizzle/tRPC/Zustand as product stack.'
---

# TajStay — project overview

## Stack (authoritative)

| Layer | Reality |
|-------|---------|
| App | Next.js 14 App Router, package `tajstay` |
| Data | PostgreSQL + **Prisma** (not Drizzle) |
| API | REST Route Handlers under `src/app/api/**` (not tRPC as product API) |
| Auth | Auth.js + legacy session cookies; roles `GUEST`, `OWNER`, `HOTEL_MODERATOR`, `ADMIN` |
| UI state | React local state / server components; no product-wide Zustand requirement |
| Tests | No `npm test` script by default — add Vitest when introducing tests |

## Local workflow

- Node **18–20** (`engines`, `.nvmrc`)
- `npm install` → `prisma generate` via postinstall
- `npm run doctor` → migrate + seed
- `npm run dev` → http://localhost:3000 (preferred over `build` for local)
- Seed: Admin `+992900000001`/`Admin123!`, Owner `+992900000002`/`Owner123!`, Guest `+992900000003`/`Guest123!`

## Design

Visual system: [tajstay-design](../tajstay-design/SKILL.md) + root `DESIGN.md`.

## Do not

- Treat archived LobeHub skills (Drizzle, tRPC, Zustand stores) as TajStay architecture
- Commit secrets from `.env` / scrub `.env.example` of real-looking credentials
- Trust `tajstay_role` cookie alone for authorization — always verify server-side session
