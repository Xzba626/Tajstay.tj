# TajStay — Product Vision (5–10 years)

**Status:** Vision document — not a commitment to build everything listed.  
**Purpose:** Guide long-term architecture so Year 0–3 decisions do not block Year 4+ options.

---

## Mission

Стать основной цифровой платформой бронирования и управления размещением в Центральной Азии, объединяющей путешественников, владельцев объектов и партнёров в единую экосистему.

---

## What success looks like

| Horizon | Picture |
|---------|---------|
| **3 years** | Default way to book stays in Tajikistan; thousands of properties; reliable payments and owner tools |
| **5 years** | Multi-country Central Asia; partner APIs; mobile apps; automated payouts |
| **10 years** | Full travel marketplace — stays, experiences, packages; B2B corporate travel; regional brand |

---

## Strategic pillars

1. **Trust** — verified hosts, secure payments, transparent reviews  
2. **Supply** — lowest friction for owners to list and operate  
3. **Demand** — fastest path from intent to confirmed booking  
4. **Platform** — APIs and partners extend reach beyond direct traffic  

---

## Evolution path (not a backlog)

```text
Year 0–1   Foundation & TJ growth
           └── Core booking, owner PMS-lite, manual payments

Year 2     Regional
           └── Multi-currency, country #2, partner API beta, mobile

Year 3     Platform
           └── Payout automation, channel managers, optional service extract

Year 4+    Marketplace expansion (separate initiatives when justified)
           ├── Dynamic pricing at scale
           ├── ML recommendations
           ├── Corporate travel & B2B contracts
           ├── Experiences (Airbnb-like activities)
           ├── Flights & packages (partner-led, not core monolith)
           └── Ecosystem fund / super-app integrations
```

Each Year 4+ item requires its own business case and ADR. The monolith core remains **catalog + booking + payments + identity** until metrics prove extract.

---

## Architectural guardrails for the vision

| Future capability | Guardrail today |
|-------------------|-----------------|
| Multiple product types (hotel, experience, package) | `PropertyType` + polymorphic catalog interface in domain |
| Multi-country | `countryCode`, `timezone`, localized `SiteContent` |
| Multi-currency | `Money { amount, currency }` — never float |
| Partner API | v2 REST + idempotency keys + webhooks design |
| Mobile apps | Stateless API auth; no logic only in server components |
| ML / dynamic pricing | `AnalyticsEvent` + clean pricing rules interface |

---

## What we will not become (explicit non-goals for now)

- A generic global OTA competing with Booking.com on day one  
- A bank or licensed payment institution (integrate, don't own rails early)  
- A microservices maze before team and traffic justify it  

---

## How this connects to strategy

Operational execution: [`TAJSTAY_STRATEGY.md`](./TAJSTAY_STRATEGY.md)  
Architecture decisions: [`adr/`](./adr/README.md)
