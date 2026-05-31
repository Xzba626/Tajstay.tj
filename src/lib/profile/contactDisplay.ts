import { isPlaceholderAccountPhone } from "@/lib/auth/accountPhone";
import { maskEmail } from "@/lib/format/maskEmail";
import { maskPhone } from "@/lib/format/maskPhone";

export function profileContactSubtitle(user: {
  email: string | null;
  phone: string;
}): string | null {
  const email = user.email?.trim();
  if (email) return maskEmail(email) ?? email;
  if (user.phone && !isPlaceholderAccountPhone(user.phone)) {
    return maskPhone(user.phone);
  }
  return null;
}
