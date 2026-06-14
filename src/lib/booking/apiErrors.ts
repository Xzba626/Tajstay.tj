/** Map booking API error codes/messages to user-facing copy. */
export function mapBookingApiError(raw: string | undefined, status?: number): string {
  const v = (raw || "").trim();
  const lower = v.toLowerCase();

  if (v === "Unauthorized" || lower === "session_expired" || status === 401) {
    return "Сессия истекла — войдите снова.";
  }
  if (v === "Forbidden" || status === 403) {
    return "Нет прав для этого действия.";
  }
  if (lower === "not found" || lower === "not_found") {
    return "Бронирование не найдено.";
  }
  if (v.includes("Нельзя отменить") || lower.includes("cannot cancel")) {
    return v;
  }
  if (lower === "invalid id" || lower === "invalid") {
    return "Некорректный запрос. Обновите страницу.";
  }

  return v || "Не удалось выполнить действие. Попробуйте снова.";
}
