/** +992901234567 → +992 ** *** ** 67 */
export function maskPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return phone;
  const country = digits.length > 9 ? `+${digits.slice(0, digits.length - 9)}` : "+992";
  const tail = digits.slice(-2);
  return `${country} ** *** ** ${tail}`;
}
