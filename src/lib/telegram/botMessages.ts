type BotLocale = "ru" | "tg" | "en";

export function botLocaleFromTelegram(languageCode?: string | null): BotLocale {
  const lc = (languageCode || "").toLowerCase();
  if (lc.startsWith("tg") || lc === "tj") return "tg";
  if (lc.startsWith("en")) return "en";
  return "ru";
}

const MESSAGES: Record<
  BotLocale,
  {
    welcome: (code: string) => string;
    confirmButton: string;
    confirmed: string;
    expired: string;
    invalid: string;
    wrongAccount: string;
    codeHint: string;
  }
> = {
  ru: {
    welcome: (code) =>
      `Вход в <b>TajStay</b>\n\nКод: <code>${code}</code>\n\nНажмите кнопку ниже или отправьте этот код в чат.`,
    confirmButton: "Подтвердить вход",
    confirmed: "Вход подтверждён. Вернитесь на сайт TajStay.",
    expired: "Ссылка для входа истекла. Запросите новую на сайте.",
    invalid: "Ссылка для входа недействительна.",
    wrongAccount: "Эта ссылка привязана к другому аккаунту Telegram.",
    codeHint: "Отправьте 6-значный код из сообщения выше."
  },
  tg: {
    welcome: (code) =>
      `Вуруд ба <b>TajStay</b>\n\nРамз: <code>${code}</code>\n\nТугмаро пахш кунед ё ин рамзро дар чат фиристед.`,
    confirmButton: "Вурудро тасдиқ кардан",
    confirmed: "Вуруд тасдиқ шуд. Ба сомонаи TajStay баргардед.",
    expired: "Истиноди вуруд анҷом ёфт. Аз сомона дубора дархост кунед.",
    invalid: "Истиноди вуруд нодуруст аст.",
    wrongAccount: "Ин истинод ба ҳисоби дигари Telegram вобаста аст.",
    codeHint: "Рамзи 6-рақамаро аз паёми боло фиристед."
  },
  en: {
    welcome: (code) =>
      `Sign in to <b>TajStay</b>\n\nCode: <code>${code}</code>\n\nTap the button below or send this code in chat.`,
    confirmButton: "Confirm sign-in",
    confirmed: "Sign-in confirmed. Return to the TajStay website.",
    expired: "This sign-in link has expired. Request a new one on the website.",
    invalid: "This sign-in link is invalid.",
    wrongAccount: "This link is linked to a different Telegram account.",
    codeHint: "Send the 6-digit code from the message above."
  }
};

export function telegramBotMessages(locale: BotLocale) {
  return MESSAGES[locale];
}
