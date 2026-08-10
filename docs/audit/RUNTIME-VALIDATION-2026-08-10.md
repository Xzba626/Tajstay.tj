# TajStay — Runtime Validation Pass

**Date:** 2026-08-10  
**Mode:** `MODE: RESEARCH` — **no code changes, no fixes, no redesign**  
**Environment:** local `npm run dev` @ http://localhost:3000 · PostgreSQL 16 · seed data  
**Node:** v22.x (`.nvmrc` 24 not installed on VM; app ran)  
**Companion static audits:** Security · Booking Integrity · Backend #2 · Payment Integrity · Product Stage A  

**Product maturity:** remains **≤ 4.5/10**  
**BI-001:** still **OPEN** — not implemented  
**Restyle:** still **deferred**

---

## Evidence vocabulary

| Label | Meaning |
|-------|---------|
| **RUNTIME CONFIRMED** | Reproduced against running app (HTTP/SQL/UI) |
| **RUNTIME PARTIAL** | Observed but incomplete path / tooling limits |
| **RUNTIME NOT REPRODUCED** | Attempted; did not observe failure |
| **DEV-ONLY / NOT PROD CWV** | Lighthouse against `next dev` — **not** production Core Web Vitals |
| **STILL STATIC ONLY** | Not exercised in this pass |

---

## 0. Executive verdict

Runtime validates the most dangerous static findings:

| ID | Static claim | Runtime |
|----|--------------|---------|
| **BE2-005** | COMPLETED without Payout | **RUNTIME CONFIRMED** — booking `1` → `COMPLETED`, `Payout` count **0** |
| **BE2-010** | Paper Refund SENT + duplicates | **RUNTIME CONFIRMED** — **2** `Refund` rows `SENT` after double admin REFUNDED |
| **BE-007** | Duplicate Payout | **RUNTIME CONFIRMED** — **2** `Payout PENDING` for booking `3` |
| **BI-002 / SEC-011** | Owner approve without proof | **RUNTIME CONFIRMED** — booking `3` `WAITING_PAYMENT` → `CONFIRMED`+`PAID`+`CAPTURED` with empty proof |
| **BE-012** | Proof false `{ok:true}` | **RUNTIME CONFIRMED** — second proof returns ok; URL unchanged |
| **BE2-200…202** | Offline `OR` clobber BOLA | **RUNTIME CONFIRMED** — owner+moderator read foreign hotel “Secret Guest” |
| **TS-CNT-001** | Legal placeholders | **RUNTIME CONFIRMED** — `/terms` + `/policy` admin-placeholder copy; `/privacy` **404** (footer link broken) |
| **TS-UX-005** | Sticky book bar unwired | **RUNTIME CONFIRMED** — mobile hotel ~400px: no sticky book CTA; component only defined, not mounted |
| **TS-SEO-01** | Sitemap misses hotels | **RUNTIME CONFIRMED** — `/sitemap.xml` static URLs only (no `/hotel/1`) |
| **BI-001** | Concurrent double hold | **STILL STATIC ONLY** — concurrent load not re-run this pass (prior BI audit) |

**Release stance:** still **BLOCKED**. Runtime did not soften P0 — it hardened several Criticals from “code suspicion” to **observed behavior**.

---

## 1. Environment setup (repro)

```text
pg_ctlcluster 16 main start
.env from .env.example + AUTH_SECRET + JOB_SECRET
npm run doctor   # migrate + seed
npm run dev      # :3000
GET /api/health → {"ok":true,"db":"up"}
```

Seed users used: Guest `+992900000003` / `Guest123!` · Owner `+992900000002` / `Owner123!` · Admin `+992900000001` / `Admin123!` · Moderator `+992900000004` / `Moderator123!`

---

## A. Guest journey (API + UI)

### A1. API / finance path (RUNTIME CONFIRMED)

| Step | Expected | Actual | Verdict |
|------|----------|--------|---------|
| Login guest | Session | `POST /api/auth/email/login` 200 · `/api/auth/me` → GUEST | PASS |
| Search | Hotels | `GET /api/search?maxPrice=9999` → total=1 | PASS |
| Create booking | WAITING_PAYMENT + Payment PENDING | booking `2` created (`TJ-9918`) | PASS |
| Submit proof | ON_REVIEW | `payments/proof` → ON_REVIEW | PASS |
| Duplicate proof | 409 / no-op error | `{ok:true}` again; URL not replaced | **BE-012 RUNTIME** |
| Create unpaid booking | WAITING_PAYMENT | booking `3` | PASS |
| Owner approve w/o proof | Should reject | → CONFIRMED+PAID+CAPTURED | **BI-002 RUNTIME** |
| Guest checkout PAID | COMPLETED + payout policy | COMPLETED, **0 payouts** | **BE2-005 RUNTIME** |
| Admin confirm with proof | CONFIRMED | booking `2` CONFIRMED+CAPTURED | PASS (happy path) |
| Admin complete ×2 | One payout | **2× Payout PENDING** | **BE-007 RUNTIME** |
| Admin REFUNDED ×2 | One refund / real money | **2× Refund SENT** + payment REFUNDED; payouts remain | **BE2-010 RUNTIME** + §I fiction |

### A2. UI path (browser)

| Step | Viewport | Expected | Actual | Verdict |
|------|----------|----------|--------|---------|
| Home | ~1440 | Brand + hero + search | Present (Verdant-style hero); lang/PWA banners | PASS / UX noise |
| Search | ~1440 | Results | `/search?city=Dushanbe` shows 1 hotel + map; form/card click flaky in automation | PARTIAL |
| Hotel | ~1440 | Info + Book CTA | Sidebar “Book now” / FROM 550 TJS | PASS |
| Hotel | ~390–400 | Sticky book bar | **Not visible**; bottom = PWA / tab bar | **TS-UX-005 FAIL** |
| Terms | any | Legal | Placeholder: «будет добавлено администратором» | **TS-CNT-001** |
| Privacy | any | Legal | `/privacy` **404**; real page is `/policy` (also placeholder) | **TS-CNT-001 + broken link** |

Screenshots: `/opt/cursor/artifacts/runtime-validation/` (incl. `e597c.webp` mobile hotel, `b24cf.webp` terms, `f1d68.webp` privacy 404).

### A3. Guest step rubric (condensed)

| Step | Loading | Empty | Error | Recovery | Mobile | Desktop |
|------|---------|-------|-------|----------|--------|---------|
| Home | OK | n/a | n/a | n/a | PARTIAL (banners) | OK |
| Search | OK | not hit | not hit | URL works if form fails | PARTIAL | PARTIAL |
| Hotel | OK | n/a | low contrast copy | desktop CTA | **sticky missing** | CTA OK |
| Booking/Payment UI | **PARTIAL** — full browser book→pay not completed; **API path proven** | | | | | |
| Confirmation | API COMPLETED proven | | | | | |

---

## B. Owner journey

| Check | Actual | Verdict |
|-------|--------|---------|
| Login | 200 | PASS |
| Dashboard `/dashboard/owner` | 200 with session | PASS (smoke) |
| Offline list `?roomId=<foreign>` | Returns **Secret Guest** of other owner’s hotel | **BE2-202 RUNTIME CONFIRMED** |
| Payment approve without proof | booking 3 confirmed | **BI-002 RUNTIME** |
| Inventory/reports deep UI | Not fully walked | PARTIAL / GAP |
| Tenant isolation (online bookings) | Not attacked beyond offline BOLA | PARTIAL |

---

## C. Admin journey

| Check | Actual | Verdict |
|-------|--------|---------|
| Login | 200 | PASS |
| Dashboard `/dashboard/admin` | 200 smoke | PASS |
| Confirm payment (with proof) | booking 2 OK | PASS |
| Complete ×2 | duplicate payouts | **BE-007 RUNTIME** |
| Refund ×2 | duplicate SENT refunds | **BE2-010 RUNTIME** |
| KYC file public Blob | Not re-fetched from Blob CDN this pass | STILL STATIC (SEC-003) |
| Users/role abuse | Not runtime-abused | STILL STATIC (BE-010) |

---

## D. Moderator

| Check | Actual | Verdict |
|-------|--------|---------|
| Login `Moderator123!` | 200 | PASS |
| Offline search `q=Secret` | Sees Foreign Hotel guest | **BE2-200 RUNTIME** |
| Offline list `roomId=foreign` | Full PII row | **BE2-201 RUNTIME** |

---

## E. Google / Page Experience (DEV Lighthouse)

> **Caveat:** Measured on **`next dev`**. Treat as directional tooling output, **not** production CWV / release gate.

| Page | Viewport | Perf | SEO | A11y | LCP | CLS | TTFB (doc) | Notes |
|------|----------|-----:|----:|-----:|----:|----:|-----------:|-------|
| Home | mobile (LH) | 43 | 93 | 91 | **21.9 s** | 0.128 | ~120 ms | **DEV-ONLY** |
| Search | mobile | 45 | 100 | 88 | **25.4 s** | 0.128 | ~130 ms | **DEV-ONLY** |
| Hotel/1 | mobile | 43 | 100 | 90 | **21.4 s** | 0.128 | ~130 ms | **DEV-ONLY** |
| Booking | — | — | — | — | — | — | — | **GAP** (page not LH’d) |
| Payment | — | — | — | — | — | — | — | **GAP** |

**INP:** not reliably captured in this LH run (TBT ~1.3 s on home as proxy stress — DEV-ONLY).

**SEO runtime:**

| Check | Result |
|-------|--------|
| Titles present | Home/Search/Hotel OK |
| Sitemap hotels | **Missing** `/hotel/*` — TS-SEO-01 RUNTIME |
| robots.txt | 200 |
| `/privacy` vs `/policy` | Footer/privacy URL mismatch |

---

## F. Accessibility (spot)

| Check | Result |
|-------|--------|
| LH a11y scores (dev) | ~88–91 — **DEV-ONLY** |
| Contrast | UI notes: very light gray copy on white — **PARTIAL / needs dedicated a11y pass** |
| Keyboard / focus trap | **GAP** this pass |
| Sticky CTA missing | also a11y/mobile conversion issue |

---

## G. Load / concurrency

| Area | This pass |
|------|-----------|
| Booking TOCTOU (BI-001) | Not re-run (10×50) — **STILL OPEN / STATIC+prior** |
| Login/search/payment load | **GAP** |
| Expire vs confirm race | **GAP** (static BE-002 remains) |

---

## H. Backup / DR / Observability

| Area | This pass |
|------|-----------|
| Backup/restore | **GAP** |
| Job failure alerts | **GAP** |
| Error tracking | **GAP** |

---

## I. Finding promotion board (after runtime)

### Now RUNTIME CONFIRMED (Critical)

1. BE2-005 · BE2-010 · BE-007 · BI-002 · BE2-200 · BE2-201 · BE2-202  
2. TS-CNT-001 (placeholder + `/privacy` 404) · TS-UX-005 · TS-SEO-01  

### Still P0 but not runtime-proven here

- SEC-001 (git secrets) — historical  
- SEC-003 (public KYC blob) — static  
- BI-001 — needs concurrency harness  

### Positive runtime

- Guest login / search / booking create / proof / admin confirm-with-proof work on happy path  
- Health + DB up  
- Online create amount server-side (booking totals non-client)  

---

## J. What this pass deliberately did **not** do

- No production code changes  
- No BI-001 implementation  
- No restyle / design system  
- No production build Lighthouse  
- No full E2E Playwright suite committed  
- No DR drills  

---

## K. Recommended next steps (ordered)

```text
1. MASTER FINDINGS freeze (P0/P1/P2 backlog from all passes)
2. Remediation track for RUNTIME-CONFIRMED Criticals
   (BOLA OR-clobber, payout/refund ledger, owner proof gate, legal routes)
3. Keep BI-001 behind explicit: MODE: IMPLEMENTATION / implement BI-001
4. Production build + real CWV (not next dev)
5. Full E2E + concurrency harness
6. Only then Design System → Restyle
```

---

## Status footer

```text
MODE: RESEARCH ONLY
RUNTIME VALIDATION: EXECUTED (local)
CODE CHANGES: none
ARTIFACTS:
  docs/audit/RUNTIME-VALIDATION-2026-08-10.md
  /opt/cursor/artifacts/runtime-validation/*.webp
RELEASE-READY: no
MATURITY: ≤ 4.5/10
BI-001: OPEN (not implemented)
RESTYLE: deferred
```
