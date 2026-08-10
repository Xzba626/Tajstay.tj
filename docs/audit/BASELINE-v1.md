# TajStay — Baseline v1 (frozen)

**Frozen:** 2026-08-10  
**Mode:** Evidence baseline · **no remediation in this snapshot**  
**Rule:** Scores and finding IDs below are the reference until a finding is Closed with verify steps.

---

## 1. Inventory (technical)

| Asset | Count |
|------:|------:|
| App pages | 50 |
| API route handlers | 142 |
| Prisma models | 43 |
| Product tests in `src` | **0** |
| npm audit (prod) | **19** (4 Critical, 6 High, 9 Moderate) |

Source: `docs/audit/TAJSTAY-FULL-TECHNICAL-AUDIT-2026-08-10.md`

---

## 2. Security (research-only)

| Severity | Count |
|----------|------:|
| Critical | 3 |
| High | 10 |
| Medium | 12 |
| Low | 8 |
| Informational OK | 7 |

Source: `docs/audit/SECURITY-AUDIT.md`  
Validation of Critical+High: `docs/audit/SECURITY-CRITICAL-HIGH-VALIDATION.md`

**Research principle (locked):** find → confirm → impact → fix → regression test → re-check.  
No code changes during audit passes.

---

## 3. Maturity scorecard (baseline)

| Area | Score |
|------|------:|
| Security | 3/10 |
| Architecture | 5/10 |
| Backend | 6/10 |
| Database | 6/10 |
| Frontend | 5/10 |
| Business Logic | 5/10 |
| UX/UI | 5/10 |
| Performance | 4/10 |
| SEO | 5/10 |
| Testing | 1/10 |
| Production Readiness | 4/10 |
| **Overall** | **4.5/10** |

Source: `docs/audit/TAJSTAY-PRODUCT-MATURITY-AUDIT.md`

---

## 4. Priority doctrine (locked)

```text
Security → Integrity → Reliability → Performance → UX polish
```

Do **not** expand the checklist infinitely. Next work is either:

1. **Phase A — Stop the bleeding** (ops + confirmed Critical), or  
2. **Deep Pass — Business Logic + Database** (booking integrity / race),  

then RBAC/BOLA matrix via direct API, then mutating-API Zod matrix, then Perf/UX/SEO.

---

## 5. Phase A — Stop the bleeding (corrected ID map)

User intent mapped to validated SEC IDs:

| Step | Focus | Correct SEC ID(s) | Notes from validation |
|------|--------|-------------------|------------------------|
| 1 | Secrets | **SEC-001** | REVOKE→ROTATE→SCRUB→VERIFY |
| 2 | Public KYC Blob | **SEC-003** | Top PII |
| 3 | Telegram webhook optional | **SEC-006** | CONDITIONAL on prod env |
| 4 | Next/Auth supply chain | **SEC-002** (+ SEC-013) | Not “role cookie” |
| 5 | Role cookie / edge AuthZ | **SEC-004** (+ harden SEC-005) | SEC-005 = not active BFLA today |
| 6 | Remaining Critical/High | 008, 009, 010, 011, 012… | Per validation waves |

> Note: An earlier draft listed “SEC-006 = Auth.js” and “SEC-002 = role cookie”.  
> **Authoritative map is the validation doc**, not that draft.

Before each fix: confirm → impact → fix → regression test → re-check.

---

## 6. Release gate (definition)

| Gate | Condition |
|------|-----------|
| ❌ **BLOCKED** | Any confirmed Critical that enables account takeover, AuthZ bypass, KYC/PII leak, financial loss, double booking, or infra compromise |
| ⚠️ **CONDITIONAL** | Critical closed; High remain with owners/mitigations |
| 🟢 **PRODUCTION READY** | Critical closed; High controlled; regression/security tests exist; runtime happy-path verified |

**Baseline gate status:** ❌ **BLOCKED** (SEC-001, SEC-003 open; **BI-001/SEC-010 confirmed** in code; Testing 1/10)

---

## 7. Deep passes

| Pass | Status | Doc |
|------|--------|-----|
| Security Validation v1 | **Frozen** | `SECURITY-VALIDATION-v1.md` |
| Booking Integrity (SEC-010) | **Done (research)** | `BOOKING-INTEGRITY-AUDIT.md` |
| RBAC/BOLA matrix (API) | Queued | — |
| Mutating API Zod matrix | Queued | — |

**Booking headline:** BI-001 Critical (TOCTOU / no DB exclusion); BI-002 Critical (owner approve without proof).

**BI-001 remediation plan (no code yet):** `docs/audit/BI-001-REMEDIATION-PLAN.md` — Hybrid (txn lock + night slots + logical expiry + idempotency); Closed only with 10×50 concurrency proof on Postgres.

---

## 8. Document index

| Doc | Path |
|-----|------|
| This freeze | `docs/audit/BASELINE-v1.md` |
| Technical audit | `docs/audit/TAJSTAY-FULL-TECHNICAL-AUDIT-2026-08-10.md` |
| Security audit | `docs/audit/SECURITY-AUDIT.md` |
| Critical/High validation | `docs/audit/SECURITY-CRITICAL-HIGH-VALIDATION.md` |
| Security Validation v1 | `docs/audit/SECURITY-VALIDATION-v1.md` |
| Booking Integrity | `docs/audit/BOOKING-INTEGRITY-AUDIT.md` |
| BI-001 Remediation Plan | `docs/audit/BI-001-REMEDIATION-PLAN.md` |
| Maturity charter | `docs/audit/TAJSTAY-PRODUCT-MATURITY-AUDIT.md` |
