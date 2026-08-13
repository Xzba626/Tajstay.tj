# Skill: Explore before build (TajStay)

Use at the **start of every stage** for History, Tours, Navigation, bookings, TST, or profile/favorites work.

## Iron rule

1. Do not treat current code as automatically correct.
2. Read existing implementation first; list what already covers the task.
3. Never add duplicate components, routes, Prisma models, APIs, or status enums.
4. Extend existing modules with the **minimal** diff.
5. If code and the **current task TZ** conflict, the TZ wins **only inside that task’s scope**.

## Canonical architecture

| Layer | Canonical entry |
|-------|-----------------|
| History page | `src/app/history/page.tsx` |
| History tabs | `src/lib/trips/classify.ts` |
| History card | `src/components/trips/HistoryRecordCard.tsx` |
| Booking detail | `src/app/chat/booking/[bookingId]/page.tsx` |
| Payment | `src/app/payment/[code]/page.tsx` |
| TST → History | `src/lib/ai/tstHistoryIntent.ts` |
| Tours placeholder | `src/app/tours/page.tsx` |
| Bottom nav | `src/constants/app-navigation.ts` |
| i18n | `src/lib/i18n/messages.ts` (`tripsHub`, `toursPage`, `bottomNav`) |

## History record shape (every entry)

- Booking status (tab classification)
- Payment status (badge, not a tab)
- Date / time (locale via `format.ts`)
- Object (hotel / room / tour)
- Available actions (Open → booking detail; Continue payment → `/payment/{code}` when allowed)

## Past vs COMPLETED

- **Past** — History tab by calendar (`checkOut` day has passed).
- **COMPLETED** — booking business status (badge / domain), not a History tab.
- Do not write `if (status === COMPLETED) return "past"`.

## Naming

- Product / project: **TajStay**
- Assistant: **TST Assistant** (helper inside TajStay, not a separate product)

## Anti-patterns (do not introduce)

- Second history store for TST Assistant or tours
- Reusing `HotelCard` for History list
- New payment UI / card capture inside TST Assistant
- Parallel status taxonomy beside `classify.ts`
- Equating `COMPLETED` with the Past tab
