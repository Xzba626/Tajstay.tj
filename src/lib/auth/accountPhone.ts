/**
 * Для OAuth (Google) в БД кладём уникальный «телефон» вида google_<timestamp>_<n>,
 * чтобы удовлетворить схему User.phone. В UI это не показываем как номер.
 */
export function isPlaceholderAccountPhone(phone: string | null | undefined): boolean {
  const t = phone?.trim();
  return !!t && t.startsWith("google_");
}

/** Значение для полей ввода телефона (бронь и т.п.): пусто, если только плейсхолдер. */
export function phoneForGuestBookingForm(phone: string | null | undefined): string {
  if (isPlaceholderAccountPhone(phone)) return "";
  return (phone ?? "").trim();
}
