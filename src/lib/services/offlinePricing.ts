/** Authoritative offline stay price from category basePrice × nights (UTC date-only). */

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const a = Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate());
  const b = Date.UTC(checkOut.getUTCFullYear(), checkOut.getUTCMonth(), checkOut.getUTCDate());
  const nights = Math.round((b - a) / (24 * 60 * 60 * 1000));
  return Math.max(0, nights);
}

export function quoteOfflineStayTotal(input: {
  basePrice: number;
  checkIn: Date;
  checkOut: Date;
}): number {
  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights < 1) return 0;
  return Number((Math.max(0, input.basePrice) * nights).toFixed(2));
}
