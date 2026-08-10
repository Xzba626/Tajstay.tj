# TajStay — Product Maturity Audit Charter

**Date:** 2026-08-10 (baseline)  
**Method:** Consolidate Security Audit + Full Technical Audit + maturity scan  
**Mode:** Evidence-based scores · **no “works in browser = ready”**  
**Living doc:** scores change only when findings are fixed and re-verified

---

## 1. How we audit (agreed framework)

| # | Direction | Status of this baseline |
|---|-----------|-------------------------|
| 1 | Security | **Deep** — `docs/audit/SECURITY-AUDIT.md` (SEC-001…033) |
| 2 | Backend / API | **Partial** — inventory 142 routes; Zod ~partial; races/idempotency sampled |
| 3 | Database | **Partial** — schema/indexes/migrations; no live EXPLAIN/backup drill |
| 4 | Frontend | **Partial** — page inventory; forms/a11y not fully walked |
| 5 | Business logic | **Partial** — booking/payment paths traced; no concurrency E2E |
| 6 | Owner / Admin | **Partial** — RBAC sampled; god-pages; cross-owner OK on sample |
| 7 | UX/UI | **Partial** — guest funnel redesigned (Verdant Peak); owner/admin UX debt |
| 8 | Performance | **Static smells only** — no Lighthouse/CWV lab run |
| 9 | SEO / Production | **Partial** — sitemap/robots/meta; no Search Console |
| 10 | QA / Testing | **Deep gap** — 0 product tests in `src` |

**Trace model (every finding):**  
`ID → component → scenario → repro steps → actual → expected → severity → root cause → impact → fix → verify`

**Severity legend (product audit):**

| Tag | Meaning |
|-----|---------|
| 🔴 Blocker | Unsafe / unethical to operate at scale |
| 🟠 Critical | Must fix before serious production traffic |
| 🟡 High | Substantial defect |
| 🔵 Medium | Important debt |
| ⚪ Low | Improvement |
| 🟢 OK | Checked, no issue found (this pass) |

---

## 2. Maturity Scorecard (baseline 2026-08-10)

| Area | Score | Confidence | Rationale (one line) |
|------|------:|:----------:|----------------------|
| Security | **3**/10 | High | 3× Critical open (secrets, public KYC Blob, Next/Auth advisories) + High auth/upload/race |
| Architecture | **5**/10 | High | Working monolith; dual auth; god dashboards; CSS sprawl |
| Backend | **6**/10 | Med | Rich REST + many ownership checks; fragmented status machine; partial Zod |
| Database | **6**/10 | High | 43 models, migrations, booking indexes; **no** overlap exclusion |
| Frontend | **5**/10 | Med | App Router guest flows OK; thin error surfaces; little RHF/Zod client |
| Business Logic | **5**/10 | Med | Server pricing OK; owner approve without proof; inventory TOCTOU |
| UX/UI | **5**/10 | Med | Guest home/search lightened; owner/admin still ops-heavy |
| Performance | **4**/10 | Med | Search over-fetch≤500 + slice; hotel over-include; few CWV proofs |
| SEO | **5**/10 | High | robots/sitemap/OG helper; static sitemap; no JSON-LD; weak hotel meta |
| Testing | **1**/10 | High | No `npm test`, 0 product tests under `src` |
| Production Readiness | **4**/10 | High | MVP demo possible; not hard enough for untrusted scale |
| **Overall** | **4.5**/10 | — | Weighted mental average; **not production-hardened** |

### Score meaning

| Band | Meaning |
|------|---------|
| 1–3 | Unsafe or incomplete for real users at scale |
| 4–5 | MVP / soft launch with known blockers |
| 6–7 | Operable with monitoring + backlog |
| 8–9 | Production-grade for current scope |
| 10 | Exemplary / audited continuously |

**Verdict:** TajStay is a **feature-rich MVP**, not yet a **production-ready scaled product**. Highest drag: **Security + Testing + inventory integrity**.

---

## 3. Inventory anchors (facts)

| Asset | Count |
|-------|------:|
| App pages | 50 |
| API route files | 142 |
| Prisma models | 43 |
| Components (`src/components`) | ~217 |
| Product tests in `src` | **0** |
| `npm audit` (prod) | 19 (4 critical, 6 high, 9 moderate) |

Prior reports:

- Security: `docs/audit/SECURITY-AUDIT.md` · root pointer `SECURITY-AUDIT.md`
- Technical: `docs/audit/TAJSTAY-FULL-TECHNICAL-AUDIT-2026-08-10.md`

---

## 4. Cross-map: Security findings → product severity

| ID | Product tag | Area |
|----|-------------|------|
| SEC-001 Secrets in `.env.example` | 🔴 Blocker | Security / Prod |
| SEC-002 Next/Auth Critical advisories | 🟠 Critical | Security / Supply chain |
| SEC-003 KYC on public Blob | 🔴 Blocker | Security / Privacy |
| SEC-004 Middleware role cookie | 🟡 High | Security / AuthZ |
| SEC-005 Admin API edge ungated | 🟡 High | Security / AuthZ |
| SEC-006 Telegram webhook optional | 🟠 Critical* | Security (*if secret unset in prod) |
| SEC-007 Weak booking codes | 🟡 High | Security / Business |
| SEC-008 Path traversal readPrivateFile | 🟡 High | Security / Files |
| SEC-009 MIME-only upload | 🟡 High | Security / Files |
| SEC-010 Booking TOCTOU | 🟠 Critical | Business / DB |
| SEC-011 Owner approve w/o proof | 🟡 High | Business / Payments |
| SEC-012 Docker/compose defaults | 🟡 High | Prod |
| … | see SECURITY-AUDIT | … |

🟢 **OK (sampled):** cross-owner hotel IDOR on owner APIs; guest cancel/payment `userId` bind; server-side online pricing; no Unsafe SQL / `dangerouslySetInnerHTML` in handlers.

---

## 5. Non-security baseline findings (other directions)

| ID | Sev | Area | Problem |
|----|-----|------|---------|
| ARCH-001 | 🟡 High | Architecture | Owner/Admin god-pages ~1605 / ~1477 LOC |
| ARCH-002 | 🔵 Medium | Architecture | Dual session (legacy + Auth.js) |
| ARCH-003 | 🔵 Medium | Architecture | ~23 overlapping CSS systems |
| BE-001 | 🔵 Medium | Backend | Zod not universal across 142 routes |
| BE-002 | 🟡 High | Backend | Booking status transitions not a single FSM |
| DB-001 | 🟠 Critical | Database | No exclusion/unique for room+date overlap |
| FE-001 | 🔵 Medium | Frontend | Almost no `react-hook-form` + Zod on client |
| FE-002 | 🔵 Medium | Frontend | Only root `error.tsx`; no `global-error` |
| BL-001 | 🟠 Critical | Business | Same as SEC-010 inventory race |
| BL-002 | 🟡 High | Business | Same as SEC-011 owner payment without proof |
| PERF-001 | 🟡 High | Performance | Search loads up to 500 hotels then slices |
| PERF-002 | 🔵 Medium | Performance | Hotel page over-includes rooms/types/photos |
| SEO-001 | 🔵 Medium | SEO | Sitemap static — no `/hotel/[id]` |
| SEO-002 | 🔵 Medium | SEO | No JSON-LD / Hotel schema |
| QA-001 | 🔴 Blocker | Testing | Zero product automated tests |
| UX-001 | 🔵 Medium | UX | Owner/Admin density vs guest Verdant Peak |

---

## 6. Phased plan (recommended)

### Phase A — Stop the bleeding (1–2 weeks)
1. SEC-001 rotate/scrub secrets  
2. SEC-003 private Blob for KYC  
3. SEC-006 fail-closed Telegram webhook  
4. SEC-002/013 dependency upgrades (Next + Auth)  
5. Smoke checklist: login Guest/Owner/Admin → book → pay proof → owner confirm  

**Exit:** no known 🔴 Blockers in secrets/PII storage.

### Phase B — Integrity & AuthZ (2–3 weeks)
1. DB exclusion or transactional lock (DB-001 / SEC-010)  
2. Middleware DB session (SEC-004/005)  
3. Payment policy (SEC-011)  
4. Upload magic bytes + path containment (SEC-008/009)  
5. First Vitest suite: authz IDOR + booking overlap  

**Exit:** Security ≥6, Business ≥6, Testing ≥3.

### Phase C — Scale & craft (ongoing)
1. Split god-pages; unify design tokens  
2. Search DB pagination; hotel select pruning  
3. Dynamic sitemap + JSON-LD  
4. Playwright happy-path E2E  
5. CWV lab on `/`, `/search`, `/hotel/[id]`, `/booking`  

**Exit:** Production Readiness ≥7 for soft national launch.

### Phase D — Re-score
Re-run this charter scorecard after each phase; never mark Closed without verify steps.

---

## 7. Runtime still PENDING

Not done in baseline (needs Node 18–20 + Postgres + seed):

- Browser E2E every role action  
- Concurrent double-book stress  
- Live privilege escalation with forged cookies  
- Lighthouse / CWV  
- Backup/restore drill  
- Production header scan (CSP, HSTS) on live domain  

---

## 8. Collaboration protocol

When sending the next chunk, use:

1. **Direction** (1–10)  
2. **Artifact** (log / screenshot / route / PR / Cursor report)  
3. **Claim** (“I think X is broken because…”)  

Response format back:

- Confirm / falsify with evidence  
- Assign ID + severity  
- Root cause  
- Next smallest verification step  

First deep pass already delivered for **#1 Security**. Next recommended deep pass: **#5 Business logic + #3 Database** (booking integrity), then **#10 Testing** bootstrap.
