# Security Validation v1 (frozen)

**Frozen:** 2026-08-10  
**Source:** `docs/audit/SECURITY-CRITICAL-HIGH-VALIDATION.md`  
**Parent baseline:** `docs/audit/BASELINE-v1.md`

## Principle

Static finding ≠ automatically Critical.  
Each Critical/High gets a **verdict**: CONFIRMED / CONDITIONAL / DOWNGRADED / NOT ACTIVE / CLARIFIED.

## Verdict table (authoritative)

| ID | Status | Comment |
|----|--------|---------|
| SEC-001 | 🔴 Critical | CONFIRMED — secrets in Git history since 2026-05-19/21. Fix = REVOKE→ROTATE→SCRUB→VERIFY |
| SEC-002 | 🔴 Critical* | CONFIRMED supply chain; advisory applicability varies (no Server Actions in `src`) |
| SEC-003 | 🔴 Critical | CONFIRMED — KYC Blob `access:public`; storage bypasses app proxy |
| SEC-004 | 🟠 High | CONFIRMED — `tajstay_role` not authoritative |
| SEC-005 | 🟡 Medium | NOT ACTIVE BFLA — 32/32 admin handlers authorize |
| SEC-006 | 🟠 High/Conditional | Depends on prod webhook secret |
| SEC-007 | 🟡 Medium | DOWNGRADED — code + session + userId |
| SEC-008 | 🟠 High latent | Primitive confirmed; needs poisoned ref |
| SEC-009 | 🟠 High | MIME-only upload |
| SEC-010 | 🔴/🟠 Critical business | Booking TOCTOU — next deep-pass target |
| SEC-011 | 🟠 High | Booking **payment** approve, not KYC |
| SEC-012 | 🟠 Conditional | Docker/network exposure |
| SEC-013 | 🟠 High | Transitive deps (with SEC-002) |

## Security Validation Accuracy

| Bucket | Count (Critical+High map) |
|--------|---------------------------|
| Initial Critical+High listed | 13 (SEC-001…013) |
| Confirmed Critical | 3 (+ SEC-010 as Critical **business**) |
| Confirmed High | ~7 (004, 008 latent, 009, 011, 013 + conditional 006/012) |
| Downgraded | 2 (005→Med, 007→Med) |
| Conditional | 2 (006, 012) |
| Not active BFLA | 1 (005) |

Full security catalog remains 33 findings in `SECURITY-AUDIT.md`; accuracy applies especially to Critical/High triage.

## Three proofs before Security Phase can close

1. Secrets fully rotated (SEC-001)  
2. KYC truly private (SEC-003)  
3. Booking engine safe under concurrent double-book (SEC-010)

## Next

**Booking Integrity Audit** (Hotel/Room/RoomType/Availability/Booking/Payment/Cancel/Refund) — research only.
