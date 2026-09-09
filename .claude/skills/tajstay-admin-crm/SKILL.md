---
name: tajstay-admin-crm
description: TajStay Admin Workspace — users, hotel moderation, complaints/case management, admin finance, CMS, audit log, action queues. Use for any task inside the Admin CRM shell.
---

# TajStay Admin CRM

Admin Workspace nav: **Обзор · Заявки · Пользователи · Бронирования · Ещё** (sidebar on desktop, bottom nav on
mobile). Separate shell from Public/Consumer/Owner — no consumer tabs, no public marketing nav
(`Главная / Поиск / О сервисе`), no consumer hotel assistant inside Admin. All Admin chrome/statuses/filters/
errors are Russian; user/hotel free text may stay in its source language.

## Rules

- Every backend enum/status/risk-reason/payment method must pass through an i18n/presentation map before
  reaching the UI — never show raw values (`PENDING`, `MEDIUM`, `CAPTURED`, `needs moderation`, …).
- Hotel moderation is detail-first (photos, map, owner, history, risk reasons) → Approve / Request info /
  Reject(+reason). A risk score is a moderator signal, not an auto-reject rule.
- Complaints are case management, not a flat list: list = compact summary, detail requires complaint ID,
  reporter, target, booking, category, created, status, priority, assignee, attachments, resolution history.
  Closing requires reason + who + when — a bare "РЕШЕНО" status is not sufficient.
- Role change / user blocking / hotel moderation require confirm + reason and must write to `AdminAuditLog`
  (this is also `tajstay-security` territory).
- CMS content: Draft → Preview (desktop + mobile) → Publish; validate CTA URLs (https/internal only, block
  `javascript:` and open-redirect abuse).
- Admin Overview KPI breakdowns must cover 100% of the sample (no silent remainder); keep "Требует внимания"
  evolving into real action queues with deep links, not a static widget.

## Read next

- `.cursor/rules/tajstay-shells-architecture.mdc` — full P0/P1 detail: Admin Overview, moderation, CMS,
  finance, complaints, localization mapping
- `tajstay-security` — before touching role/permission changes, credentials, or Owner Access from Admin
- `tajstay-browser-qa` — walk the flow as an admin at both viewports before marking PASS
