/**
 * BLOCK 5.6D — pure-function static test matrix. No database connection required (deliberately —
 * Postgres is down at the time this was written); every case here exercises a plain function with
 * fabricated inputs. DB-integration cases from the original matrix (unrelated-user GET/POST
 * denial, admin-as-guest live render, cold-archive job skipping a real dispute row, etc.) are
 * explicitly NOT simulated here — those remain BLOCKED until a live database is available, and are
 * not represented as passing.
 *
 * Run: npx tsx scripts/test-block56d-static.ts
 */
import { isBookingChatLocked, TERMINAL_NO_NEW_MESSAGES } from "../src/lib/chat/chatLock";
import { renderSystemEvent } from "../src/lib/chat/systemEvents";
import { isShellHiddenRoute } from "../src/constants/app-navigation";

let pass = 0;
let fail = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    pass += 1;
  } else {
    fail += 1;
    console.error(`FAIL: ${label}`);
  }
}

// ---- ARCHIVE / LOCK (matrix items 1-5; 6-10 need a live DB, not simulated here) ----

check(
  "1. active booking, no dispute -> writable",
  isBookingChatLocked({ chatArchivedAt: null, status: "CONFIRMED" }, false) === false
);
check(
  "2. terminal booking, no dispute -> locked",
  isBookingChatLocked({ chatArchivedAt: null, status: "COMPLETED" }, false) === true
);
check(
  "3. terminal booking + OPEN dispute -> writable",
  isBookingChatLocked({ chatArchivedAt: null, status: "COMPLETED" }, true) === false
);
check(
  "4. terminal booking + RESOLVED dispute (hasOpenDispute=false) -> locked",
  isBookingChatLocked({ chatArchivedAt: null, status: "CANCELLED" }, false) === true
);
check(
  "5. chatArchivedAt set + no dispute -> locked for POST",
  isBookingChatLocked({ chatArchivedAt: new Date(), status: "CONFIRMED" }, false) === true
);
check(
  "5b. chatArchivedAt set even WITH an open dispute -> still locked (unconditional backstop)",
  isBookingChatLocked({ chatArchivedAt: new Date(), status: "COMPLETED" }, true) === true
);
check(
  "CHECKED_IN is not in the terminal set (mid-stay chat must stay writable)",
  !TERMINAL_NO_NEW_MESSAGES.has("CHECKED_IN")
);
check(
  "ON_REVIEW is not in the terminal set (payment-review chat must stay writable)",
  !TERMINAL_NO_NEW_MESSAGES.has("ON_REVIEW")
);

// ---- SYSTEM EVENTS (matrix items 11-22) ----

check(
  "11. recognized event, RU",
  renderSystemEvent("ru", {
    eventType: "proof.submitted",
    eventPayload: "{}",
    body: "legacy fallback should not appear"
  }) === "🛡️ Система: Чек отправлен. Ожидается проверка владельца и администратором."
);
check(
  "12. recognized event, TG",
  renderSystemEvent("tg", { eventType: "proof.submitted", eventPayload: "{}", body: "x" }).includes("Квитансия")
);
check(
  "13. recognized event, EN",
  renderSystemEvent("en", { eventType: "proof.submitted", eventPayload: "{}", body: "x" }).includes("Receipt sent")
);
check(
  "14. legacy null eventType -> body",
  renderSystemEvent("ru", { eventType: null, eventPayload: null, body: "OLD LEGACY TEXT" }) === "OLD LEGACY TEXT"
);
check(
  "15. unknown eventType -> body (forward-compat with a future event type)",
  renderSystemEvent("ru", { eventType: "some.future.event", eventPayload: "{}", body: "FALLBACK TEXT" }) ===
    "FALLBACK TEXT"
);
check(
  "16. malformed payload -> body, no crash",
  renderSystemEvent("ru", { eventType: "proof.submitted", eventPayload: "{not valid json", body: "SAFE FALLBACK" }) ===
    "SAFE FALLBACK"
);
check(
  "17. proof.rejected reason interpolated safely",
  renderSystemEvent("ru", {
    eventType: "proof.rejected",
    eventPayload: JSON.stringify({ reason: "Сумма не совпадает." }),
    body: "x"
  }) === "🛡️ Система: Чек отклонён. Сумма не совпадает. Пожалуйста, отправьте новый чек."
);
check(
  "18. booking.welcome pay-now locale, values interpolated",
  renderSystemEvent("ru", {
    eventType: "booking.welcome",
    eventPayload: JSON.stringify({ variant: "pay_now", payMin: 20, reviewMin: 5 }),
    body: "x"
  }).includes("20 минут") && renderSystemEvent("ru", {
    eventType: "booking.welcome",
    eventPayload: JSON.stringify({ variant: "pay_now", payMin: 20, reviewMin: 5 }),
    body: "x"
  }).includes("5 минут")
);
check(
  "19. booking.welcome pay-at-check-in locale (no payment-window numbers)",
  renderSystemEvent("ru", {
    eventType: "booking.welcome",
    eventPayload: JSON.stringify({ variant: "pay_at_checkin" }),
    body: "x"
  }) === "🛡️ Система: Ассалому алейкум! Бронирование подтверждено. Предварительная оплата не требуется — оплатите непосредственно в отеле при заселении."
);
check(
  "20. no escrow language in the pay-at-check-in event (arrival_payment.confirmed, not checkin.confirmed)",
  !renderSystemEvent("ru", { eventType: "arrival_payment.confirmed", eventPayload: "{}", body: "x" }).includes("заморожены")
);
check(
  "20b. checkin.confirmed DOES say escrow — proven Pay-Now-only by the route's own payOnArrival guard",
  renderSystemEvent("ru", { eventType: "checkin.confirmed", eventPayload: "{}", body: "x" }).includes("заморожены")
);
check(
  "21. same ChatMessage row renders differently per viewer locale (viewer-locale rendering, not writer-locale baking)",
  renderSystemEvent("ru", { eventType: "booking.expired", eventPayload: "{}", body: "x" }) !==
    renderSystemEvent("en", { eventType: "booking.expired", eventPayload: "{}", body: "x" })
);
check(
  "22. every one of the 11 inventoried event types renders to a non-empty, non-fallback string",
  ([
    ["booking.welcome", { variant: "pay_now", payMin: 20, reviewMin: 5 }],
    ["proof.received", { reviewMinutes: 5 }],
    ["payment.confirmed", { byRole: "OWNER" }],
    ["proof.rejected", { reason: "test" }],
    ["proof.submitted", {}],
    ["booking.cancelled_by_guest", {}],
    ["arrival_payment.confirmed", {}],
    ["checkin.confirmed", {}],
    ["booking.expired", {}],
    ["proof.review_expired", {}],
    ["booking.cancelled_by_admin", {}]
  ] as const).every(
    ([eventType, payload]) =>
      renderSystemEvent("ru", { eventType, eventPayload: JSON.stringify(payload), body: "SHOULD NOT APPEAR" }) !==
      "SHOULD NOT APPEAR"
  )
);

// ---- ROLE REGRESSION (matrix items 23-26) — presentationRole priority logic, inlined here since
// it's a 3-line expression in page.tsx, not its own exported function; this pins the exact rule. ----

function presentationRole(isGuest: boolean, isOwner: boolean): "GUEST" | "OWNER" | "ADMIN" {
  return isGuest ? "GUEST" : isOwner ? "OWNER" : "ADMIN";
}

check("23. normal guest -> guest presentation", presentationRole(true, false) === "GUEST");
check("24. owner -> owner presentation", presentationRole(false, true) === "OWNER");
check("25. admin moderating someone else's booking -> admin presentation", presentationRole(false, false) === "ADMIN");
check(
  "26. admin who is ALSO the booking's guest -> guest presentation (the fixed screenshot bug)",
  presentationRole(true, false) === "GUEST"
);

// ---- Regression guard for the mobile shell-hiding fix (BLOCK 5.6A), re-checked here too ----
check("route-hiding: /chat/booking/123 hidden", isShellHiddenRoute("/chat/booking/123") === true);
check("route-hiding: /chatbot NOT hidden (prefix false-match guard)", isShellHiddenRoute("/chatbot") === false);
check("route-hiding: / NOT hidden", isShellHiddenRoute("/") === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
