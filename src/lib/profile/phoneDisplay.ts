import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";

/** National digits for TajikPhoneInput (+992 prefix is shown separately). */
export function phoneToNationalDigits(phone: string | null | undefined): string {
  if (!phone || isPlaceholderAccountPhone(phone)) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("992")) return digits.slice(3);
  if (digits.startsWith("7") && digits.length === 11) return digits.slice(1);
  return digits;
}
