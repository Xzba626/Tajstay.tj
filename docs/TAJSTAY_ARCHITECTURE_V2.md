# TajStay — Architecture Reset & Full Product Implementation Master (V2)

> Binding product-architecture authority. Continues the existing TajStay codebase — this is not a
> rewrite-from-scratch instruction. Where this document conflicts with older product decisions
> already in the code, this document (V2) wins **within the scope of whatever block is currently
> authorized in `.agent/STATE.md`**. It does not itself authorize touching the protected domains
> listed in `CLAUDE.md` (production DB, auth/authz core, booking engine invariants, payment capture,
> security-critical secrets) — those still require explicit user approval per block.

## 0. Это не новый проект

Продолжай существующий TajStay. Не начинай с нуля. Не уничтожай текущий working tree. Не откатывай
хорошие изменения. Не восстанавливай старую архитектуру просто потому, что она уже существует в коде.
Новая спецификация ниже имеет приоритет над устаревшими продуктовыми решениями, если они конфликтуют.

## 1. Целевой продукт

TajStay — не просто сайт бронирования. Единая платформа:

```text
TajStay
│
├── Public Travel Marketplace
│   ├── Home
│   ├── Search
│   ├── Hotels
│   ├── Hotel Details
│   ├── Tours
│   └── Public Content
│
├── Consumer Web App / PWA
│   ├── Search
│   ├── Bookings
│   ├── Trips
│   ├── Favorites
│   ├── Notifications
│   ├── Profile
│   ├── Reviews
│   └── TajStay Assistant
│
├── Owner Hotel Desk / CRM
│   ├── Overview
│   ├── Hotels
│   ├── Rooms
│   ├── Calendar
│   ├── Bookings
│   ├── Guests
│   ├── Check-in / Check-out
│   ├── Payments
│   ├── Receipts
│   ├── Documents
│   ├── Finance
│   ├── Analytics
│   ├── Reviews
│   ├── Messages
│   ├── Staff
│   └── Settings
│
└── Admin CRM
    ├── Dashboard
    ├── Applications
    ├── Hotels
    ├── Users
    ├── Bookings
    ├── Complaints
    ├── Finance
    ├── Content
    ├── Notifications
    ├── Owner Access
    ├── Audit Log
    └── Settings
```

## 2. Основной UX-принцип

TajStay должен ощущаться как дорогой коммерческий продукт, а не как старый CRM, дешёвый marketplace,
generic SaaS template, mobile-версия desktop сайта, или набор разрозненных страниц.

Каждый screen: логически простой, визуально чистый, быстрый, понятный без инструкции, аккуратный,
responsive, современный, консистентный.

## 3. Desktop и Mobile — два разных UX-режима

**Mobile**: не сжимать desktop. Bottom navigation, bottom sheets, full-width cards, sticky/fixed
primary actions, compact flows, крупные touch targets, минимум таблиц, понятные sequential screens.

**Desktop**: sidebar, tables, charts, split views, filters, multi-column layout, richer detail panels.

**Tablet**: промежуточный compact-mode.

## 4. Визуальная система — binding

Один единственный фирменный зелёный: `#0F7A4D` (TajStay Green). Не использовать несколько
brand-green shades. Запрещены как альтернативные brand colors: mint, pale green, dark emerald, teal,
random Tailwind emerald, transparent green, green gradient, green mixed with white/black.

## 5. White canvas

Основной page background: `#FFFFFF`. Белый — пространство. Зелёный — функция/действие/бренд.
Не делать green background + green cards + green inputs + green buttons одновременно.

## 6. Когда использовать green

Primary buttons, search container, active navigation, selected states, important action blocks,
focus, main interactive icons, key controls, success/positive data где семантически корректно.

## 7. Ordinary surfaces

Обычные cards/tables/panels/CRM workspace/profile/settings/content sections — обычно `white`, с
тёмным текстом, neutral border, аккуратной shadow, green icon/accent.

## 8. Input design

Белый input на белой странице не должен исчезать: white background, dark text, visible neutral
border, clear label, optional very subtle neutral shadow. Focus: `border/ring = #0F7A4D`. Не делать
input mint/green ради видимости.

## 9. Search — главная функция

Public Home и Consumer Search — один design language. Search container `#0F7A4D`, inputs white,
text dark. Main CTA: white button + green text внутри green container, либо green primary вне green
surface — выбрать одну систему и использовать consistently.

## 10. Home hero

Удалить текущий 3D/abstract/network/globe эффект и его glow/haze/overlay/gradient/pseudo-elements.
Пока — clean premium white hero. Новый travel-specific hero visual — отдельная задача.

## 11. Buttons

Primary: `background: #0F7A4D`, `text: white`. Не менять green shade при hover. Hover:
`translateY(-1px)` + subtle neutral shadow. Press: `scale(0.98)`. Loading — только при реальном
запросе, с текстом ("Сохраняем…", "Проверяем…", "Загружаем…", "Подтверждаем…") + spinner. Без
искусственной задержки.

## 12. Iconography

Единая icon system. Не смешивать emoji/random SVG/Material/FontAwesome/text symbols без системы.
Одинаковая stroke philosophy, визуальный вес, размер, понятный semantic use.

## 13. Animation

Короткие, функциональные, не мультяшные, не отвлекающие. Для press/drawer/modal/bottom
sheet/loading/expanding sections/navigation transition. Уважать `prefers-reduced-motion`.

## 14. Public marketplace — Home

Сильный search-first hero, популярные направления, featured hotels, tours, trust section, owner
CTA, хороший footer. Удалить legacy fake/random AI.

## 15. Hotel search

Mobile: 1 колонка, full-width hotel card, large photo, name, city, rating, price, favorite,
availability. Desktop: grid/list, optional map split view, filters, sorting.

## 16. Hotel detail

Real gallery, name, verified guest rating, classification if available, address/map, amenities,
rooms, availability, reviews, booking CTA, policies. Не использовать TajStay logo вместо hotel image
если real image существует.

## 17. Reviews — новая архитектура

Review разрешён только после завершённого stay: `booking completed AND checkedOutAt exists`.
Оценки: overall, cleanliness, service, comfort, location, value, comment, optional photos.

## 18. Verified review

Публичный отзыв должен иметь пометку "Подтверждённое проживание", связан с booking/stay.

## 19. Hotel star classification и rating — разные вещи

Не смешивать. Пример: `★★★★` — классификация гостиницы; `⭐ 4.7/5` — рейтинг гостей TajStay, 286
отзывов. Отзывы не меняют официальную звёздность.

## 20. Reputation level

Отдельная сущность `TajStay Reputation Level` — может учитывать rating, verified review count,
completed stays, complaint ratio, cancellation quality, recent performance. Не простое правило
"100 отзывов = новая звезда".

## 21. Owner Hotel Desk — основной новый продукт

Не просто dashboard — полноценная Hotel CRM. Владелец за секунды понимает, что происходит в
гостинице.

## 22. Owner Overview

Сегодня: arrivals, departures, occupied rooms, available rooms, bookings, unpaid, messages.
Finance: today revenue, 30-day revenue, pending payment, TajStay commission, refunds.
Requires Attention: unpaid booking, complaint, late check-in, missing room data, pricing issue.

## 23. Rooms

Room Category: name, capacity, amenities, photos, base price. Room: number/name, category, status,
availability.

## 24. Calendar

Desktop: dates × rooms/categories. Mobile: simplified timeline/calendar cards.

## 25. Bookings

Desktop table columns: Booking, Guest, Room, Check-in, Check-out, Status, Payment, Amount, Actions.
Filters: Today, Tomorrow, Check-in, Check-out, Unpaid, Completed, Cancelled. Search: guest, phone,
booking ID, room.

## 26. Booking detail

Central operational screen. Sections: Guest (name, surname, phone); Stay (room, category, guests,
planned/actual check-in, planned/actual check-out); Payment (total, paid, outstanding, method);
Communication (booking chat); Documents (stay card, receipt, identity data if permission exists);
History (audit timeline).

## 27. Guest data model

Structured, not one PDF. Entities: `Guest`, `Booking`, `Stay`, `IdentityDocument`, `Payment`,
`Receipt`, `AuditLog`.

## 28. Check-in / check-out

Хранить отдельно: `plannedCheckIn`, `checkedInAt`, `plannedCheckOut`, `checkedOutAt`. Секунды
хранить; показывать в UI только где реально нужно.

## 29. Identity documents

Sensitive. Не хранить как public upload: private storage, no public URL, authorization, tenant
isolation, audit access, retention, minimal access, no analytics usage.

## 30. Hotel staff

Будущее: Owner/Manager/Reception/Finance roles с granular permissions. Не `OWNER = полный доступ
навсегда`.

## 31. Tenant isolation

Hotel A не должен видеть Hotel B. Каждый resource проверяется server-side по hotel scope.
Object-level authorization.

## 32. Document input

Upload, drag-drop, paste, camera/mobile capture — только в protected document flow.

## 33. Print / PDF

Stay: Print, Save PDF. Receipt: Print, Save PDF, Share if safe. Print layout без
navigation/sidebar/CRM controls.

## 34. Receipt

После подтверждения оплаты создаётся immutable Payment. Receipt хранит snapshot; при изменении
имени/адреса/отеля старый receipt не переписывается.

## 35. Payment

Fields: `id, bookingId, amount, currency, method, status, confirmedBy, confirmedAt`.

## 36. Financial correction

Не редактировать paid transaction молча — refund/void/correction, каждое действие в Audit Log.

## 37. Commission

Хранить: `roomAmount, discountAmount, taxAmount, serviceFee, hotelCommission, totalAmount,
ownerNetAmount, platformRevenue`. Не одно поле `price` для всей финансовой модели.

## 38. Chat privacy

Обычный chat: `Guest ↔ Hotel`. Admin не сидит там постоянно.

## 39. Complaint

Guest/Hotel создаёт `ComplaintCase` — только тогда authorized Admin/Support получает scoped access к
conversation.

## 40. Admin chat access

Не unrestricted chat browsing. Complaint-related access фиксируется: admin, case, reason, timestamp.

## 41. Admin CRM

Отдельный workspace. Не Public navbar, не Consumer assistant. White/light workspace, green
actions/active states.

## 42. Admin dashboard

Что происходит? Что требует внимания? KPI + queues.

## 43. Applications

Owner application: property, applicant, map, photos, contact, risk, status. Actions: Approve,
Request Info, Contact, Additional Review, Reject with Reason.

## 44. Owner onboarding

Не тяжёлый KYC первым экраном. Сначала: account, verified contact, property, address, map, photos,
contact, description.

## 45. Progressive verification

Stronger verification только когда нужно: high-risk case, ownership dispute, finance, payout, legal
requirement, suspicious behavior.

## 46. Security

До реальных sensitive data обязательно закрыть: secret-word, recovery, AdminAuditLog, token
exposure, RBAC, credential changes, session invalidation, tenant isolation.

## 47. Auth design

White canvas, green primary. No dark/mint separate theme.

## 48. Profile

White/light. Green icons/actions. No mint cards.

## 49. Settings

Simple grouped structure, не giant accordion.

## 50. Mobile nav

Consumer: Home, Search, Tours, Bookings/Trips, Profile. Owner/Admin имеют свои navigation models.

## 51. Responsive matrix

Проверить: 360, 390, 412, 768, 1024, 1280, 1440+.

## 52. Mobile QA

Проверять: bottom nav, long scroll, drawer, modal, keyboard, safe area, assistant, cards, forms,
loading.

## 53. Desktop QA

Проверять: sidebar, header, table density, charts, whitespace, full-width usage, hover, keyboard,
modal, detail pages.

## 54. Performance

Без искусственных задержек. Caching, prefetch, optimistic UI where safe, lazy loading, code
splitting, image optimization, skeleton only when real load exists.

## 55. Error states

Никаких blank screens. Для data screens: loading, data, empty, error, unauthorized, offline.

## 56. Technical UI

Не показывать пользователю: PENDING, CAPTURED, MEDIUM, internal IDs без необходимости, raw backend
errors, stack trace, English technical labels. Admin UI — русский. Consumer — корректно
локализованный TajStay.

## 57. Legacy cleanup

Найти и удалить/заменить: old green palette, fake AI, random budget, random recommendation,
duplicate brand avatar, obsolete route UI, unused decorative components, dead CSS, inconsistent
components.

## 58. Не переписывать хорошее

Если компонент уже соответствует UX/visual system/architecture/security — оставить.

## 59. Implementation approach

Не делать «всё сразу одним diff». Работать логическими блоками. Не ждать подтверждения после каждой
мелочи. Останавливаться только при: destructive production action; реально недостающем credential;
опасной DB migration; неоднозначном бизнес-решении.

> Note: this is qualified by `CLAUDE.md`'s hard stops — only the block explicitly authorized in
> `.agent/STATE.md` is worked at a time; protected domains still require explicit approval per block.

## 60. Human-like browser QA

Логиниться, переходить, открывать, нажимать, проверять, исправлять, повторно проверять
самостоятельно (see `tajstay-browser-qa` skill). Не просить пользователя быть ручным QA.

## 61. Каждый блок проверяется как

```text
CODE
TEST
DEPLOYED
REAL RUNTIME
EVIDENCE
```

Build ≠ PASS. HTTP 200 ≠ visual PASS. Screenshot ≠ functional PASS. (See `CLAUDE.md` → Evidence
gates.)

## 62. Первый этап при старте новой сессии

1. прочитать текущий `CLAUDE.md`;
2. прочитать `.agent/STATE.md`;
3. прочитать relevant Skills;
4. прочитать current `git status`/`git diff`;
5. определить, что из новой архитектуры уже реализовано;
6. определить конфликтующие старые решения;
7. обновить STATE;
8. продолжить с самого высокого P0/P1 незакрытого блока.

Не перечитывать весь repository без необходимости.

## 63. Приоритет

Если security P0 всё ещё не доказан — закрыть security gate первым. Параллельно не разворачивать
sensitive passport/financial production flows. После этого, в порядке:

1. finish global visual consistency
2. Consumer/Public
3. Owner Hotel Desk foundation
4. Stay/Guest/Payments/Documents
5. Chat/Complaint
6. Reviews/Reputation
7. Admin completion
8. Responsive/performance/security final QA

## 64. Финальная цель

TajStay должен выглядеть и работать так, будто его делала одна сильная senior-команда: Product, UX,
UI, Frontend, Backend, Security, QA. Не должно ощущаться, что отдельные страницы создавались разными
ботами.
