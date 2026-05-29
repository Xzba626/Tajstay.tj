/** Mask phone for display: +992 901 ***-**27 */
export function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return raw;
  const last2 = digits.slice(-2);
  if (digits.startsWith("992") && digits.length >= 9) {
    const local = digits.slice(3);
    const op = local.slice(0, 3);
    return `+992 ${op} ***-**${last2}`;
  }
  return `+${digits.slice(0, 3)} ***-**${last2}`;
}
