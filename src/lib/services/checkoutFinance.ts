export type CheckoutBreakdown = {
  subtotal: number;
  serviceFee: number;
  taxAmount: number;
  commission: number;
  totalToCharge: number;
  ownerPayoutAfterEscrow: number;
  fxRateUsd: number;
  totalUsd: number;
};

function round2(n: number) {
  return Number(n.toFixed(2));
}

export function calculateCheckoutBreakdown(params: { subtotal: number; commissionRate?: number }): CheckoutBreakdown {
  const subtotal = round2(Math.max(0, params.subtotal));
  // Canonical revenue model: TajStay takes 0% booking commission - Hotel keeps the full booking
  // amount, TajStay revenue comes from the Hotel's own subscription instead (see
  // lib/services/subscription.ts). COMMISSION_RATE stays overridable for now only so historical/
  // legacy env deployments aren't silently changed without a deploy step, but the code default is
  // now 0, not the old 12%.
  const commissionRate = params.commissionRate ?? Number(process.env.COMMISSION_RATE ?? "0");
  const serviceFeeRate = Number(process.env.SERVICE_FEE_RATE ?? "0.03");
  const taxRate = Number(process.env.TAX_RATE ?? "0.05");
  const fxRateUsd = Number(process.env.FX_TJS_USD ?? "10.9");

  const commission = round2(subtotal * commissionRate);
  const serviceFee = round2(subtotal * serviceFeeRate);
  const taxAmount = round2((subtotal + serviceFee) * taxRate);
  const totalToCharge = round2(subtotal + serviceFee + taxAmount);
  const ownerPayoutAfterEscrow = round2(subtotal - commission);
  const totalUsd = fxRateUsd > 0 ? round2(totalToCharge / fxRateUsd) : 0;

  return {
    subtotal,
    serviceFee,
    taxAmount,
    commission,
    totalToCharge,
    ownerPayoutAfterEscrow,
    fxRateUsd,
    totalUsd
  };
}
