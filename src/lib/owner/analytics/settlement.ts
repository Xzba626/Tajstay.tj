/**
 * Settlement channel (Card/Cash/…) — independent of booking source (online/offline).
 */
export const SETTLEMENT_CHANNEL = {
  CASH: "CASH",
  CARD: "CARD",
  WALLET: "WALLET",
  BANK: "BANK",
  OTHER: "OTHER",
  UNKNOWN: "UNKNOWN"
} as const;

export type SettlementChannel = (typeof SETTLEMENT_CHANNEL)[keyof typeof SETTLEMENT_CHANNEL];

const CANONICAL = new Set<string>(Object.values(SETTLEMENT_CHANNEL));

/** Normalize free-text / legacy paymentMethod / HotelPaymentMethod.type → settlement channel. */
export function normalizeSettlementChannel(raw: string | null | undefined): SettlementChannel {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (!s) return SETTLEMENT_CHANNEL.UNKNOWN;
  if (CANONICAL.has(s)) return s as SettlementChannel;

  if (s === "ARRIVAL" || s.includes("CASH") || s.includes("НАЛИЧ") || s.includes("НАҚД")) {
    return SETTLEMENT_CHANNEL.CASH;
  }
  if (s.includes("CARD") || s.includes("КОРТ") || s.includes("КАРТ") || s === "ALIF" || s === "DC" || s === "HUMO") {
    return SETTLEMENT_CHANNEL.CARD;
  }
  if (s.includes("WALLET") || s.includes("КОШЕЛ") || s.includes("ҲАМЁН")) {
    return SETTLEMENT_CHANNEL.WALLET;
  }
  if (s.includes("BANK") || s.includes("IBAN") || s.includes("СЧЁТ") || s.includes("ҲИСОБ")) {
    return SETTLEMENT_CHANNEL.BANK;
  }
  return SETTLEMENT_CHANNEL.OTHER;
}

export function resolveSettlementChannel(input: {
  settlementChannel?: string | null;
  offlinePaymentType?: string | null;
  hotelPaymentMethodType?: string | null;
  paymentMethod?: string | null;
  payOnArrival?: boolean | null;
}): SettlementChannel {
  if (input.settlementChannel) return normalizeSettlementChannel(input.settlementChannel);
  if (input.offlinePaymentType) return normalizeSettlementChannel(input.offlinePaymentType);
  if (input.hotelPaymentMethodType) return normalizeSettlementChannel(input.hotelPaymentMethodType);
  if (input.payOnArrival || input.paymentMethod === "ARRIVAL") return SETTLEMENT_CHANNEL.CASH;
  if (input.paymentMethod) return normalizeSettlementChannel(input.paymentMethod);
  return SETTLEMENT_CHANNEL.UNKNOWN;
}

/** Card vs cash product buckets (+ other for WALLET/BANK/OTHER/UNKNOWN). */
export function settlementBucket(channel: SettlementChannel): "cash" | "card" | "other" {
  if (channel === SETTLEMENT_CHANNEL.CASH) return "cash";
  if (channel === SETTLEMENT_CHANNEL.CARD) return "card";
  return "other";
}
