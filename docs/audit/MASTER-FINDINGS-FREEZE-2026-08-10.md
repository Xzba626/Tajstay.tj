# TajStay — Master Findings Freeze (AUDIT CLOSED)

**Date:** 2026-08-10  
**Phase:** **AUDIT FROZEN** → remediation only on explicit `MODE: IMPLEMENTATION`  
**Maturity:** **≤ 4.5/10** · **Release:** **BLOCKED**  
**Restyle / Design System:** deferred until P0/P1 closed  

**Do not** re-run general Security / Backend / Payment / Product research passes.  
Diminishing returns — evidence is sufficient.

**Remediation queue:** `REMEDIATION-BACKLOG-P0-2026-08-10.md`

---

## Four broken invariants (proven)

| Invariant | IDs | Proof |
|-----------|-----|-------|
| Inventory uniqueness | BI-001 | Static (+ BI plan); concurrency harness still required for Closed |
| Tenant isolation | BE2-200…202 | **RUNTIME CONFIRMED** |
| Financial / booking atomicity & idempotency | BI-002, BE2-005, BE-007, BE2-010 | **RUNTIME CONFIRMED** |
| Product trust (legal / SEO / mobile CTA) | TS-CNT-001, TS-SEO-01, TS-UX-005 | **RUNTIME CONFIRMED** |

Plus security P0: **SEC-001**, **SEC-003** (static).

SEC-005: **not** active BFLA — hardening only.

---

## P0 board (do not ship)

| # | ID | Problem | Proof |
|---|-----|---------|-------|
| 1 | BI-001 / SEC-010 | Concurrent double soft-hold | Static; **Closed = 10×50 + PG UNIQUE** |
| 2 | BI-002 / SEC-011 | Owner approve → PAID without proof | **RUNTIME** |
| 3 | BE2-200…202 | Offline OR clobber BOLA | **RUNTIME** |
| 4 | BE2-005 | COMPLETED without Payout | **RUNTIME** |
| 5 | BE-007 | Complete×2 → 2 Payouts | **RUNTIME** |
| 6 | BE2-010 | Refund×2 → paper SENT×2 | **RUNTIME** |
| 7 | SEC-001 | Secrets in git history | Static |
| 8 | SEC-003 | KYC public Blob | Static |
| 9 | TS-CNT-001 | Legal placeholder + `/privacy` 404 | **RUNTIME** |
| 10 | TS-SEO-01 | Sitemap without hotels | **RUNTIME** |
| 11 | TS-UX-005 | Sticky book CTA unwired | **RUNTIME** |
| — | TS-UI-001 | Competing tokens | Static — Design System later |

---

## Pipeline (locked)

```text
AUDIT ✅ FROZEN
  → MASTER FINDINGS (this file)
  → REMEDIATION (one ID at a time, MODE: IMPLEMENTATION)
  → REGRESSION + PostgreSQL proof
  → RE-AUDIT (targeted)
  → PRODUCTION BUILD + real CWV
  → CONTENT/SEO/A11Y polish
  → DESIGN SYSTEM
  → RESTYLE (Modern Central Asian Hospitality — candidate)
  → FINAL RUNTIME QA
  → RELEASE GATE
```

---

## Evidence index

| Doc | Role |
|-----|------|
| `SECURITY-AUDIT.md` + validation | OWASP |
| `BOOKING-INTEGRITY-AUDIT.md` + `BI-001-REMEDIATION-PLAN.md` | Inventory |
| `BACKEND-DEEP-AUDIT-2026-08-10.md` | API / AuthZ |
| `PAYMENT-INTEGRITY-AUDIT-2026-08-10.md` + state machine | Finance |
| `RUNTIME-VALIDATION-2026-08-10.md` | Runtime proofs |
| `REMEDIATION-BACKLOG-P0-2026-08-10.md` | What to fix next |

---

## Start remediation

```text
MODE: IMPLEMENTATION
implement BI-001
```

Until that (or another `implement <ID>`): **no code fixes**.
