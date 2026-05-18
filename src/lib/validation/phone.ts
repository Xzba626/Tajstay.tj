const CIS_CODES = ["998", "996", "995", "994", "993", "992", "380", "375", "374", "373", "7"] as const;

function isKnownCisDigits(digits: string): boolean {
  return CIS_CODES.some((code) => digits.startsWith(code));
}

/**
 * Normalizes CIS phone numbers into E.164-like format with country code.
 * Examples:
 * - 8 (999) 123-45-67 -> +79991234567
 * - +992 90 123 45 67 -> +992901234567
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const plusInput = trimmed.startsWith("+");
  const noPrefix = plusInput ? trimmed.slice(1) : trimmed;
  const digitsOnly = noPrefix.replace(/[^\d]/g, "");
  if (!digitsOnly) return "";

  // Convert 00-prefixed international format: 00992... -> +992...
  if (!plusInput && digitsOnly.startsWith("00")) {
    const intlDigits = digitsOnly.slice(2);
    if (intlDigits.length >= 10 && intlDigits.length <= 15 && isKnownCisDigits(intlDigits)) {
      return `+${intlDigits}`;
    }
  }

  if (plusInput) {
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15 && isKnownCisDigits(digitsOnly)) {
      return `+${digitsOnly}`;
    }
    return "";
  }

  // Common RU/KZ local notation: 8XXXXXXXXXX -> +7XXXXXXXXXX
  if (digitsOnly.length === 11 && digitsOnly.startsWith("8")) {
    return `+7${digitsOnly.slice(1)}`;
  }

  // Common RU/KZ local notation without trunk: 9XXXXXXXXX -> +79XXXXXXXXX
  if (digitsOnly.length === 10) {
    return `+7${digitsOnly}`;
  }

  // Already includes code but without plus
  if (digitsOnly.length >= 11 && digitsOnly.length <= 15 && isKnownCisDigits(digitsOnly)) {
    return `+${digitsOnly}`;
  }

  // Tajikistan: national mobile 9XXXXXXXX when the UI collects only the local part next to a +992 prefix.
  if (digitsOnly.length === 9 && digitsOnly.startsWith("9")) {
    return `+992${digitsOnly}`;
  }

  return "";
}

/**
 * Номер из поля «+992 …» (только национальная часть или уже с кодом страны).
 * Убирает дублирование 992, если пользователь вставил полный номер.
 */
export function formatTajikPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const national = digits.startsWith("992") ? digits.slice(3) : digits;
  if (!national) return "";
  return normalizePhone(`+992${national}`) || "";
}

