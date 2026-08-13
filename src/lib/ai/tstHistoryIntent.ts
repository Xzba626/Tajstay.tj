import type { TripsTab } from "@/lib/trips/classify";
import { tripsHubPath } from "@/lib/trips/urls";

/** TST Assistant routes into TajStay History — no separate assistant booking store. */
export type TstHistoryIntent = {
  kind: "history";
  tab: TripsTab;
  /** User asked specifically about unpaid bookings (still shown via History tabs). */
  unpaidOnly?: boolean;
};

const SHOW_VERBS =
  /(?:покаж|show|открой|open|перейди|go to|найди|find|список|list|что у меня|what do i have|where are my|где мои|куда|take me)/;

const BOOKING_REF =
  /(?:бронир|бронь|брони|booking|bookings|истори|history|поездк|trips|сафар|резерв|reservation|заказ|order|mehmon|меҳмон)/;

const MY_REF = /(?:^|\s)(?:мои|моя|моё|my|mine)(?:\s|$)/;

const CANCELLED = /(?:отмен|cancel|бекор|cancelled|canceled)/;
const PAST = /(?:прошл|past|гузашт|заверш|completed|после прожив|checked out|checkout passed)/;
const UNPAID =
  /(?:неоплач|не оплач|unpaid|пардохт нашуда|without payment|not paid|ожидает оплат|awaiting payment|payment pending)/;
const UPCOMING =
  /(?:предстоя|upcoming|будущ|активн|confirmed|подтверж|тасдиқ|live booking|current booking|next stay|скоро)/;
const UNCONFIRMED =
  /(?:неподтверж|unconfirmed|на проверке|pending|ожидает подтверж|awaiting confirm|on review|wait proof|waiting payment)/;

/** i18n key for the assistant message before opening History. */
export function historyIntentMessageKey(intent: TstHistoryIntent): string {
  if (intent.unpaidOnly) return "tstAssistant.history.navUnpaid";
  const map: Record<TripsTab, string> = {
    confirmed: "tstAssistant.history.navConfirmed",
    unconfirmed: "tstAssistant.history.navUnconfirmed",
    past: "tstAssistant.history.navPast",
    cancelled: "tstAssistant.history.navCancelled",
    all: "tstAssistant.history.navAll"
  };
  return map[intent.tab];
}

export function toHistoryHref(intent: TstHistoryIntent): string {
  return tripsHubPath(intent.tab);
}

/**
 * Detect when the user wants their booking History (not hotel search).
 * Maps natural language → History tab filters from TASK 2.
 */
export function parseHistoryIntent(raw: string): TstHistoryIntent | null {
  const text = raw.trim().toLowerCase();
  if (!text) return null;

  const hasShow = SHOW_VERBS.test(text);
  const hasBookingRef = BOOKING_REF.test(text);
  const hasMy = MY_REF.test(text);
  const isHistoryQuery = hasBookingRef || text.includes("история") || (hasMy && hasShow);

  const tabSignal =
    CANCELLED.test(text) || PAST.test(text) || UNPAID.test(text) || UPCOMING.test(text) || UNCONFIRMED.test(text);

  if (!isHistoryQuery && !(hasShow && tabSignal)) return null;

  if (CANCELLED.test(text)) return { kind: "history", tab: "cancelled" };
  if (PAST.test(text)) return { kind: "history", tab: "past" };
  if (UNPAID.test(text)) return { kind: "history", tab: "unconfirmed", unpaidOnly: true };
  if (UNCONFIRMED.test(text)) return { kind: "history", tab: "unconfirmed" };
  if (UPCOMING.test(text)) return { kind: "history", tab: "confirmed" };

  return { kind: "history", tab: "all" };
}

/** Default History intents for quick-action buttons in TST. */
export const TST_HISTORY_QUICK: Array<{ tab: TripsTab; labelKey: string }> = [
  { tab: "all", labelKey: "tstAssistant.history.quickAll" },
  { tab: "confirmed", labelKey: "tstAssistant.history.quickConfirmed" },
  { tab: "unconfirmed", labelKey: "tstAssistant.history.quickUnconfirmed" },
  { tab: "past", labelKey: "tstAssistant.history.quickPast" },
  { tab: "cancelled", labelKey: "tstAssistant.history.quickCancelled" }
];
