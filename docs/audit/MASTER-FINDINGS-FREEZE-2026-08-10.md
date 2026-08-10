# TajStay — Master Findings Freeze (post-Runtime)

**Date:** 2026-08-10  
**Mode:** RESEARCH freeze — **not** a remediation plan  
**Maturity:** **≤ 4.5/10** · **Release:** BLOCKED  
**Restyle / Design System:** deferred until P0/P1 remediation  

Sources: Security · BI · Backend #2 · Payment Integrity · Product Stage A · **Runtime Validation**

---

## P0 — do not ship

| ID | Problem | Proof |
|----|---------|-------|
| SEC-001 | Secrets in git history | Static / history |
| SEC-003 | KYC Blob public | Static |
| BI-001 / SEC-010 | Concurrent double soft-hold | Static (+ prior BI); **implement only on explicit command** |
| BI-002 / SEC-011 | Owner approve without proof | **RUNTIME CONFIRMED** |
| BE2-200…202 | Offline cross-tenant BOLA (`OR` clobber) | **RUNTIME CONFIRMED** |
| BE2-005 | COMPLETED without Payout | **RUNTIME CONFIRMED** |
| BE2-010 | Duplicate paper Refund SENT | **RUNTIME CONFIRMED** |
| BE-007 | Duplicate Payout | **RUNTIME CONFIRMED** |
| TS-CNT-001 | Legal placeholders (+ `/privacy` 404) | **RUNTIME CONFIRMED** |
| TS-UI-001 | Competing design tokens | Static product |
| TS-SEO-01 | Sitemap without `/hotel/*` | **RUNTIME CONFIRMED** |
| TS-UX-005 | Sticky book CTA unwired | **RUNTIME CONFIRMED** |

SEC-005: **not** active BFLA — hardening only.

---

## Pipeline (locked)

```text
STATIC AUDITS ✅ → RUNTIME VALIDATION ✅ (local/dev)
  → MASTER FINDINGS (this file)
  → REMEDIATION (needs MODE: IMPLEMENTATION per item)
  → REGRESSION / POSTGRES PROOF
  → RE-AUDIT
  → DESIGN SYSTEM → RESTYLE
  → FINAL RUNTIME QA (prod build + CWV)
  → RELEASE GATE
```

## Explicit gates

- Do **not** implement BI-001 until: `MODE: IMPLEMENTATION` + `implement BI-001`
- Do **not** restyle to mask P0
- Lighthouse on `next dev` is **DEV-ONLY** — not production CWV
