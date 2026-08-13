/**
 * Account / auth intents for TST Assistant.
 * Dangerous actions never mutate data here — they only return navigation targets
 * to existing secure TajStay flows (sign-in, forgot-password, profile, payment).
 */

export type TstAccountIntent =
  | { kind: "sign_in" }
  | { kind: "sign_up" }
  | { kind: "forgot_password" }
  | { kind: "change_password" }
  | { kind: "change_email" }
  | { kind: "connect_telegram" }
  | { kind: "profile" }
  | { kind: "security" }
  | { kind: "unpaid" }
  | { kind: "next_booking" }
  | { kind: "last_booking" }
  | { kind: "help_payment" }
  | { kind: "help_booking" }
  | { kind: "refuse_cross_user" };

const CROSS_USER =
  /(?:другого пользовател|other user|чужо(?:й|го)|user\s*#?\s*\d+|пользовател(?:я|ю)\s*№?\s*\d+|all accounts|все аккаунт|удали(?:ть)? всех|delete all users|email клиента|клиент(?:а)?\s+\d+)/i;

const FORGOT = /(?:забыл(?:а)? пароль|forgot password|восстанов(?:ить)? парол|reset password|парол.*заб)/i;
const CHANGE_PW = /(?:смен(?:и|ить) парол|change password|поставь(?:те)? мне парол|установи(?:ть)? парол|новый парол|поменять парол)/i;
const CHANGE_EMAIL = /(?:смен(?:и|ить) email|change (?:my )?email|измени(?:ть)? (?:мой )?email)/i;
const CONNECT_TG = /(?:подключ(?:и|ить) telegram|connect telegram|пайваст(?:и| кардани)? telegram)/i;
const SECURITY = /(?:безопасн(?:ость|и)|security|двухфактор|2\s*fa|активн(?:ые )?сеанс|active sessions)/i;
const SIGN_IN = /(?:помог(?:и|ите) войти|войти в аккаунт|help (?:me )?sign in|log ?in|авторизац)/i;
const SIGN_UP = /(?:созда(?:й|ть) аккаунт|зарегистрир|sign ?up|register|создать уч[её]т)/i;
const PROFILE = /(?:мой профил|открой профил|измени(?:ть)? (?:имя|фамили)|change (?:my )?name|\bprofile\b)/i;
const UNPAID = /(?:неоплачен|не оплач|unpaid|ожидает оплат|нужна оплата)/i;
const NEXT = /(?:следующ(?:ая|ую) брон|ближайш(?:ая|ую) брон|next (?:booking|stay)|upcoming booking)/i;
const LAST = /(?:последн(?:яя|юю) брон|last booking)/i;
const HELP_PAY = /(?:помощ(?:ь|и) с оплат|help with payment|оплатит)/i;
const HELP_BOOK = /(?:помощ(?:ь|и) с (?:моей )?брон|help with (?:my )?booking)/i;

export function parseAccountIntent(raw: string): TstAccountIntent | null {
  const text = raw.trim();
  if (!text) return null;

  if (CROSS_USER.test(text)) return { kind: "refuse_cross_user" };
  if (FORGOT.test(text)) return { kind: "forgot_password" };
  if (CHANGE_PW.test(text)) return { kind: "change_password" };
  if (CHANGE_EMAIL.test(text)) return { kind: "change_email" };
  if (CONNECT_TG.test(text)) return { kind: "connect_telegram" };
  if (SECURITY.test(text)) return { kind: "security" };
  if (SIGN_UP.test(text)) return { kind: "sign_up" };
  if (SIGN_IN.test(text)) return { kind: "sign_in" };
  if (UNPAID.test(text) || HELP_PAY.test(text)) return { kind: "unpaid" };
  if (NEXT.test(text)) return { kind: "next_booking" };
  if (LAST.test(text)) return { kind: "last_booking" };
  if (HELP_BOOK.test(text)) return { kind: "help_booking" };
  if (PROFILE.test(text)) return { kind: "profile" };
  return null;
}

/** Safe destinations — never include secrets or other users’ IDs. */
export function accountIntentHref(intent: TstAccountIntent): string | null {
  switch (intent.kind) {
    case "sign_in":
      return "/auth/sign-in?next=/";
    case "sign_up":
      return "/auth/sign-in?mode=register&next=/";
    case "forgot_password":
      return "/auth/forgot-password";
    case "change_password":
    case "security":
      return "/profile/security";
    case "change_email":
      return "/profile/email";
    case "connect_telegram":
      return "/profile/telegram";
    case "profile":
      return "/profile";
    case "help_booking":
      return "/history";
    default:
      return null;
  }
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "—";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function splitDisplayName(name: string | null | undefined): { first: string; last: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}
