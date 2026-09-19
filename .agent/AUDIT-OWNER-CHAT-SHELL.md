# BLOCK — Owner/Chat/Shell/Admin UX Normalization — AUDIT MAP

BASE: `f07525c` + Visual V1 dirty tree

## Calendar
`Owner ?section=calendar` → `page.tsx` + `OwnerCalendar.tsx`
→ `getOwnerCalendarData` (`ownerCalendar.ts`)
→ `Booking` + `RoomDateOverride` + `Room`/`RoomType`
Cell kinds TODAY: `available|blocked|customPrice|online|offline|onlinePending`
TARGET: `available|occupied|pending|blocked` (drop customPrice/offline as statuses)
Conflict: online create uses `includeActiveHolds:true`; **offline create DID NOT** → FIX

## Booking chat / payment
`/chat/booking/[id]` → chat APIs → `bookingChat.ts` / `paymentReviewActions.ts`
Timer: `expiresAt` server-side; extend +5m via `extendBookingPaymentWindowAdmin` (no max-count yet)
Archive: `findBookingsEligibleForChatArchive(15)` after checkout → TARGET **5**

## Pricing
`RoomType.basePrice` · `Room.price` denormalized · `RoomDateOverride.customPrice`
Need explicit override UX (Phase C)

## History
`/history` **blocks OWNER** with `tripsHub.ownerRedirect` → FIX: Owner sees own guest bookings

## Shell / Theme / Profile
Visual V1 partial: Owner fixed header/nav, theme toggle, login card (uncommitted)

## Admin / Recovery
Admin overview + notifications; recovery link flow exists (`sendPasswordResetLink`) — verify runtime in Phase J
