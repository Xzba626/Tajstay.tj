---
name: tajstay-owner-crm
description: TajStay Owner Workspace — hotels, rooms, bookings, stay/check-in/out, owner finance/analytics, receipts, owner access & recovery. Use for any task inside the Owner CRM shell.
---

# TajStay Owner CRM

Owner Workspace nav: **Обзор · Отели · Номера · Брони · Аналитика · Ещё** (sidebar on desktop, bottom nav on
mobile). It is a separate shell from Public/Consumer/Admin — never show consumer tabs, the public marketing
footer, or the consumer hotel assistant inside it.

## Rules

- Explore before build: study the existing hotel/room/booking models before adding fields or flows — no
  parallel booking/status system (see `.cursor/rules/tajstay-explore-before-build.mdc`).
- Owner Access / credentials are `tajstay-security` territory — an admin or owner-facing flow must never let
  anyone set an owner's password directly; only trigger the hashed, short-lived, audited recovery flow.
- Finance: human-readable status/method labels (never raw enums), locale money formatting, anomaly flags for
  outlier amounts, an audit trail rather than free mutation of ledger rows.
- State matrix on every data view: loading / success+data / success+empty / 401/403 / 5xx / offline / partial —
  no blank white panel as a silent failure mode.

## Read next

- `.cursor/rules/tajstay-shells-architecture.mdc` — Owner Access (P0 SECURITY), Finance, state matrix, semantic
  color tokens
- `tajstay-security` — before touching owner credentials/recovery/phone/email
- `tajstay-browser-qa` — walk the flow as an owner at both viewports before marking PASS
