export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatOtpDisplay(code: string): string {
  const digits = code.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  const mid = Math.ceil(digits.length / 2);
  return `${digits.slice(0, mid)} ${digits.slice(mid)}`;
}
