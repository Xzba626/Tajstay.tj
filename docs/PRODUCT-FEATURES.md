# Product features (locale, geo, chat, reviews)

## Auto language

- **Middleware** (`src/middleware.ts`): on first visit, sets `tajstay_locale` and `tajstay_locale_auto` from `Accept-Language` (`tg`/`tj` → tg, `ru` → ru, else en) unless `tajstay_locale_manual=1`.
- **Banner** (`LocaleDetectBanner`): one-time confirm/change; sets `tajstay_locale_prompt_done` via `POST /api/locale`.
- **Manual override**: language switcher and profile set `tajstay_locale_manual`.

## Nearby hotels (geo)

- **IP city**: `getCityFromRequestHeaders()` → ip-api.com (TJ only), cached 1h.
- **Home & search**: hotels in the detected city are sorted first when no explicit city filter.
- **GPS (search)**: “Closer to me” adds `lat`/`lng` to `/api/search`; results sorted by Haversine distance.

## In-chat actions

- **Booking room** (`BookingChatPanel` + `ChatComposeActions`): payment link, dispute (bottom sheet), guest checkout confirm, cancel.
- **Dispute**: `POST /api/disputes` adds a system chat message and notifies admins/owner/guest.
- **Checkout**: `POST /api/bookings/[id]/confirm-checkout` → `COMPLETED` + review notification.

## Reviews

- **Eligibility**: paid stay, check-out in the past, status `CONFIRMED` or `COMPLETED`, one review per booking.
- **Form**: five criteria (1–5 stars) + optional text; average stored in `Review.rating`, breakdown embedded in `comment`.
- **Cron**: `booking-reminders` still sends `REVIEW_AVAILABLE` for completed stays.
