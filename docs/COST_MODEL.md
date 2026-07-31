# Cost Model — TajStay (directional)

**Status:** Estimates for planning — update with real invoices quarterly  
**Not** financial projections; use for unit economics sanity checks.

---

## Fixed monthly (typical early stage)

| Item | Driver | Notes |
|------|--------|-------|
| Vercel | Pro + bandwidth | Scales with traffic |
| Neon PostgreSQL | Storage + compute | Pooler for serverless |
| Vercel Blob | Storage + egress | **Largest variable** if images unoptimized |
| Sentry | Events/month | Free tier → Team |
| Uptime monitor | Checks | Low |
| Domain / email | Resend | Per email volume |

---

## Variable per transaction

| Item | When | Estimate approach |
|------|------|-------------------|
| SMS / Firebase OTP | Registration, login | Per message |
| Push | Notifications | Usually negligible |
| Blob egress | Image views | Compress + CDN |
| Support time | Per dispute | Ops hours / booking |

---

## Target unit metrics (when analytics live)

| Metric | Formula |
|--------|---------|
| **Cost per booking** | (monthly infra + ops) / CBM |
| **Cost per published owner** | acquisition + onboarding support / new owners |
| **Gross margin per booking** | commission − variable cost |
| **Infra % of GMV** | total infra / GMV — alert if >5% |

---

## Cost controls (engineering)

- Client image compression (already in owner onboarding)
- Server-side resize (sharp) — Phase 1+
- Search pagination — avoid loading 500 hotels × rooms
- AnalyticsEvent retention 90 days
- Blob lifecycle for orphaned uploads

---

## Review

Update after Phase 0 (Sentry) and Phase 1 (analytics volume). Link to business metrics in `TAJSTAY_STRATEGY.md` §5.
