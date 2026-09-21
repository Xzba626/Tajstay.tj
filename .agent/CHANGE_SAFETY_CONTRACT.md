# TAJSTAY — MANDATORY CHANGE SAFETY CONTRACT

Standing project rule (adopted 2026-09-21). Applies to every change, every BLOCK.

**Principle: fixing one function ≠ finishing the task.**

A change is done only when there is proof of all five:
1. The new or fixed function works.
2. Related existing functions have not regressed.
3. The production architecture is still compatible.
4. Existing security has not been weakened.
5. Existing data and the DB schema are not damaged.

## Before change
Before changing an existing file, service or model:
1. Find all callers.
2. Find every route, service and job that uses the domain logic being changed.
3. Identify the existing tests.
4. Identify neighbouring user flows the change could affect.
5. Record a BASELINE: what worked before the change.

Do not change a shared domain service until its impact surface has been investigated.

## Change classification
Classify every change as one of: LOCAL · SHARED · CROSS-DOMAIN · DATABASE · AUTH/SECURITY · PRODUCTION-INFRASTRUCTURE.
For SHARED, CROSS-DOMAIN, DATABASE or AUTH changes, a targeted test of the new function is not enough. A regression test of the related existing flows is mandatory.

## Preserve working behavior
If an existing function already works, don't rewrite it without need. Prefer a minimal additive change.
Never do any of the following for the sake of a new function:
- replace the existing architecture without need
- change the public contract of existing routes
- change status semantics
- change auth or session behavior
- change unrelated UI or unrelated DB fields
- delete existing logic
- "simplify" existing security checks

## Booking domain regression contract
Any change to the Booking domain must check, at minimum:
ONLINE BOOKING CREATE · OWNER MANUAL BOOKING · MANAGER MANUAL BOOKING · AVAILABILITY/OVERLAP · CAPACITY ·
PRICE CALCULATION · OWNER BOOKING LIST · BOOKING DETAILS · CONFIRM · REJECT · CANCEL · STATUS TRANSITIONS ·
PAYMENT-RELATED BOOKING STATE · NOTIFICATIONS · BOOKING CHAT ACCESS · LOCAL VAULT DELIVERY.
Not every item has to change, but every potentially affected item must be checked or explicitly marked NOT PROVEN.

## Chat regression contract
Any change to Booking, Auth or Chat must verify:
- The guest can open an allowed booking chat, and the owner can open the same chat.
- An unauthorized user cannot open it, and no other hotel or user gets access.
- Existing messages load. A new message is saved, and the recipient receives or sees it.
- Reconnect or resync does not lose durable messages.
- A booking status change does not break chat authorization without an explicit business reason.

## No "test pass = product pass"
Always keep these levels separate: CODE · UNIT TEST · INTEGRATION TEST · HTTP RUNTIME · DATABASE ·
AUTHENTICATED RUNTIME · PRODUCTION · USER VISUAL.
Never promote a status to a higher level:
- build PASS ≠ runtime PASS
- integration PASS ≠ authenticated HTTP PASS
- local PASS ≠ production PASS

## Production is the final target
The local environment is for safe development. Final acceptance is:
deployed production revision → production DB/migration health → production HTTP → authenticated real flow →
client/Local Vault → real user scenario.
After every deployment, check the production revision/SHA. A task is never finally closed on localhost alone.

## Regression before deploy
Before a production deployment, build an affected-flow matrix: BEFORE · AFTER · TEST · RUNTIME · STATUS.
If a previously working critical flow fails after the change, the new function is not done. Fix the regression first.

## No fix-by-breaking
If fixing A breaks B, don't choose between them. Find the root cause and make both A and B pass.
Never accept a regression as the price of a fix unless the user has explicitly changed the product requirement.

## Do not expand scope
A regression caused by the current change is part of the current task and must be fixed.
An old, unrelated problem gets recorded separately and is not mixed into the current BLOCK.

## Final report (every BLOCK)
NEW FUNCTION · REGRESSION MATRIX · SECURITY · DATABASE · HTTP RUNTIME · PRODUCTION · USER VISUAL ·
KNOWN PRE-EXISTING ISSUES · NEWLY INTRODUCED ISSUES.

Mandatory question: "Which previously working flows could this diff affect, and what evidence proves they still work?"
Without evidence, the answer is NOT PROVEN. Never answer with an assumption.

## Absolute rule
Never optimize a task only for the current test. The goal is to keep TajStay whole as a product:
an improvement counts only if it adds the required behavior without breaking existing behavior.
