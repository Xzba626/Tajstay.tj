# TajStay Secure Vault — Future Architecture (Not Implemented)

**Status:** Architecture note only — Phase 2 explicitly defers implementation.

## Problem

TajStay Cloud should hold **operational booking metadata** (IDs, dates, amounts, statuses, audit actors). Sensitive identity documents (passport scans, registration forms) must **not** be stored in the central cloud database without a dedicated security review.

## Model

```
┌─────────────────────┐         ┌──────────────────────────┐
│   TajStay Cloud     │         │   Hotel Local Vault      │
│   (SaaS platform)   │◄─sync──►│   (on-prem / hotel PC)   │
├─────────────────────┤  meta   ├──────────────────────────┤
│ Booking metadata    │         │ Passport / ID documents  │
│ Guest name (ops)    │         │ Encrypted at rest        │
│ Payment state       │         │ Local keys (hotel-owned) │
│ Audit trail refs    │         │ Print / export templates │
└─────────────────────┘         └──────────────────────────┘
```

## Principles

1. **Data minimization in cloud** — no `passportPhoto`, `passportScan`, or raw identity files in central DB.
2. **Hotel-owned keys** — encryption keys remain with the property; TajStay cannot decrypt vault contents without hotel authorization.
3. **Operational linkage** — cloud stores opaque references (e.g. `localDocumentRef`) when a hotel opts in, not document bytes.
4. **Audit everywhere** — who viewed, exported, printed, or deleted a document; timestamps; actor role.
5. **No forced rollout** — vault is optional until TajStay has sufficient hotel adoption and legal/process readiness.

## Local Vault Components (Future)

| Component | Purpose |
|-----------|---------|
| Local application | Desktop app at front desk / owner office |
| Encrypted store | AES-256 (or OS keychain-backed) local database |
| Removable media | Optional encrypted USB backup |
| Backup / restore | Hotel-controlled; TajStay provides procedure docs only |
| Print / export | Templates default to **Tajik official forms** (future i18n) |
| Secure deletion | Crypto-shred + audit log entry |

## Threat Considerations

- Stolen laptop → full-disk encryption + vault passphrase
- Cloud breach → no passport blobs in cloud
- Insider at hotel → role-based vault access + audit
- Lost USB → encryption + optional PIN
- TajStay support access → no silent remote read of vault contents

## Integration with TajStay (Future)

- Manager / owner UI may show “document on file at hotel” without displaying scan in cloud UI.
- Check-in flow references local vault lookup by booking ID.
- Sync is **pull/push of metadata only**, not document payloads.

## Explicit Non-Goals (Phase 2)

- No passport upload fields in central schema
- No mandatory vault install during owner onboarding
- No passport printing implementation
- No blocking TajStay operations when vault is absent

## Next Steps (When Product Ready)

1. Legal review (TJ hospitality / migration registration requirements)
2. Threat modeling workshop with hotel pilot
3. PoC local app + encrypted SQLite
4. API contract for opaque refs only
5. Gradual opt-in pilot with one property

---

*Document version: Phase 2 — 2026-08-30*
