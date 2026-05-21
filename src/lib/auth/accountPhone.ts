/**
 * Для OAuth (Google) в БД кладём уникальный «телефон» вида google_<timestamp>_<n>,
 * чтобы удовлетворить схему User.phone. В UI это не показываем как номер.
 */
export function isPlaceholderAccountPhone(phone: string | null | undefined): boolean {
  const t = phone?.trim();
  return !!t && (t.startsWith("google_") || t.startsWith("email_"));
}

/** Уникальный плейсхолдер для User.phone, когда реальный номер не задан (email/Google). */
export async function buildUniquePlaceholderPhone(prefix: string): Promise<string> {
  const { prisma } = await import("@/lib/prisma");
  for (let i = 0; i < 12; i++) {
    const candidate = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    const existing = await prisma.user.findUnique({ where: { phone: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  throw new Error("Could not allocate placeholder phone");
}

/** Значение для полей ввода телефона (бронь и т.п.): пусто, если только плейсхолдер. */
export function phoneForGuestBookingForm(phone: string | null | undefined): string {
  if (isPlaceholderAccountPhone(phone)) return "";
  return (phone ?? "").trim();
}
