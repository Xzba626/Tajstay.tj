import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type SenderLike = {
  senderRole: string;
  senderName: string;
};

function firstToken(name: string): string {
  const token = name.trim().split(/\s+/)[0] ?? "";
  return token.replace(/^\+?\d[\d\s()-]*$/, "").trim();
}

/** Human-readable chat label: role badge, not raw DB name. */
export function chatSenderLabel(locale: Locale, msg: SenderLike, mine: boolean): string {
  if (mine) return m(locale, "chat.you");

  const role = msg.senderRole.toUpperCase();
  if (role === "ADMIN") return m(locale, "chat.roleAdmin");
  if (role === "OWNER") {
    const name = firstToken(msg.senderName);
    const base = m(locale, "chat.roleOwner");
    return name ? `${base} ${name}` : base;
  }
  if (role === "GUEST") {
    const name = firstToken(msg.senderName);
    const base = m(locale, "chat.roleGuest");
    return name ? `${base} ${name}` : base;
  }
  return msg.senderName.trim() || m(locale, "chat.roleUnknown");
}

export function chatSenderBadgeClass(role: string, mine: boolean): string {
  if (mine) return "chat-sender-badge chat-sender-badge--mine";
  const r = role.toUpperCase();
  if (r === "ADMIN") return "chat-sender-badge chat-sender-badge--admin";
  if (r === "OWNER") return "chat-sender-badge chat-sender-badge--owner";
  if (r === "GUEST") return "chat-sender-badge chat-sender-badge--guest";
  return "chat-sender-badge";
}
