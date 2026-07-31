# Data Governance — TajStay

**Status:** Baseline — legal review required for TJ compliance  
**Owner:** CTO + Legal

---

## Personal data categories

| Category | Fields / artifacts | Legal sensitivity |
|----------|-------------------|-------------------|
| Identity | fullName, passport images, selfie | **High** |
| Contact | phone, email, telegramId | Medium |
| Financial | Payment proofs, payout details | High |
| Behavioral | AnalyticsEvent, device session | Medium |
| Operational | Bookings, chat messages | Medium (may contain PII in body) |

---

## Retention (proposed — confirm with counsel)

| Data | Retention | Deletion |
|------|-----------|----------|
| OwnerApplication (rejected) | 12 months | Auto-purge job |
| OwnerApplication (approved) | Life of account + 3 years | Anonymize on request |
| Booking records | 7 years (tax/disputes) | Anonymize guest PII where allowed |
| Chat messages | 2 years after checkout | Archive → delete |
| AnalyticsEvent | 90 days raw; aggregates permanent | Partition drop |
| AuthAuditLog | 1 year | Archive |
| DeviceSession | 90 days | Auto-purge |

---

## Access control

| Role | PII access |
|------|------------|
| Guest | Own profile, own bookings |
| Owner | Guest contact for **their** bookings only |
| Moderator | Scoped to assigned hotels |
| Admin | Full decrypt for moderation; **logged** for KYC docs |

Export: admin-only; logged; no bulk export without approval.

---

## Guest rights (GDPR-style readiness)

| Right | Implementation target |
|-------|----------------------|
| Access | Profile + data export (implement `/profile/data`) |
| Rectification | Profile edit flows |
| Erasure | Soft-delete user; retain bookings where legally required |
| Portability | JSON export Phase 2+ |

---

## Tajikistan law

- [ ] **Legal review required** for local data residency and hospitality licensing
- Store KYC in region-acceptable cloud (document provider choice in ADR when non-Neon)

---

## Audit logs

Mandatory for: KYC document view, admin credential reset, role changes, demo reset (non-prod).

---

## Demo / test data

`Reset Demo Data` must never run on production without board approval. Protected checkboxes: users, admins, system settings — see strategy doc.
