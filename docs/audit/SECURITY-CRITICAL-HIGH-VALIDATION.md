# TajStay — Critical + High Validation Map (Этап A)

**Date:** 2026-08-10  
**Mode:** Validate only — **no fixes**  
**Sources:** `docs/audit/SECURITY-AUDIT.md` + re-read of cited code + `git log` on `.env.example`  
**Goal:** Separate **confirmed vulns** from **conditional / design debt / false severity** before Fix phase

---

## Validation legend

| Verdict | Meaning |
|---------|---------|
| **CONFIRMED** | Code evidence supports the issue; fix is justified |
| **CONDITIONAL** | Real only under specific deploy/env (must verify prod) |
| **DOWNGRADED** | Issue exists but original severity overstated for current usage |
| **NOT ACTIVE BFLA** | Pattern risky, but sampled handlers enforce auth today |
| **CLARIFIED** | Original wording mixed two different flows |

**Exploitability:** High / Medium / Low / Latent (needs poisoned data or future bug)

---

## Summary table (SEC-001 … SEC-013)

| ID | Title | Original | After validate | Verdict | Exploitability | Fix now? |
|----|-------|----------|----------------|---------|----------------|----------|
| SEC-001 | Secrets in `.env.example` | Critical | **Critical** | CONFIRMED | High (if live) | **Yes — Phase A0** (revoke/rotate, not just delete) |
| SEC-002 | Next / Auth.js advisories | Critical | **Critical** (supply chain) | CONFIRMED | Med–High* | Yes — after 001 plan |
| SEC-003 | KYC on public Blob | Critical | **Critical** | CONFIRMED | High (URL leak) | **Yes — top PII** |
| SEC-004 | `tajstay_role` middleware | High | **High** (defense-in-depth) | CONFIRMED | Med (not full bypass alone) | Yes — Phase B |
| SEC-005 | `/api/admin` no edge gate | High | **Medium** (arch) | NOT ACTIVE BFLA** | Latent | Soften; still harden |
| SEC-006 | Telegram webhook optional | High | **High CONDITIONAL** | CONDITIONAL | High if secret empty | Prod verify → fail-closed |
| SEC-007 | Weak `TJ-####` codes | High | **Medium** | DOWNGRADED | Low as auth; Med as enum | Fix RNG; not “token” |
| SEC-008 | Path traversal `readPrivateFile` | High | **High (latent)** | CONFIRMED gap | Latent† | Yes — cheap harden |
| SEC-009 | MIME-only upload | High | **High** | CONFIRMED | Med | Yes — with 003 |
| SEC-010 | Booking TOCTOU | High | **High / Critical biz** | CONFIRMED | High under concurrency | Yes — Phase B |
| SEC-011 | Owner approve w/o proof | High | **High (payment)** | CONFIRMED + CLARIFIED‡ | Med (owner session) | Policy decision |
| SEC-012 | Docker root + `:5432` | High | **High CONDITIONAL** | CONDITIONAL | High if exposed | If compose=prod |
| SEC-013 | form-data / nanoid High | High | **High** (deps) | CONFIRMED | Med | With SEC-002 |

\* Several Next Critical advisories target Server Actions — **none found in `src`**; Auth.js / cache / DoS still matter.  
\*\* All **32** `src/app/api/admin/**/route.ts` use `getAdminUser` or `runAdminContentPost` → `getAdminUser`.  
† Write path today uses UUID keys; exploit needs poisoned `storageRef` in DB.  
‡ **Not** “owner registration KYC approval without documents” — this is **booking payment** approve without payment proof.

---

## SEC-001 — Secrets in `.env.example`

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **OWASP / CWE** | A02 / A04 · CWE-798 · API8 |
| **File** | `.env.example` (tracked) |
| **Lines** | L36–37 `GOOGLE_CLIENT_*`; L61–63 `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_LOGIN_SECRET` |
| **Function / Endpoint** | N/A (repo secret leakage) |
| **Evidence** | Values look **non-placeholder**: `GOCSPX-…`, `Kf92jTajstayTelegram…`. `AUTH_SECRET=""`, `TELEGRAM_BOT_TOKEN=""` are empty (OK). |
| **Git history** | **CONFIRMED in history.** File tracked. `GOCSPX-` since `ed67388` (2026-05-19). Telegram secrets since `47bcd91` / `a380534` (2026-05-21). Remote: `origin https://github.com/Xzba626/Tajstay.tj.git`, branch tracks `main`. |
| **Are they “real”?** | **Treat as real until proven otherwise.** Static audit cannot confirm Google/Telegram consoles still accept them — **compromised-by-default** once in git. |
| **Affected roles** | All users if OAuth/Telegram abused; platform integrity |
| **Exploit scenario** | 1) Clone public/private repo or history. 2) Use Google client secret (if still valid) for OAuth abuse. 3) Use Telegram webhook/login secrets to forge updates / HMAC if bot still uses them. |
| **Impact** | Account linking / login spoofing; OAuth client compromise; trust loss |
| **Recommended fix** | **REVOKE → ROTATE → SCRUB → VERIFY** (not DELETE → DONE). Placeholders in `.env.example`. Rotate Google OAuth client secret + Telegram webhook/login secrets. Decide on history rewrite / BFG only after rotate. |
| **Regression test** | CI: fail PR if `.env.example` matches `GOCSPX-` / long non-empty `TELEGRAM_*_SECRET`. |
| **Validate status** | **CONFIRMED** |

---

## SEC-002 — Next.js / Auth.js supply chain

| Field | Detail |
|-------|--------|
| **Severity** | Critical (dependency) |
| **OWASP / CWE** | A03 · CWE-1035 |
| **File** | `package.json`: `next@14.1.0`, `next-auth@^5.0.0-beta.31` |
| **Evidence** | `npm audit --omit=dev`: **19** issues (4 Critical, 6 High, 9 Moderate) including `@auth/core`, `next`, `websocket-driver`, `form-data`, `nanoid`. |
| **Endpoint** | Framework-wide (`/api/auth/*`, image opt, etc.) |
| **Exploit scenario** | Advisory-dependent. Server Actions SSRF: **N/A today** (no `"use server"` in `src`). Auth.js Bearer/homoglyph/OAuth cookie binding: relevant if Auth.js login used. Cache/DoS: relevant at scale. |
| **Impact** | Auth integrity / DoS / future feature footguns |
| **Fix** | Upgrade Next to patched 14.x/15 line; upgrade `next-auth` / `@auth/core`; re-audit. |
| **Regression** | CI `npm audit --omit=dev --audit-level=high` |
| **Validate status** | **CONFIRMED** (severity stays Critical for supply chain; runtime exploit path not all Critical today) |

---

## SEC-003 — KYC / owner docs on public Vercel Blob

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **OWASP / CWE** | A01 · API3 · CWE-552 |
| **File** | `src/lib/uploads/savePrivateFile.ts` → `saveToPrivateBlob` L39–48 |
| **Function** | `put(storageKeyPath, buffer, { access: "public", ... })` |
| **Write endpoint** | `POST` via `src/app/api/owner-requests/route.ts` calling `savePrivateOwnerDoc` (passportFront/Back, selfie, propertyDoc, …) |
| **Read endpoint (intended)** | `GET /api/admin/owner-requests/[id]/file?type=…` — **ADMIN only** (`getAdminUser`) — good proxy pattern |
| **Evidence** | Comment says “never a public URL” but Blob `access: "public"` returns public URL stored in DB columns (`passportFront`, etc.). Admin UI should use file proxy; **anyone with the Blob URL bypasses app auth**. |
| **Affected roles** | Owner applicants (victims); Guest/anyone with URL (attacker); Admin (intended viewer) |
| **Exploit scenario** | 1) Obtain URL from DB dump, logs, Referer, leaked admin response, or guessable path if predictable. 2) `GET` Blob URL without TajStay session → passport/selfie/PDF. |
| **Open questions (pre-fix)** | Enumerateability of Blob paths? Old URLs after re-upload? Deleted user orphan objects? Does any API return raw Blob URL to non-admin? (admin list routes return booleans `passportFront: false` — good sign) |
| **Impact** | Identity document breach (highest PII impact in product) |
| **Fix** | Private Blob + short-TTL signed URL **or** store opaque key only + always proxy via admin API. Never `access: "public"` for KYC. |
| **Regression** | Unit: save path must not use public access; integration: Guest GET Blob URL returns 403/denied; Admin proxy still works. |
| **Validate status** | **CONFIRMED** |

---

## SEC-004 — Middleware trusts `tajstay_role`

| Field | Detail |
|-------|--------|
| **Severity** | High (not Critical alone) |
| **OWASP / CWE** | A01 · API5 · CWE-862/863 |
| **Files** | `src/middleware.ts` `enforceRoleForPath` L64–114; `src/lib/auth/sessionRole.ts` `readRoleFromRequest` L36–39 |
| **Evidence** | Role from **HttpOnly cookie** set by server at login — not freely set from JS, but **not bound to session integrity check in middleware**. Session presence = cookie **shape** (`64` hex) or Auth.js cookie exists — **no DB verify**. If `role` null, many checks `if (role && …)` **fail open**. |
| **Endpoints** | Edge gate for `/dashboard/admin|owner|moderator`, `/api/owner`, `/api/moderator` |
| **Affected roles** | All — UI/edge confusion |
| **Exploit scenario** | A) Delete/omit role cookie + keep valid guest session → middleware may **not** 403 `/api/owner` (handler `getOwnerUser` still rejects). B) Stale role cookie after demotion until re-login. C) Forged 64-hex session + forged role → passes **edge** into protected paths; **handler** still needs real session. |
| **Impact** | Broken defense-in-depth; **not** proven full privilege escalation if every handler checks DB (sampled: yes). One ungarded route under prefix = real BFLA. |
| **Fix** | Authoritative: session → user id → **DB role**. Fail closed if role required and missing. Treat `tajstay_role` as UX hint only or remove. |
| **Regression** | Test: guest session without role cookie cannot reach owner handler data; demoted user rejected on next request without waiting for cookie refresh. |
| **Validate status** | **CONFIRMED** as High defense-in-depth — **not** standalone Critical auth bypass |

---

## SEC-005 — `/api/admin` without middleware gate

| Field | Detail |
|-------|--------|
| **Severity** | **Revised → Medium** (architecture / latent) |
| **OWASP** | A01 · API5 · API9 |
| **File** | `src/middleware.ts` — admin API not in role enforcement paths |
| **Evidence** | Re-scan: **32/32** admin `route.ts` call `getAdminUser` or `runAdminContentPost` (which calls `getAdminUser`). |
| **Exploit scenario today** | **No active BFLA found** from missing middleware alone. Risk = future route forgets `getAdminUser`. |
| **Impact** | Latent full admin compromise if one route shipped without check |
| **Fix** | Still add edge gate with **DB session role** (defense-in-depth) + lint rule “admin routes must call getAdminUser”. |
| **Regression** | Checklist/CI: every `api/admin/**/route.ts` matches auth helper regex. |
| **Validate status** | **NOT ACTIVE BFLA** — keep as hardening, do not treat as Critical |

---

## SEC-006 — Telegram webhook secret optional

| Field | Detail |
|-------|--------|
| **Severity** | High **if** `TELEGRAM_WEBHOOK_SECRET` empty in prod |
| **OWASP** | A07 · A08 · API2 |
| **File** | `src/app/api/telegram/webhook/route.ts` L26–33 |
| **Endpoint** | `POST /api/telegram/webhook` (middleware early-bypasses this path) |
| **Evidence** | Secret checked only `if (secret) { … }`. Missing secret → accepts updates when bot configured. |
| **Exploit** | Forge Telegram Update JSON → drive login/contact handlers. |
| **Affected roles** | Guests using Telegram login; linked accounts |
| **Fix** | Production: require secret; 403 if unset. Register webhook with `secret_token`. |
| **Validate status** | **CONDITIONAL** — must check production env before ranking vs SEC-003 |

---

## SEC-007 — Weak `TJ-####` booking codes

| Field | Detail |
|-------|--------|
| **Severity** | **Revised → Medium** |
| **OWASP / CWE** | CWE-330 (weak RNG); privacy enum — **not** primary auth token |
| **File** | `src/lib/services/bookingCode.ts` |
| **Function** | `generateBookingCode` → `TJ-` + `randInt(1000,9999)` via `Math.random()` |
| **Endpoints using code** | `/payment/[code]` page; cancel by code; emails/notifications |
| **Evidence of mitigation** | `payment/[code]/page.tsx` L26–37: `requireUser` + `booking.userId !== user.id` → `notFound()`. Cancel route L19–24: same `userId` check. |
| **Exploit as “security token”** | **Mostly false** for current payment/cancel — code alone insufficient. |
| **Remaining risk** | Enumeration for social engineering; log correlation; **future** code-only API would be dangerous. |
| **Fix** | Longer opaque `crypto` code for URLs; optional short display code separate. |
| **Validate status** | **DOWNGRADED** — still fix RNG; not same class as KYC/secrets |

---

## SEC-008 — Path traversal in `readPrivateFile`

| Field | Detail |
|-------|--------|
| **Severity** | High (latent) |
| **CWE** | CWE-22 |
| **File** | `src/lib/uploads/readPrivateFile.ts` `readLocalPrivate` / `readLegacyPublicUpload` |
| **Sink endpoint** | `GET /api/admin/owner-requests/[id]/file` → `readOwnerRequestFile(storageRef)` |
| **Evidence** | `path.join(cwd, "private/owner-docs", rel)` **without** `resolved.startsWith(baseDir)`. Write path uses `storageKey(userId, slot, uuid)` — safe today. |
| **Exploit** | Needs DB/`applicationMeta` containing `../` or absolute-like ref → admin GET reads outside tree. |
| **Impact** | Arbitrary file read as app user (`.env`, keys) if poisoned |
| **Fix** | Normalize + containment assert; reject `..` and absolute; refuse unexpected schemes |
| **Validate status** | **CONFIRMED code gap**; exploit **latent** |

---

## SEC-009 — MIME-only upload validation

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **CWE** | CWE-434 |
| **Files** | `savePrivateFile.ts`, `saveUpload.ts`, `applicationUpload.ts` |
| **Evidence** | Allowlist via `file.type` (client-controlled); size limits exist; no magic-byte sniff / image decode. SVG not in KYC MIME map (good). |
| **Endpoints** | Owner-request upload; hotel/public uploads (`saveUpload` also public Blob) |
| **Exploit** | Polyglot / wrong content stored as `.jpg`/`.pdf`; PDF XSS if served `inline` (admin file route uses inline for PDF). |
| **Fix** | Magic bytes + re-encode images; PDF as `attachment` + CSP; never trust `Content-Type` alone |
| **Validate status** | **CONFIRMED** |

---

## SEC-010 — Booking inventory race (TOCTOU)

| Field | Detail |
|-------|--------|
| **Severity** | High (business-critical; can argue Critical for marketplace integrity) |
| **OWASP** | A06 · A10 · API6 |
| **Files** | `src/lib/services/bookingPricing.ts` (`assertDatesAvailable` / `assertRoomTypeAvailable`); `src/app/api/bookings/route.ts` `POST` create L111–151; Prisma `Booking` indexes **without** exclusion constraint |
| **Endpoint** | `POST /api/bookings` |
| **Evidence** | Availability checked inside pricing helpers, then **separate** `booking.create` — no serializable transaction / `FOR UPDATE` / Postgres `EXCLUDE`. |
| **Exploit** | Two concurrent POSTs same room/dates → both pass assert → two `WAITING_PAYMENT` holds. |
| **Affected roles** | Guests (double charge risk); Owners (ops chaos); Platform (trust) |
| **Fix** | DB exclusion on overlapping active statuses **or** transaction with row locks; unique business rules for holds |
| **Regression** | Concurrency test: 20 parallel creates → ≤1 active hold |
| **Validate status** | **CONFIRMED** |

---

## SEC-011 — Owner payment approve without proof

| Field | Detail |
|-------|--------|
| **Severity** | High (business / fraud) |
| **OWASP** | A06 · API6 |
| **File** | `src/lib/bookings/ownerPaymentApprove.ts` |
| **Function** | `confirmBookingPaymentOwner` — `ALLOWED_STATUSES` includes `WAITING_PAYMENT`, `WAIT_PROOF`, `ON_REVIEW` |
| **Endpoint** | `POST /api/owner/bookings/[id]/payment-approve` |
| **CLARIFICATION** | This is **booking payment confirmation**, **not** owner-application KYC approval. Admin KYC approve is a separate flow. |
| **Evidence** | Sets `CONFIRMED` + `paymentStatus: PAID` without requiring `paymentProofUrl`. Ownership check `hotel.ownerId === ownerId` present (not cross-owner IDOR). |
| **Exploit** | Compromised/colluding owner marks unpaid booking paid → skip guest payment / distort fees. |
| **Impact** | Financial integrity, commission, dispute evidence |
| **Fix** | Product decision: (a) require proof + `ON_REVIEW`, or (b) explicit “cash/manual capture” permission + audit log. Admin path already stricter (proof required) — align. |
| **Validate status** | **CONFIRMED** + **CLARIFIED** |

---

## SEC-012 — Docker / compose

| Field | Detail |
|-------|--------|
| **Severity** | High **if** this compose is production |
| **OWASP** | A02 |
| **Files** | `Dockerfile` (no `USER` → root); `docker-compose.yml` publishes `5432:5432`, default `AUTH_SECRET=change-me-in-production`, DB `postgres/postgres` |
| **Exploit** | Internet-exposed Postgres + weak creds → data breach; weak AUTH_SECRET → session forge |
| **Note** | Vercel-first deploy may not use this compose — **conditional** |
| **Fix** | Non-root; secrets from env/files; Postgres internal-only; never default AUTH_SECRET |
| **Validate status** | **CONDITIONAL** |

---

## SEC-013 — Transitive High advisories

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **OWASP** | A03 |
| **Evidence** | `npm audit`: `form-data` CRLF; `nanoid` loop; bundled with Critical Next/Auth tree |
| **Fix** | Same upgrade stream as SEC-002 |
| **Validate status** | **CONFIRMED** |

---

## Proposed Fix order (after this validation)

Not the original blind `001→003→006→002`. After validate:

### Wave 0 — Immediate ops (no code required first)
1. **SEC-001:** Confirm in Google Cloud Console + Telegram BotFather whether committed secrets still valid → **revoke/rotate**  
2. **SEC-006:** Confirm production `TELEGRAM_WEBHOOK_SECRET` is set  
3. **SEC-012:** Confirm whether Docker compose is internet-facing  

### Wave 1 — PII & secrets in repo (code + process)
1. **SEC-003** private Blob / proxy-only storage  
2. **SEC-001** scrub `.env.example` to placeholders (after rotate)  
3. **SEC-009** magic bytes (especially KYC uploads)  
4. **SEC-008** path containment (cheap, same upload area)  

### Wave 2 — Auth foundation
1. **SEC-002 + SEC-013** dependency upgrades  
2. **SEC-004** (+ soft **SEC-005**) DB session at edge  

### Wave 3 — Business integrity
1. **SEC-010** booking exclusion / transaction  
2. **SEC-011** payment approve policy  
3. **SEC-007** stronger codes (lower priority)  

---

## What this means for “middleware = vulnerability?”

Your instinct is correct:

> absence of middleware ≠ automatic vulnerability.

**SEC-005** is **NOT** an active BFLA today.  
**SEC-004** is a **real** flaw in the trust model, but handlers often save you — still must not rely on that.

Authoritative model to enforce later:

```text
cookie/session token
      ↓
verify session (DB)
      ↓
load user + role from DB
      ↓
authorize
```

---

## Artifacts

| Doc | Path |
|-----|------|
| Full security audit | `docs/audit/SECURITY-AUDIT.md` |
| Root pointer | `SECURITY-AUDIT.md` |
| This validation map | `docs/audit/SECURITY-CRITICAL-HIGH-VALIDATION.md` |
| Maturity charter | `docs/audit/TAJSTAY-PRODUCT-MATURITY-AUDIT.md` |

**Next:** You walk Critical/High **line-by-line** using this map. When you say go, we start **Wave 0 ops** (rotate secrets) then **Wave 1 code** with acceptance tests — not a blanket “fix all SEC”.
