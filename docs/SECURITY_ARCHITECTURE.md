# Security Architecture — TajStay

**Status:** Baseline for Phase 0+  
**Companion:** P0 items in `TAJSTAY_STRATEGY.md`

---

## Threat model (summary)

| Threat | Asset | Mitigation |
|--------|-------|------------|
| KYC document leak | OwnerApplication files | Private blob + signed URLs; encrypt PII fields |
| Account takeover | User sessions | bcrypt passwords, session invalidation on password change |
| IDOR on bookings/chat | Booking, messages | `resolveHotelAccess`, booking-scoped checks |
| Double booking | Room inventory | ADR-0008 atomic create |
| Admin abuse | Owner PII | Document view audit log; admin-only decrypt |
| Scraping / abuse | Public search | Rate limits on auth and write endpoints |
| XSS | Chat, reviews | Sanitize/escape user content; CSP (harden over time) |

---

## OWASP Top 10 mapping (priority)

| Risk | TajStay relevance | Action |
|------|-------------------|--------|
| A01 Broken Access Control | High — multi-role | RBAC matrix below; audit owner/moderator paths |
| A02 Cryptographic Failures | High — KYC | Fix public blob (P0); TLS everywhere |
| A03 Injection | Medium | Prisma parameterized queries; validate with Zod |
| A04 Insecure Design | High | ADR-0008, single moderation flow |
| A05 Security Misconfiguration | Medium | Env secrets; disable debug `agentLog` in prod |
| A07 Identification failures | Medium | Rate limit login; lockout on OTP |
| A09 Logging failures | Medium | Sentry + AuthAuditLog; expand to booking events |

---

## RBAC matrix (simplified)

| Capability | GUEST | OWNER | MODERATOR | ADMIN |
|------------|:-----:|:-----:|:---------:|:-----:|
| Book / pay | ✓ | ✓ | | ✓ |
| Owner panel | | ✓ | | |
| Hotel-scoped ops | | ✓ | ✓ (assigned) | ✓ |
| Finances / payouts | | ✓ | | ✓ |
| Moderate hotels/apps | | | | ✓ |
| View KYC docs | | | | ✓ |
| System config | | | | ✓ |

Fine-grained: `lib/auth/permissions.ts`, `resolveHotelAccess()`.

---

## Secrets

| Secret | Purpose |
|--------|---------|
| `AUTH_SECRET` | Session signing |
| `OWNER_DATA_ENCRYPTION_KEY` | KYC field encryption |
| `CRON_SECRET` / `JOB_SECRET` | Background jobs |
| `DEMO_RESET_SECRET` | Non-prod only |
| `BLOB_READ_WRITE_TOKEN` | Media storage |

Rotation: documented runbook; `OWNER_DATA_ENCRYPTION_KEY` rotation requires re-encryption strategy.

---

## Encryption

- **At rest:** Owner application string fields — AES-256-GCM (`enc:v1:`)
- **In transit:** HTTPS (Vercel)
- **Passwords:** bcrypt

---

## Audit trail

| Event | Store |
|-------|-------|
| Auth actions | `AuthAuditLog` |
| Booking lifecycle | `TransactionLog` |
| KYC doc views | `OwnerApplicationDocumentViewLog` |

---

## Rate limiting

`lib/security/rateLimit.ts` — extend to booking create, file upload, admin doc download.

---

## PII classification

| Class | Examples | Handling |
|-------|----------|----------|
| **Critical** | Passport, property deeds | Encrypt + private storage + audit access |
| **Sensitive** | Phone, email, address | Encrypt in OwnerApplication; protect in API |
| **Internal** | Booking status, logs | RBAC |
| **Public** | Hotel name, approved listing | CDN OK |

Details: [`DATA_GOVERNANCE.md`](./DATA_GOVERNANCE.md)
