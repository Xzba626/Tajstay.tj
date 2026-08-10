# TajStay Security Audit

**Date:** 2026-08-10  
**Scope:** `c:\Users\Layoqat\Desktop\Tajstay.tj` (Next.js 14 + Prisma + PostgreSQL)  
**Mode:** Read-only — **no code changes** in this phase  
**Frameworks:** OWASP Top 10:2025 · OWASP API Security Top 10:2023 · CWE Top 25:2025 · Next.js / Node / Prisma / Docker

> **Note on “Aramat Plus” checklist:** That product uses OWNER/SELLER, stores, products, sales. **This repo is TajStay.** Equivalents used below:  
> `OWNER` ≈ hotel owner · `HOTEL_MODERATOR` ≈ staff/seller · `GUEST` ≈ customer · `hotelId` ≈ storeId · `bookingId` ≈ saleId · room/hotel ≈ product.

---

## Executive summary

| Severity | Count (unique IDs) |
|----------|--------------------|
| Critical | 3 |
| High | 10 |
| Medium | 12 |
| Low | 8 |
| Informational | 7 |

**Top risks to fix first**

1. Secrets committed in `.env.example` (rotate immediately if ever used in prod).  
2. Supply-chain: vulnerable `@auth/core` / `next@14.1.0` (Critical advisories via `npm audit`).  
3. Owner KYC docs uploaded to **public** Vercel Blob.  
4. Middleware authorizes from `tajstay_role` cookie (defense-in-depth failure).  
5. Booking inventory TOCTOU (double-hold race).  
6. Telegram webhook optional secret; path traversal gap in private file reads; MIME-only uploads.

**What looks solid (static)**

- Most owner/moderator/guest APIs check **DB session + role + resource ownership** (`getOwnerUser`, `getBookingForOwner`, `userId` match).  
- Online booking price computed server-side (not client `totalPrice`).  
- Register forces `GUEST`; no guest self-promote to ADMIN/OWNER found.  
- Almost no raw SQL (`$queryRaw` only `SELECT 1` in health).  
- No `dangerouslySetInnerHTML`, no Server Actions, no request-path `child_process`/`eval`.  
- Open redirects largely constrained via `safeReturnPath`.

**Not verified at runtime:** live E2E privilege escalation, production env values, multi-instance rate-limit effectiveness, whether `.env.example` secrets are still valid in Google/Telegram consoles.

---

## Severity ranking

### CRITICAL

| ID | Title |
|----|-------|
| SEC-001 | Real secrets in tracked `.env.example` |
| SEC-002 | Vulnerable Next.js / Auth.js (npm audit Critical) |
| SEC-003 | Owner ID documents on public Vercel Blob |

### HIGH

| ID | Title |
|----|-------|
| SEC-004 | Middleware trusts `tajstay_role`; fail-open if role missing |
| SEC-005 | `/api/admin/**` not gated by middleware |
| SEC-006 | Telegram webhook secret optional (fail-open) |
| SEC-007 | Weak enumerable booking codes (`TJ-####`) |
| SEC-008 | Path traversal gap in `readPrivateFile` / legacy uploads |
| SEC-009 | Upload validation = client MIME only (no magic bytes) |
| SEC-010 | Booking create/confirm TOCTOU (no exclusion lock) |
| SEC-011 | Owner can mark unpaid booking PAID without proof |
| SEC-012 | Docker: root container, weak defaults, Postgres `5432` published |
| SEC-013 | `form-data` / `nanoid` High advisories (transitive) |

### MEDIUM

| ID | Title |
|----|-------|
| SEC-014 | In-memory login rate limit + spoofable `X-Forwarded-For` |
| SEC-015 | Password change without current password / session revoke |
| SEC-016 | OTP / codes use `Math.random()` |
| SEC-017 | Payment proof URL over-permissive (`isSafeProofUrl`) |
| SEC-018 | CSRF: cookie auth APIs without Origin checks |
| SEC-019 | Host/origin trust when `AUTH_URL` missing |
| SEC-020 | `include: { user: true }` can load `password` hash into RSC graph |
| SEC-021 | Job secret via query string |
| SEC-022 | Telegram logs tokens / start payloads |
| SEC-023 | Debug `agentLog` to localhost ingest |
| SEC-024 | Admin role change lacks last-admin / session hygiene |
| SEC-025 | Dev crypto fallbacks if secrets unset outside prod guards |

### LOW

| ID | Title |
|----|-------|
| SEC-026 | Password policy inconsistent (6 vs 8) |
| SEC-027 | `verify-reset-otp` does not consume OTP |
| SEC-028 | Guest owner-application may be blocked by middleware role cookie |
| SEC-029 | Public review label may expose phone |
| SEC-030 | Content-Disposition filename unsanitized |
| SEC-031 | Cron open if `CRON_SECRET` unset in non-production |
| SEC-032 | Health endpoint discloses DB reachability |
| SEC-033 | Secure cookie flag only when `NODE_ENV=production` |

### INFORMATIONAL (OK / N/A)

| ID | Title |
|----|-------|
| SEC-I01 | Cross-owner hotel/booking IDOR — not found on sampled owner APIs |
| SEC-I02 | Guest booking/payment/chat IDOR — `userId` / chat ACL present |
| SEC-I03 | SQL injection via Prisma Unsafe — not found |
| SEC-I04 | XSS via `dangerouslySetInnerHTML` — not found |
| SEC-I05 | Command injection in request handlers — not found |
| SEC-I06 | LDAP / NoSQL — N/A |
| SEC-I07 | Stripe webhooks — N/A (not implemented) |

---

## Findings detail

### SEC-001 — Secrets in `.env.example`

| Field | Value |
|-------|--------|
| **Severity** | Critical |
| **CWE / OWASP** | CWE-798 · A02 Security Misconfiguration · A04 Cryptographic Failures · API8 |
| **File** | `.env.example` L36–37, L61–63 |
| **Problem** | Non-placeholder `GOOGLE_CLIENT_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_LOGIN_SECRET` committed. |
| **Exploit** | Clone repo / history → abuse OAuth client or forge Telegram webhook/HMAC if values are live. |
| **Impact** | Account takeover via OAuth misconfig; forged Telegram login updates. |
| **Fix** | Replace with empty placeholders; **rotate** Google + Telegram secrets; scrub git history if used in prod. |
| **Tests** | CI check: fail if `.env.example` matches secret regexes (`GOCSPX-`, long random webhook strings). |
| **Verify** | New secrets in consoles; old ones revoked; example file is placeholders only. |
| **Status** | Open |

### SEC-002 — Vulnerable Next.js / Auth.js

| Field | Value |
|-------|--------|
| **Severity** | Critical |
| **CWE / OWASP** | A03 Software Supply Chain Failures · CWE-1035 |
| **File** | `package.json` (`next@14.1.0`, `next-auth` beta / `@auth/core`) |
| **Problem** | `npm audit --omit=dev` reports Critical issues on `next` (SSRF in Server Actions, cache poisoning, auth bypass advisories, DoS) and `@auth/core` (malformed Bearer, email homoglyph, OAuth cookie binding). |
| **Exploit** | Depends on advisory; several require specific features (Server Actions — **not used** in `src` today; still upgrade). |
| **Impact** | Framework-level RCE/DoS/auth issues as attack surface evolves. |
| **Fix** | Upgrade Next to patched 14.x/15.x line; upgrade `next-auth` / `@auth/core`; re-run `npm audit`. |
| **Tests** | CI `npm audit --omit=dev --audit-level=high`. |
| **Status** | Open |

### SEC-003 — Public Blob for owner KYC docs

| Field | Value |
|-------|--------|
| **Severity** | Critical |
| **CWE / OWASP** | CWE-552 · A01 · API3 · Sensitive Data Exposure |
| **File** | `src/lib/uploads/savePrivateFile.ts` (~L47) `put(..., { access: "public" })` |
| **Problem** | “Private” owner docs stored as public Blob URLs. |
| **Exploit** | Leak/guess URL → passport/selfie/PDF without auth. |
| **Impact** | PII / KYC breach. |
| **Fix** | Private Blob + signed URLs, or only serve via authenticated admin file proxy; never store public URLs for PII. |
| **Status** | Open |

### SEC-004 — Middleware role cookie trust

| Field | Value |
|-------|--------|
| **Severity** | High |
| **CWE / OWASP** | CWE-862 / CWE-863 · A01 · API5 Broken Function Level Authorization |
| **File** | `src/middleware.ts` `enforceRoleForPath`; `src/lib/auth/sessionRole.ts` |
| **Problem** | Edge checks `tajstay_role` only. Session cookie only needs 64-hex **shape**. If `role` is missing, owner/admin path checks often **return null** (allow). |
| **Exploit** | Forged role cookie confuses UI gates; missing role + any session-shaped cookie passes edge into `/api/owner` — **handlers** with `getOwnerUser()` still reject, but any ungarded route under prefix is exposed. |
| **Impact** | Broken defense-in-depth; privilege confusion. |
| **Fix** | Resolve DB session in middleware **or** remove role gates; never authorize from role cookie; fail closed when role required and missing. |
| **Status** | Open |

### SEC-005 — Admin API not in middleware

| Field | Value |
|-------|--------|
| **Severity** | High (architecture) |
| **OWASP** | A01 · API5 · API9 |
| **File** | `src/middleware.ts` (`protectedApi` covers owner/moderator only) |
| **Problem** | `/api/admin/**` relies solely on per-handler checks. Spot-check: handlers call `getAdminUser` / `requireUser(["ADMIN"])` — good pattern, **zero edge backup**. |
| **Fix** | Gate `/api/admin` with session+DB role (not cookie). |
| **Status** | Open |

### SEC-006 — Telegram webhook optional secret

| Field | Value |
|-------|--------|
| **Severity** | High (if secret unset in prod) |
| **OWASP** | A07 · API2 · A08 (webhook integrity) |
| **File** | `src/app/api/telegram/webhook/route.ts` L26–33; middleware early-bypass |
| **Problem** | Secret verified only **if set**. |
| **Exploit** | POST forged Telegram updates → login/account linking abuse. |
| **Fix** | Fail closed in production when secret missing. |
| **Status** | Open |

### SEC-007 — Weak booking public codes

| Field | Value |
|-------|--------|
| **Severity** | High |
| **CWE** | CWE-330 · CWE-639 |
| **File** | `src/lib/services/bookingCode.ts` |
| **Problem** | `TJ-####` (~9k space), `Math.random()`. |
| **Exploit** | Enumerate codes for probing / social engineering; future code-only endpoints become IDOR. |
| **Fix** | `crypto.randomBytes` / longer opaque tokens. |
| **Status** | Open |

### SEC-008 — Path traversal in private readers

| Field | Value |
|-------|--------|
| **Severity** | High |
| **CWE** | CWE-22 |
| **File** | `src/lib/uploads/readPrivateFile.ts` (`path.join` without `startsWith(baseDir)`) |
| **Problem** | Unlike delete helpers, read path does not assert containment. |
| **Exploit** | Poisoned storage ref with `../` → read files under cwd if admin file GET used. |
| **Fix** | Resolve + `abs.startsWith(baseDir + sep)`; reject `..` / absolute paths. |
| **Status** | Open |

### SEC-009 — Upload MIME spoofing

| Field | Value |
|-------|--------|
| **Severity** | High |
| **CWE** | CWE-434 |
| **Files** | `saveUpload.ts`, `savePrivateFile.ts`, `applicationUpload.ts` |
| **Problem** | Size limits + MIME allowlist from client `file.type`; no magic bytes / re-encode. |
| **Exploit** | Polyglot / HTML-as-JPEG; PDF XSS when served inline. |
| **Fix** | `file-type` / sharp re-encode; serve docs as `attachment` + CSP sandbox. |
| **Status** | Open |

### SEC-010 — Booking inventory race

| Field | Value |
|-------|--------|
| **Severity** | High |
| **OWASP** | A06 Insecure Design · A10 Exceptional Conditions · API6 |
| **Files** | `src/app/api/bookings/route.ts`; availability helpers; Prisma `Booking` (no exclusion constraint) |
| **Problem** | Check-then-write without transaction/`FOR UPDATE`/exclusion constraint. |
| **Exploit** | Parallel POSTs → two holds for same room/dates. |
| **Fix** | Serializable transaction or exclusion constraint on room + daterange. |
| **Status** | Open |

### SEC-011 — Owner approve payment without proof

| Field | Value |
|-------|--------|
| **Severity** | High (business integrity) |
| **OWASP** | A06 · API6 |
| **File** | `src/lib/bookings/ownerPaymentApprove.ts` (`WAITING_PAYMENT` allowed) |
| **Problem** | Owner can set CONFIRMED/PAID from waiting states without proof. |
| **Impact** | Skip payment, distort commission, fraud reporting. |
| **Fix** | Require `ON_REVIEW` + proof, or explicit “cash/manual” permission + audit log. |
| **Status** | Open |

### SEC-012 — Docker / compose hardening

| Field | Value |
|-------|--------|
| **Severity** | High (deploy) |
| **OWASP** | A02 |
| **Files** | `Dockerfile` (no `USER`); `docker-compose.yml` (5432 published, `AUTH_SECRET` default `change-me-in-production`, DB `postgres/postgres`) |
| **Fix** | Non-root user; strong secrets; do not publish Postgres to host in prod; internal network only. |
| **Status** | Open |

### SEC-013 — Transitive High advisories

| Field | Value |
|-------|--------|
| **Severity** | High |
| **OWASP** | A03 |
| **Problem** | `form-data` CRLF; `nanoid` infinite loop advisories. |
| **Fix** | `npm audit fix` / overrides; re-test. |
| **Status** | Open |

### SEC-014 — Rate limit

| Field | Value |
|-------|--------|
| **Severity** | Medium |
| **OWASP** | A07 · API4 |
| **Files** | `src/lib/security/rateLimit.ts`; email login route |
| **Problem** | In-memory; trusts first `X-Forwarded-For`. |
| **Fix** | Redis/Upstash; IP from trusted proxy only. |
| **Status** | Open |

### SEC-015 — Password change hygiene

| Field | Value |
|-------|--------|
| **Severity** | Medium |
| **OWASP** | A07 |
| **File** | `src/app/api/profile/password/route.ts` |
| **Problem** | No current password; sessions not revoked. |
| **Fix** | Require current password; delete all sessions; rotate cookie. |
| **Status** | Open |

### SEC-016 — Weak OTP RNG

| Field | Value |
|-------|--------|
| **Severity** | Medium |
| **CWE** | CWE-330 |
| **File** | `src/lib/auth/otp.ts` |
| **Fix** | `crypto.randomInt`. |
| **Status** | Open |

### SEC-017 — Payment proof URL allowlist

| Field | Value |
|-------|--------|
| **Severity** | Medium–High |
| **File** | `src/app/api/payments/proof/route.ts` |
| **Problem** | Any path starting `/` (not `//`) or any public HTTPS. |
| **Fix** | Allow only `/uploads/...` sanitized or HTTPS allowlisted hosts. |
| **Status** | Open |

### SEC-018 — CSRF defense-in-depth

| Field | Value |
|-------|--------|
| **Severity** | Medium |
| **CWE** | CWE-352 |
| **Problem** | Session cookies `SameSite=Lax`; no Origin checks on custom mutating APIs. Auth.js CSRF covers `/api/auth/*` only. |
| **Fix** | Origin/Referer middleware for cookie-auth mutations. |
| **Status** | Open |

### SEC-019 — Public origin / Host header

| Field | Value |
|-------|--------|
| **Severity** | Medium |
| **File** | `src/lib/http/publicOrigin.ts` |
| **Fix** | Require `AUTH_URL` in production; allowlist hosts. |
| **Status** | Open |

### SEC-020 — Password hash in Prisma includes

| Field | Value |
|-------|--------|
| **Severity** | Medium |
| **OWASP** | A01 API3 Excessive Data Exposure |
| **Files** | e.g. hotel/owner pages `user: true` |
| **Fix** | Explicit `select` without `password`; never pass full User to Client Components. |
| **Status** | Open |

### SEC-021 — Job secret in query string

| Field | Value |
|-------|--------|
| **Severity** | Medium |
| **File** | `src/app/api/jobs/expire-bookings/route.ts` |
| **Fix** | Header-only (`Authorization: Bearer`). |
| **Status** | Open |

### SEC-022 / SEC-023 — Logging / debug

| Field | Value |
|-------|--------|
| **Severity** | Medium |
| **OWASP** | A09 |
| **Files** | `webhookHandlers.ts` (tokens); `agentLog.ts` |
| **Fix** | Redact tokens; gate `agentLog` to development only. |
| **Status** | Open |

### SEC-024 — Admin user update

| Field | Value |
|-------|--------|
| **Severity** | Medium |
| **File** | `src/app/api/admin/users/update/route.ts` |
| **Problem** | Can set any role including ADMIN; no last-admin protection noted. |
| **Fix** | Prevent demoting last admin; audit log; optional step-up auth. |
| **Status** | Open |

### SEC-025 — Dev secret fallbacks

| Field | Value |
|-------|--------|
| **Severity** | Medium (misconfig) |
| **Problem** | Telegram/encryption fallbacks if secrets unset (non-prod or optional paths). |
| **Fix** | Fail closed whenever feature enabled without strong secret. |
| **Status** | Open |

---

## Aramat-style business logic matrix (TajStay mapping)

| Attack (Aramat wording) | TajStay equivalent | Result (static) |
|-------------------------|--------------------|-----------------|
| SELLER → OWNER functions | Moderator → Owner API | Middleware blocks moderator→`/api/owner`; handlers also role-check |
| Change storeId | Change `hotelId` on another owner | Owner mutations scoped by `ownerId` — OK sampled |
| Change role via body | Mass-assign `role` | Register forces GUEST; admin-only role update |
| Change price client-side | Booking `totalPrice` | Online: server pricing — OK; offline owner: intentional |
| Change cost / stock | Inventory / payment | Owner payment-approve without proof — **SEC-011** |
| Sell more than stock | Overbook | Race — **SEC-010** |
| Duplicate sale | Double booking | Race — **SEC-010** |
| Cancel others’ sale | Cancel others’ booking | Guest cancel requires `userId` — OK |
| List all users | Admin users API | Admin-only — OK if handler present |
| Financial analytics | Owner finances | Moderator lacks PAYMENT_APPROVE — OK pattern |

---

## Checklist coverage

| Area | Status |
|------|--------|
| OWASP A01 Access Control | Findings SEC-004–005, 011, 020; many handlers OK |
| A02 Misconfiguration | SEC-001, 006, 012, 019, 031–033 |
| A03 Supply Chain | SEC-002, 013; lockfile present; postinstall = prisma generate |
| A04 Crypto | bcrypt present; SEC-001, 007, 016, 025 |
| A05 Injection | SQL mostly safe; XSS sinks clean; SEC-009 upload |
| A06 Insecure Design | SEC-010, 011 |
| A07 Auth Failures | SEC-006, 014, 015, 016 |
| A08 Integrity | SEC-006 webhook; CI/Actions not deeply audited |
| A09 Logging | SEC-021, 022, 023 |
| A10 Exceptional / races | SEC-010 |
| API1 BOLA | Guest/owner sampled OK; codes weak SEC-007 |
| API2 Auth | See A07 |
| API3 Property | SEC-020; offline price mass-assignment owner-scoped |
| API4 Resource | SEC-014 |
| API5 BFLA | SEC-004, 005 |
| API6 Business flows | SEC-010, 011 |
| API7 SSRF | No user-URL proxy found; Next advisory SEC-002 |
| API8 Misconfig | SEC-001, 012 |
| API9 Inventory | Admin/jobs/telegram/seed documented |
| API10 Unsafe consume | Blob fetch of stored URLs — paired with SEC-003/008 |
| Uploads | SEC-003, 008, 009, 017, 030 |
| PostgreSQL | Creds in example/compose; no Unsafe raw SQL |
| Docker | SEC-012 |
| MFA | Not implemented — Informational |

---

## Master table

| ID | Severity | Category | File | Problem | Impact | Recommended Fix | Status |
|----|----------|----------|------|---------|--------|-----------------|--------|
| SEC-001 | Critical | A02/A04 | `.env.example` | Real secrets committed | OAuth/Telegram compromise | Placeholders + rotate | Open |
| SEC-002 | Critical | A03 | `package.json` | Crit. Next/Auth advisories | Framework attacks | Upgrade Next/Auth | Open |
| SEC-003 | Critical | A01/API3 | `savePrivateFile.ts` | Public Blob for KYC | PII leak | Private Blob / proxy | Open |
| SEC-004 | High | A01/API5 | `middleware.ts` | Role cookie / fail-open | Edge auth confusion | DB session at edge | Open |
| SEC-005 | High | A01/API5 | `middleware.ts` | Admin API ungated at edge | Missed handler = breach | Gate `/api/admin` | Open |
| SEC-006 | High | A07/A08 | `telegram/webhook` | Optional webhook secret | Forged updates | Fail closed in prod | Open |
| SEC-007 | High | CWE-330 | `bookingCode.ts` | Short codes | Enumeration | Crypto long codes | Open |
| SEC-008 | High | CWE-22 | `readPrivateFile.ts` | No path containment | Arbitrary file read | Resolve+contain | Open |
| SEC-009 | High | CWE-434 | upload libs | MIME-only | Malicious upload | Magic bytes / re-encode | Open |
| SEC-010 | High | A06/A10 | bookings API | TOCTOU inventory | Double book | Txn / exclusion | Open |
| SEC-011 | High | A06/API6 | `ownerPaymentApprove.ts` | Approve without proof | Skip payment | Require proof / policy | Open |
| SEC-012 | High | A02 | Docker/compose | Root, weak secrets, :5432 | Host/DB takeover | Harden image/compose | Open |
| SEC-013 | High | A03 | lockfile | form-data/nanoid High | Supply chain | audit fix | Open |
| SEC-014 | Medium | A07/API4 | `rateLimit.ts` | In-memory / XFF | Brute force scale | Distributed RL | Open |
| SEC-015 | Medium | A07 | `profile/password` | No re-auth | Session theft → password steal | Current pwd + revoke | Open |
| SEC-016 | Medium | CWE-330 | `otp.ts` | Math.random OTP | Weaker codes | crypto.randomInt | Open |
| SEC-017 | Medium | A01 | `payments/proof` | Loose URL allowlist | Unexpected resources | Strict allowlist | Open |
| SEC-018 | Medium | CWE-352 | session cookies | No Origin checks | CSRF if cookie policy changes | Origin middleware | Open |
| SEC-019 | Medium | A02 | `publicOrigin.ts` | Host trust | Bad redirects/auth | Require AUTH_URL | Open |
| SEC-020 | Medium | API3 | hotel/owner pages | password in include | Hash leak to client | select omit password | Open |
| SEC-021 | Medium | A09 | jobs/expire | Secret in query | Log leak | Header only | Open |
| SEC-022 | Medium | A09 | telegram handlers | Token logs | Secret in logs | Redact | Open |
| SEC-023 | Medium | A09 | `agentLog.ts` | Prod debug ingest | Noise / exfil pattern | Dev-only | Open |
| SEC-024 | Medium | A01 | admin users update | Role escalation ops | Admin proliferation | Last-admin guard | Open |
| SEC-025 | Medium | A04 | telegram/crypto | Weak fallbacks | Misconfig crypto | Fail closed | Open |
| SEC-026 | Low | A07 | auth flows | Password length 6 vs 8 | Weaker passwords | Unify + unify ≥8 | Open |
| SEC-027 | Low | A07 | verify-reset-otp | OTP not consumed | Race/oracle | Single-use token | Open |
| SEC-028 | Low | A01 | middleware + applications | Guest apply blocked | Availability | Allow guest path | Open |
| SEC-029 | Low | Privacy | reviews/hotel | Phone as label | PII on public page | Anonymize | Open |
| SEC-030 | Low | CWE-113 | admin file route | Filename header | Header injection | Sanitize filename | Open |
| SEC-031 | Low | A02 | cron routes | Open without secret (non-prod) | Abuse in staging | Always require secret | Open |
| SEC-032 | Low | A02 | `/api/health` | DB status | Recon | Limit detail | Open |
| SEC-033 | Low | A04 | session cookies | Secure only in production NODE_ENV | Cookie theft on HTTP staging | Secure on HTTPS | Open |

---

## Recommended remediation order

1. **Immediate:** SEC-001 rotate/scrub secrets; SEC-003 private Blob; SEC-006 fail-closed webhook.  
2. **Sprint 1:** SEC-002/013 upgrades; SEC-004/005 auth edge; SEC-008/009/017 uploads.  
3. **Sprint 2:** SEC-010 inventory lock; SEC-011 payment policy; SEC-014/015 auth hardening.  
4. **Sprint 3:** Docker SEC-012; CSRF SEC-018; logging SEC-021–023; low items.  
5. **Then:** Re-audit + add Vitest for IDOR/BFLA on owner/admin/guest booking/payment.

---

## Method & limits

- Static analysis of `src/`, Prisma schema, Docker, `.env.example`, `npm audit --omit=dev`.  
- Parallel review of auth, injection/upload, business logic / supply chain.  
- **No** dynamic exploitation, **no** code fixes in this phase (per request).  
- Middleware presence ≠ authorization — each finding checked for **handler-level** controls where relevant.
